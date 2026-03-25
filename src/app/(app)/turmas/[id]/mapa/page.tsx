'use client'


import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ArrowLeft, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { MapGrid } from '@/components/map-editor/grid'
import { StudentSidebar } from '@/components/map-editor/student-sidebar'
import { Toolbar } from '@/components/map-editor/toolbar'
import { useAutoSave } from '@/hooks/use-auto-save'
import { generateTradicional, generateU, generateGrupos, clearStudentsFromGrid } from '@/lib/map/presets'
import { resizeGrid, getPlacedStudentIds } from '@/lib/map/utils'
import type { Turma, Aluno, Grid, Mapa, RoomConfig } from '@/types/database'
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

  const saveFn = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    if (mapa) {
      const { error } = await supabase
        .from('mapas')
        .update({
          grid: JSON.parse(JSON.stringify(grid)),
          linhas,
          colunas,
          layout_tipo: layoutTipo,
          room_config: roomConfig,
        })
        .eq('id', mapa.id)

      if (error) throw error
    } else {
      const { data, error } = await supabase
        .from('mapas')
        .insert({
          user_id: user.id,
          turma_id: turmaId,
          grid: JSON.parse(JSON.stringify(grid)),
          linhas,
          colunas,
          layout_tipo: layoutTipo,
          room_config: roomConfig,
        })
        .select()
        .single()

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
          supabase
            .from('sala_alunos')
            .select('*')
            .eq('turma_id', turmaId)
            .eq('ativo', true)
            .order('numero', { nullsFirst: false })
            .order('nome'),
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
          if (m.room_config) setRoomConfig(m.room_config)
        } else {
          // No map yet, create default grid
          const defaultGrid = generateTradicional(5, 6)
          setGrid(defaultGrid)
        }
      } catch {
        toast.error('Erro ao carregar dados.')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [turmaId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleGridChange = useCallback(
    (newGrid: Grid) => {
      setGrid(newGrid)
      triggerSave()
    },
    [triggerSave]
  )

  const handleLinhasChange = useCallback(
    (val: number) => {
      setLinhas(val)
      setGrid((prev) => resizeGrid(prev, val, colunas))
      triggerSave()
    },
    [colunas, triggerSave]
  )

  const handleColunasChange = useCallback(
    (val: number) => {
      setColunas(val)
      setGrid((prev) => resizeGrid(prev, linhas, val))
      triggerSave()
    },
    [linhas, triggerSave]
  )

  const handleLayoutChange = useCallback(
    (val: string) => {
      setLayoutTipo(val)
      let newGrid: Grid
      switch (val) {
        case 'u':
          newGrid = generateU(linhas, colunas)
          break
        case 'grupos':
          newGrid = generateGrupos(linhas, colunas)
          break
        default:
          newGrid = generateTradicional(linhas, colunas)
      }
      setGrid(newGrid)
      triggerSave()
    },
    [linhas, colunas, triggerSave]
  )

  const handleClear = useCallback(() => {
    setGrid((prev) => clearStudentsFromGrid(prev))
    triggerSave()
  }, [triggerSave])

  const handleReset = useCallback(() => {
    handleLayoutChange(layoutTipo)
  }, [layoutTipo, handleLayoutChange])

  const handleManualSave = useCallback(async () => {
    try {
      await saveFn()
      toast.success('Mapa salvo com sucesso!')
    } catch {
      toast.error('Erro ao salvar mapa.')
    }
  }, [saveFn])

  const handlePrintMap = useCallback(() => {
    const alunoMap = new Map(alunos.map((a) => [a.id, a]))
    import('@/lib/pdf/map-generator').then(({ generateMapPdf }) => {
      generateMapPdf({
        grid,
        linhas,
        colunas,
        serie: turma?.serie || '',
        turma: turma?.turma || '',
        turno: turma?.turno || '',
        alunoMap,
      })
    })
  }, [grid, linhas, colunas, alunos, turma])

  const handlePrintList = useCallback(() => {
    import('@/lib/pdf/student-list-generator').then(({ generateStudentListPdf }) => {
      generateStudentListPdf({
        serie: turma?.serie || '',
        turma: turma?.turma || '',
        turno: turma?.turno || '',
        alunos: alunos.map((a) => ({ nome: a.nome, numero: a.numero })),
      })
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/turmas')}
            className="-ml-2 text-muted-foreground mb-1"
          >
            <ArrowLeft className="size-4 mr-1" />
            Voltar
          </Button>
          <h1 className="text-xl font-semibold tracking-tight">
            Mapa de Sala - {turma?.serie} {turma?.turma}
          </h1>
          <p className="text-sm text-muted-foreground">
            Arraste os alunos para as carteiras
          </p>
        </div>
        {mapa && (
          <Button variant="outline" render={<Link href={`/turmas/${turmaId}/compartilhar`} />}>
            <Share2 className="size-4 mr-1" />
            Compartilhar
          </Button>
        )}
      </div>

      {/* Toolbar */}
      <Toolbar
        linhas={linhas}
        colunas={colunas}
        layoutTipo={layoutTipo}
        saveStatus={saveStatus}
        onLinhasChange={handleLinhasChange}
        onColunasChange={handleColunasChange}
        onLayoutChange={handleLayoutChange}
        onClear={handleClear}
        onReset={handleReset}
        onSave={handleManualSave}
        onPrintMap={handlePrintMap}
        onPrintList={handlePrintList}
      />

      {/* Editor area */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Grid */}
        <div className="flex-1 overflow-x-auto">
          <MapGrid
            grid={grid}
            colunas={colunas}
            alunos={alunos}
            roomConfig={roomConfig}
            onGridChange={handleGridChange}
          />
        </div>

        {/* Student sidebar */}
        <StudentSidebar alunos={alunos} placedIds={placedIds} />
      </div>
    </div>
  )
}
