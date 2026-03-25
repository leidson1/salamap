'use client'

import { useCallback } from 'react'
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
  const alunoMap = new Map(alunos.map((a) => [a.id, a]))

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
  )
}
