'use client'

import { useDroppable } from '@dnd-kit/core'
import { cn } from '@/lib/utils'
import { StudentCard } from './student-card'
import { X, User, Ban } from 'lucide-react'
import type { GridCell, Aluno } from '@/types/database'

interface DeskCellProps {
  cell: GridCell
  row: number
  col: number
  aluno: Aluno | null
  onToggleType: (row: number, col: number) => void
  onRemoveStudent: (row: number, col: number) => void
}

export function DeskCell({ cell, row, col, aluno, onToggleType, onRemoveStudent }: DeskCellProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `cell-${row}-${col}`,
    data: { row, col, cell },
  })

  if (cell.tipo === 'vazio') {
    return (
      <div
        ref={setNodeRef}
        onClick={() => onToggleType(row, col)}
        className={cn(
          'flex items-center justify-center rounded-lg border border-dashed border-gray-200',
          'h-16 cursor-pointer transition-all hover:border-gray-300 hover:bg-gray-50',
          isOver && 'border-emerald-400 bg-emerald-50'
        )}
      />
    )
  }

  if (cell.tipo === 'bloqueado') {
    return (
      <div
        onClick={() => onToggleType(row, col)}
        className="flex items-center justify-center rounded-lg bg-gray-200 h-16 cursor-pointer transition-all hover:bg-gray-300"
      >
        <Ban className="size-4 text-gray-400" />
      </div>
    )
  }

  if (cell.tipo === 'professor') {
    return (
      <div
        onClick={() => onToggleType(row, col)}
        className="flex items-center justify-center rounded-lg bg-blue-100 border-2 border-blue-300 h-16 cursor-pointer transition-all hover:bg-blue-200"
      >
        <div className="text-center">
          <User className="size-4 text-blue-600 mx-auto" />
          <span className="text-[10px] font-semibold text-blue-700">Prof.</span>
        </div>
      </div>
    )
  }

  // tipo === 'carteira'
  if (aluno) {
    return (
      <div
        ref={setNodeRef}
        className={cn(
          'relative flex items-center justify-center rounded-lg bg-emerald-50 border-2 border-emerald-300 h-16',
          'transition-all group',
          isOver && 'border-emerald-500 bg-emerald-100 ring-2 ring-emerald-400'
        )}
      >
        <StudentCard aluno={aluno} isInGrid compact />
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemoveStudent(row, col)
          }}
          className="absolute -top-1.5 -right-1.5 hidden group-hover:flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow-sm hover:bg-red-600 transition-colors"
        >
          <X className="size-3" />
        </button>
      </div>
    )
  }

  // carteira vazia
  return (
    <div
      ref={setNodeRef}
      onClick={() => onToggleType(row, col)}
      className={cn(
        'flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 h-16',
        'cursor-pointer transition-all hover:border-emerald-300 hover:bg-emerald-50/50',
        isOver && 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-300'
      )}
    >
      <span className="text-[10px] text-gray-400">Vazio</span>
    </div>
  )
}
