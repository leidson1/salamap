'use client'

import { useCallback } from 'react'
import { DeskCell } from './desk-cell'
import { ClassroomFrame } from './classroom-frame'
import type { Grid, Aluno, CellType } from '@/types/database'

interface MapGridProps {
  grid: Grid
  colunas: number
  alunos: Aluno[]
  mode: 'alunos' | 'mobiliar'
  onGridChange: (grid: Grid) => void
}

export function MapGrid({ grid, colunas, alunos, mode, onGridChange }: MapGridProps) {
  const alunoMap = new Map(alunos.map((a) => [a.id, a]))

  const handleToggleType = useCallback(
    (row: number, col: number) => {
      const newGrid = grid.map((r) => r.map((c) => ({ ...c })))
      const cell = newGrid[row][col]

      if (mode === 'mobiliar') {
        // In mobiliar mode, clicking empty cell cycles through room elements
        const cycle: CellType[] = ['vazio', 'carteira', 'bloqueado', 'porta', 'quadro', 'janela', 'professor']
        const currentIdx = cycle.indexOf(cell.tipo)
        cell.tipo = cycle[(currentIdx + 1) % cycle.length]
        cell.alunoId = null
      } else {
        // In alunos mode, only cycle desk types
        const cycle: CellType[] = ['carteira', 'vazio']
        const currentIdx = cycle.indexOf(cell.tipo)
        if (currentIdx >= 0) {
          cell.tipo = cycle[(currentIdx + 1) % cycle.length]
          cell.alunoId = null
        }
      }

      onGridChange(newGrid)
    },
    [grid, mode, onGridChange]
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
    <ClassroomFrame>
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
              mode={mode}
              onToggleType={handleToggleType}
              onRemoveStudent={handleRemoveStudent}
            />
          ))
        )}
      </div>
    </ClassroomFrame>
  )
}
