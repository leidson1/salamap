'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ArrowLeft, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { MapGrid } from '@/components/map-editor/grid'
import { StudentSidebar } from '@/components/map-editor/student-sidebar'
import { Toolbar } from '@/components/map-editor/toolbar'
import { useAutoSave } from '@/hooks/use-auto-save'
import { generateTradicional, generateU, generateGrupos, clearStudentsFromGrid } from '@/lib/map/presets'
import { resizeGrid, getPlacedStudentIds } from '@/lib/map/utils'
import type { Turma, Aluno, Grid, Mapa, RoomConfig, CellType } from '@/types/database'
import { DEFAULT_ROOM_CONFIG } from '@/types/database'

export default function MapaEditorPage() {
  const params = useParams()
  const router = useRouter()
  const turmaId = Number(params.id)
  const supabase = createClient()

  const [turma, setTurma] = useState<Turma | null>(null)
  const [alunos, setAlunos] = useState<Aluno[]>([])
  const [mapa, setMapa] = useState<Mapa | null>(null)
  const [grid, setGrid] = useState<Grid>([])
  const [linhas, setLinhas] = useState(5)
  const [colunas, setColunas] = useState(6)
  const [layoutTipo, setLayoutTipo] = useState('tradicional')
  const [roomConfig, setRoomConfig] = useState<RoomConfig>(DEFAULT_ROOM_CONFIG)
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<'alunos' | 'mobiliar'>('alunos')
  const [activeDragData, setActiveDragData] = useState<
    | { type: 'student'; aluno: Aluno }
    | { type: 'cell'; row: number; col: number; cellType: CellType }
    | null
  >(null)

  const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  const touchSensor = useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  const sensors = useSensors(pointerSensor, touchSensor)

  const saveFn = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    if (mapa) {
      const { error } = await supabase
        .from('mapas')
        .update({
          grid: JSON.parse(JSON.stringify(grid)),
          linhas, colunas,
          layout_tipo: layoutTipo,
          room_config: roomConfig,
        })
        .eq('id', mapa.id)
      if (error) throw error
    } else {
      const { data, error } = await supabase
        .from('mapas')
        .insert({
          user_id: user.id, turma_id: turmaId,
          grid: JSON.parse(JSON.stringify(grid)),
          linhas, colunas,
          layout_tipo: layoutTipo,
          room_config: roomConfig,
        })
        .select().single()
      if (error) throw error
      if (data) setMapa(data as Mapa)
    }
  }, [grid, linhas, colunas, layoutTipo, roomConfig, mapa, turmaId, supabase])

  const { trigger: triggerSave, saveStatus } = useAutoSave(saveFn)

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
          setMapa(m)
          setGrid(m.grid)
          setLinhas(m.linhas)
          setColunas(m.colunas)
          setLayoutTipo(m.layout_tipo)
          if (m.room_config) setRoomConfig(m.room_config as RoomConfig)
        } else {
          setGrid(generateTradicional(5, 6))
        }
      } catch {
        toast.error('Erro ao carregar dados.')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [turmaId]) // eslint-disable-line react-hooks/exhaustive-deps

  // DnD
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current
    if (data?.aluno) {
      setActiveDragData({ type: 'student', aluno: data.aluno as Aluno })
    } else if (data?.type === 'cell') {
      setActiveDragData({ type: 'cell', row: data.row as number, col: data.col as number, cellType: (data.cell as { tipo: CellType }).tipo })
    }
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const dragData = activeDragData
      setActiveDragData(null)
      const { over } = event
      if (!over || !dragData) return
      const overData = over.data.current

      // Student drag
      if (dragData.type === 'student') {
        const draggedAluno = dragData.aluno
        if (overData?.type === 'sidebar') {
          const newGrid = grid.map(row => row.map(cell =>
            cell.alunoId === draggedAluno.id ? { ...cell, alunoId: null } : cell
          ))
          setGrid(newGrid); triggerSave(); return
        }
        if (overData?.row !== undefined && overData?.col !== undefined) {
          const tR = overData.row as number, tC = overData.col as number
          const target = grid[tR]?.[tC]
          if (!target || (target.tipo !== 'carteira' && target.tipo !== 'vazio')) return
          const newGrid = grid.map(row => row.map(cell => ({ ...cell })))
          let oR = -1, oC = -1
          for (let r = 0; r < newGrid.length; r++)
            for (let c = 0; c < newGrid[r].length; c++)
              if (newGrid[r][c].alunoId === draggedAluno.id) { oR = r; oC = c; newGrid[r][c].alunoId = null }
          if (target.alunoId !== null && oR >= 0) newGrid[oR][oC].alunoId = target.alunoId
          if (newGrid[tR][tC].tipo === 'vazio') newGrid[tR][tC].tipo = 'carteira'
          newGrid[tR][tC].alunoId = draggedAluno.id
          setGrid(newGrid); triggerSave()
        }
        return
      }

      // Cell drag (mobiliar mode - swap)
      if (dragData.type === 'cell' && overData?.row !== undefined && overData?.col !== undefined) {
        const fR = dragData.row, fC = dragData.col
        const tR = overData.row as number, tC = overData.col as number
        if (fR === tR && fC === tC) return
        const newGrid = grid.map(row => row.map(cell => ({ ...cell })))
        const temp = { ...newGrid[fR][fC] }
        newGrid[fR][fC] = { ...newGrid[tR][tC] }
        newGrid[tR][tC] = temp
        setGrid(newGrid); triggerSave()
      }
    },
    [grid, activeDragData, triggerSave]
  )

  const handleGridChange = useCallback((newGrid: Grid) => { setGrid(newGrid); triggerSave() }, [triggerSave])
  const handleRoomConfigChange = useCallback((config: RoomConfig) => { setRoomConfig(config); triggerSave() }, [triggerSave])

  const handleLinhasChange = useCallback((val: number) => {
    setLinhas(val); setGrid(prev => resizeGrid(prev, val, colunas)); triggerSave()
  }, [colunas, triggerSave])

  const handleColunasChange = useCallback((val: number) => {
    setColunas(val); setGrid(prev => resizeGrid(prev, linhas, val)); triggerSave()
  }, [linhas, triggerSave])

  const handleLayoutChange = useCallback((val: string) => {
    setLayoutTipo(val)
    const gen = val === 'u' ? generateU : val === 'grupos' ? generateGrupos : generateTradicional
    setGrid(gen(linhas, colunas)); triggerSave()
  }, [linhas, colunas, triggerSave])

  const handleClear = useCallback(() => { setGrid(prev => clearStudentsFromGrid(prev)); triggerSave() }, [triggerSave])
  const handleReset = useCallback(() => { handleLayoutChange(layoutTipo) }, [layoutTipo, handleLayoutChange])

  const handleManualSave = useCallback(async () => {
    try { await saveFn(); toast.success('Mapa salvo!') } catch { toast.error('Erro ao salvar.') }
  }, [saveFn])

  const handlePrintMap = useCallback(() => {
    const alunoMap = new Map(alunos.map(a => [a.id, a]))
    import('@/lib/pdf/map-generator').then(({ generateMapPdf }) => {
      generateMapPdf({ grid, linhas, colunas, serie: turma?.serie || '', turma: turma?.turma || '', turno: turma?.turno || '', alunoMap })
    })
  }, [grid, linhas, colunas, alunos, turma])

  const handlePrintList = useCallback(() => {
    import('@/lib/pdf/student-list-generator').then(({ generateStudentListPdf }) => {
      generateStudentListPdf({ serie: turma?.serie || '', turma: turma?.turma || '', turno: turma?.turno || '', alunos: alunos.map(a => ({ nome: a.nome, numero: a.numero })) })
    })
  }, [alunos, turma])

  const placedIds = getPlacedStudentIds(grid)

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
            {mode === 'alunos' ? 'Arraste os alunos para as carteiras' : 'Arraste mesas para trocar posicao | Clique nas paredes para mover elementos'}
          </p>
        </div>
        {mapa && (
          <Button variant="outline" render={<Link href={`/turmas/${turmaId}/compartilhar`} />}>
            <Share2 className="size-4 mr-1" /> Compartilhar
          </Button>
        )}
      </div>

      <Toolbar
        linhas={linhas} colunas={colunas} layoutTipo={layoutTipo}
        saveStatus={saveStatus} mode={mode}
        onLinhasChange={handleLinhasChange} onColunasChange={handleColunasChange}
        onLayoutChange={handleLayoutChange} onClear={handleClear} onReset={handleReset}
        onSave={handleManualSave} onModeChange={setMode}
        onPrintMap={handlePrintMap} onPrintList={handlePrintList}
      />

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 overflow-x-auto">
            <MapGrid
              grid={grid} colunas={colunas} alunos={alunos} mode={mode}
              roomConfig={roomConfig} interactive={mode === 'mobiliar'}
              onGridChange={handleGridChange} onRoomConfigChange={handleRoomConfigChange}
            />
          </div>
          {mode === 'alunos' && <StudentSidebar alunos={alunos} placedIds={placedIds} />}
        </div>

        <DragOverlay>
          {activeDragData?.type === 'student' && (
            <div className="pointer-events-none">
              <div className="w-20 rounded-t-lg rounded-b-sm bg-amber-100 border-2 border-amber-400 px-2 py-1.5 shadow-2xl text-center">
                <span className="flex h-5 w-5 mx-auto items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700">
                  {activeDragData.aluno.numero ?? '?'}
                </span>
                <span className="text-[9px] font-medium block mt-0.5 truncate text-amber-900">
                  {activeDragData.aluno.nome.split(' ')[0]}
                </span>
              </div>
              <div className="w-5 h-2 bg-stone-400 rounded-b-full mx-auto" />
            </div>
          )}
          {activeDragData?.type === 'cell' && (
            <div className="pointer-events-none w-20 h-16 rounded-lg bg-amber-100 border-2 border-amber-400 shadow-2xl flex items-center justify-center">
              <span className="text-xs font-bold text-amber-700">
                {activeDragData.cellType === 'professor' ? 'Prof.' : 'Mesa'}
              </span>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
