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
import type { Turma, Aluno, Grid, Mapa, CellType } from '@/types/database'
import { DoorOpen, PanelTop, Square, Ban, User } from 'lucide-react'

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
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<'alunos' | 'mobiliar'>('alunos')
  const [activeDragData, setActiveDragData] = useState<{ type: 'student'; aluno: Aluno } | { type: 'cell'; row: number; col: number; cell: { tipo: CellType } } | null>(null)

  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 5 },
  })
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 200, tolerance: 5 },
  })
  const sensors = useSensors(pointerSensor, touchSensor)

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
        })
        .select()
        .single()
      if (error) throw error
      if (data) setMapa(data as Mapa)
    }
  }, [grid, linhas, colunas, layoutTipo, mapa, turmaId, supabase])

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

  // --- DnD handlers ---
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current
    if (data?.aluno) {
      setActiveDragData({ type: 'student', aluno: data.aluno as Aluno })
    } else if (data?.type === 'cell') {
      setActiveDragData({ type: 'cell', row: data.row as number, col: data.col as number, cell: data.cell as { tipo: CellType } })
    }
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const dragData = activeDragData
      setActiveDragData(null)

      const { over } = event
      if (!over || !dragData) return

      const overData = over.data.current

      // === MODE: ALUNOS - drag students ===
      if (dragData.type === 'student') {
        const draggedAluno = dragData.aluno

        if (overData?.type === 'sidebar') {
          const newGrid = grid.map((row) =>
            row.map((cell) =>
              cell.alunoId === draggedAluno.id ? { ...cell, alunoId: null } : cell
            )
          )
          setGrid(newGrid)
          triggerSave()
          return
        }

        if (overData?.row !== undefined && overData?.col !== undefined) {
          const tRow = overData.row as number
          const tCol = overData.col as number
          const targetCell = grid[tRow]?.[tCol]
          if (!targetCell || (targetCell.tipo !== 'carteira' && targetCell.tipo !== 'vazio')) return

          const newGrid = grid.map((row) => row.map((cell) => ({ ...cell })))

          // Find and clear old position
          let oldRow = -1, oldCol = -1
          for (let r = 0; r < newGrid.length; r++) {
            for (let c = 0; c < newGrid[r].length; c++) {
              if (newGrid[r][c].alunoId === draggedAluno.id) {
                oldRow = r; oldCol = c
                newGrid[r][c].alunoId = null
              }
            }
          }

          // Swap students if target occupied
          const existingAlunoId = targetCell.alunoId
          if (existingAlunoId !== null && oldRow >= 0) {
            newGrid[oldRow][oldCol].alunoId = existingAlunoId
          }

          if (newGrid[tRow][tCol].tipo === 'vazio') {
            newGrid[tRow][tCol].tipo = 'carteira'
          }
          newGrid[tRow][tCol].alunoId = draggedAluno.id
          setGrid(newGrid)
          triggerSave()
        }
        return
      }

      // === MODE: MOBILIAR - drag cells (swap) ===
      if (dragData.type === 'cell' && overData?.row !== undefined && overData?.col !== undefined) {
        const fromRow = dragData.row
        const fromCol = dragData.col
        const toRow = overData.row as number
        const toCol = overData.col as number

        if (fromRow === toRow && fromCol === toCol) return

        const newGrid = grid.map((row) => row.map((cell) => ({ ...cell })))
        // Swap cells
        const temp = { ...newGrid[fromRow][fromCol] }
        newGrid[fromRow][fromCol] = { ...newGrid[toRow][toCol] }
        newGrid[toRow][toCol] = temp

        setGrid(newGrid)
        triggerSave()
      }
    },
    [grid, activeDragData, triggerSave]
  )

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
        case 'u': newGrid = generateU(linhas, colunas); break
        case 'grupos': newGrid = generateGrupos(linhas, colunas); break
        default: newGrid = generateTradicional(linhas, colunas)
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

  const handleAddElement = useCallback((tipo: CellType) => {
    // Find first empty cell and place the element
    const newGrid = grid.map((row) => row.map((cell) => ({ ...cell })))
    for (let r = 0; r < newGrid.length; r++) {
      for (let c = 0; c < newGrid[r].length; c++) {
        if (newGrid[r][c].tipo === 'vazio') {
          newGrid[r][c] = { tipo, alunoId: null }
          setGrid(newGrid)
          triggerSave()
          toast.success(`${tipo.charAt(0).toUpperCase() + tipo.slice(1)} adicionado!`)
          return
        }
      }
    }
    toast.error('Nao ha espaco vazio no grid.')
  }, [grid, triggerSave])

  const handlePrintMap = useCallback(() => {
    const alunoMap = new Map(alunos.map((a) => [a.id, a]))
    import('@/lib/pdf/map-generator').then(({ generateMapPdf }) => {
      generateMapPdf({ grid, linhas, colunas, serie: turma?.serie || '', turma: turma?.turma || '', turno: turma?.turno || '', alunoMap })
    })
  }, [grid, linhas, colunas, alunos, turma])

  const handlePrintList = useCallback(() => {
    import('@/lib/pdf/student-list-generator').then(({ generateStudentListPdf }) => {
      generateStudentListPdf({ serie: turma?.serie || '', turma: turma?.turma || '', turno: turma?.turno || '', alunos: alunos.map((a) => ({ nome: a.nome, numero: a.numero })) })
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

  // Overlay icon for mobiliar drag
  const cellOverlayIcon = (tipo: CellType) => {
    switch (tipo) {
      case 'porta': return <DoorOpen className="size-5 text-amber-700" />
      case 'quadro': return <PanelTop className="size-5 text-stone-500" />
      case 'janela': return <Square className="size-5 text-sky-500" />
      case 'bloqueado': return <Ban className="size-5 text-stone-400" />
      case 'professor': return <User className="size-5 text-sky-600" />
      default: return <span className="text-xs font-bold text-amber-700">Mesa</span>
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" size="sm" onClick={() => router.push('/turmas')} className="-ml-2 text-muted-foreground mb-1">
            <ArrowLeft className="size-4 mr-1" />
            Voltar
          </Button>
          <h1 className="text-xl font-semibold tracking-tight">
            Mapa de Sala - {turma?.serie} {turma?.turma}
          </h1>
          <p className="text-sm text-muted-foreground">
            {mode === 'alunos' ? 'Arraste os alunos para as carteiras' : 'Arraste os elementos para reorganizar a sala'}
          </p>
        </div>
        {mapa && (
          <Button variant="outline" render={<Link href={`/turmas/${turmaId}/compartilhar`} />}>
            <Share2 className="size-4 mr-1" />
            Compartilhar
          </Button>
        )}
      </div>

      <Toolbar
        linhas={linhas}
        colunas={colunas}
        layoutTipo={layoutTipo}
        saveStatus={saveStatus}
        mode={mode}
        onLinhasChange={handleLinhasChange}
        onColunasChange={handleColunasChange}
        onLayoutChange={handleLayoutChange}
        onClear={handleClear}
        onReset={handleReset}
        onSave={handleManualSave}
        onModeChange={setMode}
        onAddElement={handleAddElement}
        onPrintMap={handlePrintMap}
        onPrintList={handlePrintList}
      />

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 overflow-x-auto">
            <MapGrid
              grid={grid}
              colunas={colunas}
              alunos={alunos}
              mode={mode}
              onGridChange={handleGridChange}
            />
          </div>
          {mode === 'alunos' && (
            <StudentSidebar alunos={alunos} placedIds={placedIds} />
          )}
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
            <div className="pointer-events-none flex items-center justify-center w-20 h-16 rounded-lg bg-white border-2 border-stone-400 shadow-2xl">
              {cellOverlayIcon(activeDragData.cell.tipo)}
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
