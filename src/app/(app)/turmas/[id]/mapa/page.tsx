'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ArrowLeft, DoorOpen, Share2, Sparkles, Users, Armchair } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { MapCanvasWrapper } from '@/components/map-editor/map-canvas-wrapper'
import { FurnitureStudioPanel } from '@/components/map-editor/furniture-studio-panel'
import { RoomDesignerPanel } from '@/components/map-editor/room-designer-panel'
import { StudentSidebar } from '@/components/map-editor/student-sidebar'
import { Toolbar } from '@/components/map-editor/toolbar'
import { useAutoSave } from '@/hooks/use-auto-save'
import {
  applyFurnitureTool,
  clearFurnitureBlock,
  DEFAULT_FURNITURE_COMPOSER_CONFIG,
  getFurnitureBlockDetails,
  moveFurnitureBlock,
  normalizeFurnitureComposerConfig,
  resizeFurnitureBlock,
  rotateFurnitureBlock,
  splitFurnitureBlock,
  type FurnitureComposerConfig,
  type FurnitureResizeAction,
  type FurnitureTool,
} from '@/lib/map/furniture-tools'
import { clearAllFurniture, clearStudentsFromGrid, generateTradicional, getLayoutGenerator } from '@/lib/map/presets'
import { normalizeRoomConfig } from '@/lib/map/room-config'
import { createSoloBlockId, resizeGrid, getPlacedStudentIds } from '@/lib/map/utils'
import type { Turma, Aluno, Grid, Mapa, RoomConfig } from '@/types/database'
import { DEFAULT_ROOM_CONFIG } from '@/types/database'

function countStudentsOutsideBounds(grid: Grid, nextLinhas: number, nextColunas: number) {
  let count = 0

  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < (grid[row]?.length ?? 0); col++) {
      if ((row >= nextLinhas || col >= nextColunas) && grid[row]?.[col]?.alunoId !== null) {
        count += 1
      }
    }
  }

  return count
}

export default function MapaEditorPage() {
  const params = useParams()
  const router = useRouter()
  const turmaId = Number(params.id)
  const supabase = createClient()

  const [turma, setTurma] = useState<Turma | null>(null)
  const [alunos, setAlunos] = useState<Aluno[]>([])
  const [mapa, setMapa] = useState<Mapa | null>(null)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [grid, setGrid] = useState<Grid>([])
  const [linhas, setLinhas] = useState(5)
  const [colunas, setColunas] = useState(6)
  const [layoutTipo, setLayoutTipo] = useState('tradicional')
  const [roomConfig, setRoomConfig] = useState<RoomConfig>(normalizeRoomConfig(DEFAULT_ROOM_CONFIG))
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<'alunos' | 'mobiliar' | 'sala'>('alunos')
  const [furnitureTool, setFurnitureTool] = useState<FurnitureTool>('move')
  const [composerConfig, setComposerConfig] = useState<FurnitureComposerConfig>(
    normalizeFurnitureComposerConfig(DEFAULT_FURNITURE_COMPOSER_CONFIG)
  )
  const [selectedFurnitureBlockId, setSelectedFurnitureBlockId] = useState<string | null>(null)
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null)
  const [selectedRoomElementId, setSelectedRoomElementId] = useState<string | null>('board')

  const saveFn = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    if (mapa) {
      const { error } = await supabase.from('mapas').update({
        grid: JSON.parse(JSON.stringify(grid)),
        linhas, colunas, layout_tipo: layoutTipo, room_config: roomConfig,
      }).eq('id', mapa.id)
      if (error) throw error
    } else {
      const { data, error } = await supabase.from('mapas').insert({
        user_id: user.id, turma_id: turmaId,
        grid: JSON.parse(JSON.stringify(grid)),
        linhas, colunas, layout_tipo: layoutTipo, room_config: roomConfig,
      }).select().single()
      if (error) throw error
      if (data) setMapa(data as Mapa)
    }
  }, [grid, linhas, colunas, layoutTipo, roomConfig, mapa, turmaId, supabase])

  const { trigger: triggerSave, flush: flushSave, saveStatus } = useAutoSave(saveFn)

  useEffect(() => {
    async function loadData() {
      try {
        const [turmaRes, alunosRes, mapaRes] = await Promise.all([
          supabase.from('sala_turmas').select('*').eq('id', turmaId).single(),
          supabase.from('sala_alunos').select('*').eq('turma_id', turmaId).eq('ativo', true)
            .order('numero', { nullsFirst: false }).order('nome'),
          supabase.from('mapas').select('*').eq('turma_id', turmaId).single(),
        ])
        if (turmaRes.error) throw turmaRes.error
        setTurma(turmaRes.data as Turma)
        setAlunos((alunosRes.data as Aluno[]) || [])
        if (mapaRes.data) {
          const m = mapaRes.data as Mapa
          setMapa(m); setGrid(m.grid); setLinhas(m.linhas); setColunas(m.colunas)
          setLayoutTipo(m.layout_tipo)
          setRoomConfig(normalizeRoomConfig(m.room_config as RoomConfig | null))

          // Buscar shareUrl se existir
          const { data: shareData } = await supabase
            .from('mapa_compartilhamentos')
            .select('share_code')
            .eq('mapa_id', m.id)
            .eq('ativo', true)
            .single()
          if (shareData) {
            setShareUrl(`${window.location.origin}/mapa/${shareData.share_code}`)
          }
        } else {
          setGrid(generateTradicional(5, 6))
          setRoomConfig(normalizeRoomConfig(DEFAULT_ROOM_CONFIG))
        }
      } catch { toast.error('Erro ao carregar dados.') }
      finally { setLoading(false) }
    }
    loadData()
  }, [turmaId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selectedFurnitureBlockId && !getFurnitureBlockDetails(grid, selectedFurnitureBlockId)) {
      setSelectedFurnitureBlockId(null)
    }
  }, [grid, selectedFurnitureBlockId])

  // Canvas callbacks
  const handleStudentPlace = useCallback((alunoId: number, row: number, col: number) => {
    const newGrid = grid.map(r => r.map(c => ({ ...c })))
    // Remove from old position
    for (const r of newGrid) for (const c of r) if (c.alunoId === alunoId) c.alunoId = null
    if (newGrid[row][col].tipo === 'vazio') {
      newGrid[row][col].tipo = 'carteira'
      newGrid[row][col].blocoId = createSoloBlockId(row, col)
    }
    newGrid[row][col].alunoId = alunoId
    setGrid(newGrid); triggerSave()
  }, [grid, triggerSave])

  const handleStudentRemove = useCallback((row: number, col: number) => {
    const newGrid = grid.map(r => r.map(c => ({ ...c })))
    newGrid[row][col].alunoId = null
    setGrid(newGrid); triggerSave()
  }, [grid, triggerSave])

  const handleCellSwap = useCallback((fR: number, fC: number, tR: number, tC: number) => {
    if (furnitureTool === 'move') {
      const nextGrid = moveFurnitureBlock(grid, fR, fC, tR, tC)
      if (nextGrid === grid) {
        toast.error('Nao foi possivel mover essa peca para esse ponto.')
        return
      }

      setGrid(nextGrid)
      triggerSave()
      return
    }

    const newGrid = grid.map(r => r.map(c => ({ ...c })))
    const temp = { ...newGrid[fR][fC] }
    newGrid[fR][fC] = { ...newGrid[tR][tC] }
    newGrid[tR][tC] = temp

    setGrid(newGrid)
    triggerSave()
  }, [furnitureTool, grid, triggerSave])

  const handleFurnitureStamp = useCallback((row: number, col: number) => {
    if (furnitureTool === 'move') return

    const nextGrid = applyFurnitureTool(grid, row, col, furnitureTool, composerConfig)
    if (nextGrid === grid) {
      toast.error('Essa peca precisa caber inteira e nao pode sobrescrever alunos.')
      return
    }

    setGrid(nextGrid)
    triggerSave()
  }, [composerConfig, furnitureTool, grid, triggerSave])

  const handleRoomConfigChange = useCallback((config: RoomConfig) => {
    setRoomConfig(normalizeRoomConfig(config)); triggerSave()
  }, [triggerSave])

  const handleModeChange = useCallback((nextMode: 'alunos' | 'mobiliar' | 'sala') => {
    setMode(nextMode)
    if (nextMode !== 'alunos') setSelectedStudentId(null)
    if (nextMode === 'mobiliar') setFurnitureTool((current) => current ?? 'move')
    if (nextMode !== 'mobiliar') setSelectedFurnitureBlockId(null)
    if (nextMode === 'sala') {
      setSelectedRoomElementId((current) => current ?? 'board')
    } else {
      setSelectedRoomElementId(null)
    }
  }, [])

  const handleFurnitureToolChange = useCallback((tool: FurnitureTool) => {
    setFurnitureTool(tool)
    if (tool !== 'move') {
      setSelectedFurnitureBlockId(null)
    }
  }, [])

  const handleComposerConfigChange = useCallback((config: FurnitureComposerConfig) => {
    setComposerConfig(normalizeFurnitureComposerConfig(config))
  }, [])

  const handleRotateSelectedBlock = useCallback(() => {
    if (!selectedFurnitureBlockId) return

    const nextGrid = rotateFurnitureBlock(grid, selectedFurnitureBlockId)
    if (nextGrid === grid) {
      toast.error('Nao foi possivel girar esse bloco nessa posicao.')
      return
    }

    setGrid(nextGrid)
    triggerSave()
  }, [grid, selectedFurnitureBlockId, triggerSave])

  const handleSplitSelectedBlock = useCallback(() => {
    if (!selectedFurnitureBlockId) return

    const nextGrid = splitFurnitureBlock(grid, selectedFurnitureBlockId)
    if (nextGrid === grid) {
      toast.error('Esse bloco ja esta separado em lugares individuais.')
      return
    }

    setGrid(nextGrid)
    setSelectedFurnitureBlockId(null)
    triggerSave()
  }, [grid, selectedFurnitureBlockId, triggerSave])

  const handleResizeSelectedBlock = useCallback((action: FurnitureResizeAction) => {
    if (!selectedFurnitureBlockId) return

    const nextGrid = resizeFurnitureBlock(grid, selectedFurnitureBlockId, action)
    if (nextGrid === grid) {
      toast.error('Nao foi possivel redimensionar esse bloco nessa direcao.')
      return
    }

    setGrid(nextGrid)
    triggerSave()
  }, [grid, selectedFurnitureBlockId, triggerSave])

  const handleDeleteSelectedBlock = useCallback(() => {
    if (!selectedFurnitureBlockId) return
    const selectedBlock = getFurnitureBlockDetails(grid, selectedFurnitureBlockId)

    if (selectedBlock?.occupiedSeats) {
      toast.error('Remova ou realoque os alunos antes de excluir essa peca.')
      return
    }

    const nextGrid = clearFurnitureBlock(grid, selectedFurnitureBlockId)
    if (nextGrid === grid) {
      toast.error('Nao foi possivel remover esse bloco.')
      return
    }

    setGrid(nextGrid)
    setSelectedFurnitureBlockId(null)
    triggerSave()
  }, [grid, selectedFurnitureBlockId, triggerSave])

  // Toolbar handlers
  const handleLinhasChange = useCallback((val: number) => {
    if (val === linhas) return

    if (val < linhas) {
      const trimmedStudents = countStudentsOutsideBounds(grid, val, colunas)
      const message = trimmedStudents > 0
        ? `Diminuir para ${val} linhas vai remover ${trimmedStudents} aluno(s) e cortar o mapa fora da nova area. Continuar?`
        : `Diminuir para ${val} linhas vai cortar o mapa fora da nova area. Continuar?`

      if (!window.confirm(message)) return
    }

    setLinhas(val)
    setGrid(prev => resizeGrid(prev, val, colunas))
    setSelectedFurnitureBlockId(null)
    triggerSave()
  }, [colunas, grid, linhas, triggerSave])

  const handleColunasChange = useCallback((val: number) => {
    if (val === colunas) return

    if (val < colunas) {
      const trimmedStudents = countStudentsOutsideBounds(grid, linhas, val)
      const message = trimmedStudents > 0
        ? `Diminuir para ${val} colunas vai remover ${trimmedStudents} aluno(s) e cortar o mapa fora da nova area. Continuar?`
        : `Diminuir para ${val} colunas vai cortar o mapa fora da nova area. Continuar?`

      if (!window.confirm(message)) return
    }

    setColunas(val)
    setGrid(prev => resizeGrid(prev, linhas, val))
    setSelectedFurnitureBlockId(null)
    triggerSave()
  }, [colunas, grid, linhas, triggerSave])

  const handleLayoutChange = useCallback((val: string) => {
    if (getPlacedStudentIds(grid).length > 0) {
      const action = val === layoutTipo ? 'resetar' : 'trocar'
      if (!window.confirm(`Isso vai ${action} o layout e remover as alocacoes atuais dos alunos. Continuar?`)) {
        return
      }
    }

    setLayoutTipo(val)
    const gen = getLayoutGenerator(val)
    setGrid(gen(linhas, colunas))
    setSelectedFurnitureBlockId(null)
    setSelectedStudentId(null)
    triggerSave()
  }, [grid, layoutTipo, linhas, colunas, triggerSave])

  const handleClear = useCallback(() => {
    if (mode === 'mobiliar') {
      const placedCount = getPlacedStudentIds(grid).length
      const message = placedCount > 0
        ? `Isso vai remover TODAS as carteiras e ${placedCount} aluno(s) posicionados. A sala ficara vazia. Continuar?`
        : 'Isso vai remover todas as carteiras. A sala ficara vazia. Continuar?'
      if (!window.confirm(message)) return

      setGrid(clearAllFurniture(linhas, colunas))
      setSelectedFurnitureBlockId(null)
      setSelectedStudentId(null)
      triggerSave()
      return
    }

    const placedCount = getPlacedStudentIds(grid).length
    if (placedCount === 0) return
    if (!window.confirm(`Limpar vai remover ${placedCount} aluno(s) posicionados do mapa. Continuar?`)) return

    setGrid(prev => clearStudentsFromGrid(prev))
    setSelectedStudentId(null)
    triggerSave()
  }, [mode, grid, linhas, colunas, triggerSave])
  const handleReset = useCallback(() => handleLayoutChange(layoutTipo), [layoutTipo, handleLayoutChange])

  const handleManualSave = useCallback(async () => {
    try { await flushSave(); toast.success('Mapa salvo!') } catch { toast.error('Erro ao salvar.') }
  }, [flushSave])

  const handlePrintMap = useCallback(() => {
    const alunoMap = new Map(alunos.map(a => [a.id, a]))
    import('@/lib/pdf/map-generator').then(({ generateMapPdf }) => {
      generateMapPdf({ grid, linhas, colunas, serie: turma?.serie || '', turma: turma?.turma || '', turno: turma?.turno || '', alunoMap, shareUrl: shareUrl || undefined })
    })
  }, [grid, linhas, colunas, alunos, turma, shareUrl])

  const handlePrintList = useCallback(() => {
    import('@/lib/pdf/student-list-generator').then(({ generateStudentListPdf }) => {
      generateStudentListPdf({ serie: turma?.serie || '', turma: turma?.turma || '', turno: turma?.turno || '', alunos: alunos.map(a => ({ nome: a.nome, numero: a.numero })) })
    })
  }, [alunos, turma])

  const placedIds = getPlacedStudentIds(grid)
  const seatCount = grid.reduce((sum, row) => sum + row.filter((cell) => cell.tipo === 'carteira').length, 0)
  const blockedCount = grid.reduce((sum, row) => sum + row.filter((cell) => cell.tipo === 'bloqueado').length, 0)
  const modeMeta = mode === 'alunos'
    ? {
        label: 'Modo Alunos',
        title: 'Distribua a turma com menos atrito',
        description: 'Escolha um aluno na lateral e clique em uma carteira vazia para posicionar.',
        accent: 'border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-white',
        badge: 'bg-emerald-100 text-emerald-700',
      }
    : mode === 'mobiliar'
      ? {
          label: 'Modo Carteiras',
          title: 'Monte a sala por blocos, nao por celulas',
          description: 'Escolha um layout base no toolbar, crie blocos personalizados e ajuste com o inspetor.',
          accent: 'border-amber-200 bg-gradient-to-br from-amber-50 via-white to-white',
          badge: 'bg-amber-100 text-amber-700',
        }
      : {
          label: 'Modo Sala',
          title: 'Defina a estrutura fisica da sala com clareza',
          description: 'Posicione quadro, mesa do professor e aberturas com o studio lateral e com drag direto no canvas.',
          accent: 'border-sky-200 bg-gradient-to-br from-sky-50 via-white to-white',
          badge: 'bg-sky-100 text-sky-700',
        }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-12 w-full animate-pulse rounded-lg bg-muted" />
        <div className="h-96 w-full animate-pulse rounded-lg bg-muted" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" size="sm" onClick={() => router.push('/turmas')} className="-ml-2 text-muted-foreground mb-1">
            <ArrowLeft className="size-4 mr-1" /> Voltar
          </Button>
          <h1 className="text-xl font-semibold tracking-tight">Mapa de Sala - {turma?.serie} {turma?.turma}</h1>
          <p className="text-sm text-muted-foreground">
            {mode === 'alunos'
              ? 'Clique em um aluno e depois em uma carteira'
              : mode === 'mobiliar'
                ? 'Crie e mova blocos de carteiras, ajuste tamanho e formato'
                : 'Modele a sala arrastando quadro, mesa do professor, portas e janelas'}
          </p>
        </div>
        {mapa && (
          <Button variant="outline" render={<Link href={`/turmas/${turmaId}/compartilhar`} />}>
            <Share2 className="size-4 mr-1" /> Compartilhar
          </Button>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
        <Card className={modeMeta.accent}>
          <CardContent className="p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <Badge className={modeMeta.badge}>{modeMeta.label}</Badge>
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold tracking-tight">{modeMeta.title}</h2>
                  <p className="max-w-2xl text-sm text-muted-foreground">
                    {modeMeta.description}
                  </p>
                </div>
              </div>
              <div className="rounded-xl border bg-white/80 px-4 py-3 text-sm shadow-sm">
                <p className="font-medium text-foreground">Dica de fluxo</p>
                <p className="mt-1 text-muted-foreground">
                  {mode === 'alunos'
                    ? 'Posicione primeiro a estrutura da sala e depois distribua os alunos.'
                    : mode === 'mobiliar'
                      ? 'Comece por um layout base, crie blocos e refine pelo inspetor lateral.'
                      : 'Resolva quadro e aberturas antes de mexer nas carteiras para evitar retrabalho.'}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Badge variant="outline">{linhas} linhas</Badge>
              <Badge variant="outline">{colunas} colunas</Badge>
              <Badge variant="outline">{seatCount} lugares</Badge>
              <Badge variant="outline">{placedIds.length} alunos posicionados</Badge>
              {blockedCount > 0 && <Badge variant="outline">{blockedCount} bloqueios</Badge>}
              <Badge variant="outline">{roomConfig.wallElements.length} aberturas</Badge>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
          <Card className="border-emerald-100">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700">
                <Users className="size-4" />
              </div>
              <div>
                <p className="text-xl font-semibold">{placedIds.length}</p>
                <p className="text-xs text-muted-foreground">Alunos no mapa</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-amber-100">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-amber-100 p-2 text-amber-700">
                <Armchair className="size-4" />
              </div>
              <div>
                <p className="text-xl font-semibold">{seatCount}</p>
                <p className="text-xs text-muted-foreground">Carteiras ativas</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-sky-100">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-sky-100 p-2 text-sky-700">
                {mode === 'sala' ? <Sparkles className="size-4" /> : <DoorOpen className="size-4" />}
              </div>
              <div>
                <p className="text-xl font-semibold">{roomConfig.wallElements.length}</p>
                <p className="text-xs text-muted-foreground">Portas e janelas</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Toolbar
        linhas={linhas} colunas={colunas} layoutTipo={layoutTipo}
        saveStatus={saveStatus} mode={mode}
        onLinhasChange={handleLinhasChange} onColunasChange={handleColunasChange}
        onLayoutChange={handleLayoutChange} onClear={handleClear} onReset={handleReset}
        onSave={handleManualSave} onModeChange={handleModeChange}
        onPrintMap={handlePrintMap} onPrintList={handlePrintList}
      />

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Konva Canvas */}
        <div className="flex-1">
          <Card className="overflow-hidden border-stone-200 shadow-sm">
            <CardHeader className="border-b bg-stone-50/80">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle>Canvas do Mapa</CardTitle>
                  <CardDescription>
                    {mode === 'alunos'
                      ? 'O palco principal para distribuir a turma.'
                      : mode === 'mobiliar'
                        ? 'Ajuste blocos no canvas e refine pelo painel lateral.'
                        : 'Arraste os elementos da sala diretamente aqui ou ajuste no painel.'}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{layoutTipo}</Badge>
                  <Badge variant="outline">{saveStatus === 'saved' ? 'Salvo' : saveStatus === 'saving' ? 'Salvando' : 'Edicao ativa'}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4">
              <MapCanvasWrapper
                grid={grid} colunas={colunas} linhas={linhas} alunos={alunos}
                roomConfig={roomConfig} mode={mode}
                furnitureTool={furnitureTool}
                selectedStudentId={selectedStudentId}
                selectedFurnitureBlockId={selectedFurnitureBlockId}
                selectedRoomElementId={selectedRoomElementId}
                onStudentPlace={(alunoId, row, col) => { handleStudentPlace(alunoId, row, col); setSelectedStudentId(null) }}
                onStudentRemove={handleStudentRemove}
                onCellSwap={handleCellSwap}
                onFurnitureStamp={handleFurnitureStamp}
                onFurnitureBlockSelect={setSelectedFurnitureBlockId}
                onRoomConfigChange={handleRoomConfigChange}
                onRoomElementSelect={setSelectedRoomElementId}
              />
            </CardContent>
          </Card>
        </div>

        {/* Student sidebar */}
        {mode === 'alunos' && (
          <StudentSidebar
            alunos={alunos} placedIds={placedIds}
            selectedStudentId={selectedStudentId}
            onSelectStudent={setSelectedStudentId}
          />
        )}

        {mode === 'mobiliar' && (
          <FurnitureStudioPanel
            linhas={linhas}
            colunas={colunas}
            currentTool={furnitureTool}
            grid={grid}
            composerConfig={composerConfig}
            selectedBlockId={selectedFurnitureBlockId}
            onToolChange={handleFurnitureToolChange}
            onComposerConfigChange={handleComposerConfigChange}
            onResizeBlock={handleResizeSelectedBlock}
            onRotateBlock={handleRotateSelectedBlock}
            onSplitBlock={handleSplitSelectedBlock}
            onDeleteBlock={handleDeleteSelectedBlock}
            onClearSelection={() => setSelectedFurnitureBlockId(null)}
          />
        )}

        {mode === 'sala' && (
          <RoomDesignerPanel
            roomConfig={roomConfig}
            selectedElementId={selectedRoomElementId}
            onSelectElement={setSelectedRoomElementId}
            onChange={handleRoomConfigChange}
          />
        )}
      </div>
    </div>
  )
}
