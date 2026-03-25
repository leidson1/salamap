'use client'

import { useCallback } from 'react'
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
import { useState } from 'react'
import { DeskCell } from './desk-cell'
import { ClassroomFrame } from './classroom-frame'
import type { Grid, Aluno, CellType, RoomConfig } from '@/types/database'

interface MapGridProps {
  grid: Grid
  colunas: number
  alunos: Aluno[]
  roomConfig?: RoomConfig | null
  onGridChange: (grid: Grid) => void
}

export function MapGrid({ grid, colunas, alunos, roomConfig, onGridChange }: MapGridProps) {
  const [activeDrag, setActiveDrag] = useState<Aluno | null>(null)

  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 5 },
  })
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 200, tolerance: 5 },
  })
  const sensors = useSensors(pointerSensor, touchSensor)

  const alunoMap = new Map(alunos.map((a) => [a.id, a]))

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current
    if (data?.aluno) {
      setActiveDrag(data.aluno)
    }
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveDrag(null)

      const { active, over } = event
      if (!over) return

      const activeData = active.data.current
      const overData = over.data.current
      if (!activeData?.aluno) return

      const draggedAluno = activeData.aluno as Aluno

      // Dropping back to sidebar = remove from grid
      if (overData?.type === 'sidebar') {
        const newGrid = grid.map((row) =>
          row.map((cell) =>
            cell.alunoId === draggedAluno.id
              ? { ...cell, alunoId: null }
              : cell
          )
        )
        onGridChange(newGrid)
        return
      }

      // Dropping on a cell
      if (overData?.row !== undefined && overData?.col !== undefined) {
        const targetRow = overData.row as number
        const targetCol = overData.col as number
        const targetCell = grid[targetRow]?.[targetCol]

        if (!targetCell) return
        if (targetCell.tipo !== 'carteira' && targetCell.tipo !== 'vazio') return

        const newGrid = grid.map((row) => row.map((cell) => ({ ...cell })))

        // Remove aluno from old position
        for (const row of newGrid) {
          for (const cell of row) {
            if (cell.alunoId === draggedAluno.id) {
              cell.alunoId = null
            }
          }
        }

        // If target has a student, swap
        const existingAlunoId = targetCell.alunoId
        if (existingAlunoId !== null && activeData.source === 'grid') {
          for (let r = 0; r < grid.length; r++) {
            for (let c = 0; c < grid[r].length; c++) {
              if (grid[r][c].alunoId === draggedAluno.id) {
                newGrid[r][c].alunoId = existingAlunoId
              }
            }
          }
        }

        // If target cell was 'vazio', convert to 'carteira'
        if (newGrid[targetRow][targetCol].tipo === 'vazio') {
          newGrid[targetRow][targetCol].tipo = 'carteira'
        }

        newGrid[targetRow][targetCol].alunoId = draggedAluno.id
        onGridChange(newGrid)
      }
    },
    [grid, onGridChange]
  )

  const handleToggleType = useCallback(
    (row: number, col: number) => {
      const newGrid = grid.map((r) => r.map((c) => ({ ...c })))
      const cell = newGrid[row][col]

      const cycle: CellType[] = ['carteira', 'vazio', 'bloqueado', 'professor']
      const currentIdx = cycle.indexOf(cell.tipo)
      cell.tipo = cycle[(currentIdx + 1) % cycle.length]
      cell.alunoId = null

      onGridChange(newGrid)
    },
    [grid, onGridChange]
  )

  const handleRemoveStudent = useCallback(
    (row: number, col: number) => {
      const newGrid = grid.map((r) => r.map((c) => ({ ...c })))
      newGrid[row][col].alunoId = null
      onGridChange(newGrid)
    },
    [grid, onGridChange]
  )

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <ClassroomFrame roomConfig={roomConfig}>
        <div
          className="grid gap-3"
          style={{
            gridTemplateColumns: `repeat(${colunas}, minmax(80px, 1fr))`,
          }}
        >
          {grid.map((row, rIdx) =>
            row.map((cell, cIdx) => (
              <DeskCell
                key={`${rIdx}-${cIdx}`}
                cell={cell}
                row={rIdx}
                col={cIdx}
                aluno={cell.alunoId ? alunoMap.get(cell.alunoId) ?? null : null}
                onToggleType={handleToggleType}
                onRemoveStudent={handleRemoveStudent}
              />
            ))
          )}
        </div>
      </ClassroomFrame>

      {/* Drag overlay - mini desk shape */}
      <DragOverlay>
        {activeDrag && (
          <div className="pointer-events-none">
            <div className="w-20 rounded-t-lg rounded-b-sm bg-amber-100 border-2 border-amber-400 px-2 py-1.5 shadow-2xl text-center">
              <span className="flex h-5 w-5 mx-auto items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700">
                {activeDrag.numero ?? '?'}
              </span>
              <span className="text-[9px] font-medium block mt-0.5 truncate text-amber-900">
                {activeDrag.nome.split(' ')[0]}
              </span>
            </div>
            <div className="w-5 h-2 bg-stone-400 rounded-b-full mx-auto" />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
