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

/** Chair shape (semicircle below the desk) */
function Chair({ muted = false }: { muted?: boolean }) {
  return (
    <div className={cn(
      'w-5 h-2 rounded-b-full mx-auto -mt-0.5',
      muted ? 'bg-stone-300/50' : 'bg-stone-400'
    )} />
  )
}

export function DeskCell({ cell, row, col, aluno, onToggleType, onRemoveStudent }: DeskCellProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `cell-${row}-${col}`,
    data: { row, col, cell },
  })

  // ---- VAZIO (empty floor) ----
  if (cell.tipo === 'vazio') {
    return (
      <div
        ref={setNodeRef}
        onClick={() => onToggleType(row, col)}
        className={cn(
          'h-20 rounded-lg border border-transparent cursor-pointer transition-all',
          'hover:border-dashed hover:border-stone-300',
          isOver && 'border-dashed border-emerald-400 bg-emerald-50/40'
        )}
      />
    )
  }

  // ---- BLOQUEADO (pillar/obstacle) ----
  if (cell.tipo === 'bloqueado') {
    return (
      <div
        onClick={() => onToggleType(row, col)}
        className="flex items-center justify-center rounded-lg bg-stone-200/60 blocked-stripes h-20 cursor-pointer transition-all hover:bg-stone-200/80"
      >
        <Ban className="size-4 text-stone-400" />
      </div>
    )
  }

  // ---- PROFESSOR (teacher desk) ----
  if (cell.tipo === 'professor') {
    return (
      <div
        onClick={() => onToggleType(row, col)}
        className="h-20 cursor-pointer transition-all group"
      >
        <div className="flex items-center justify-center rounded-lg bg-sky-100 border-2 border-sky-400 h-[62px] shadow-md hover:shadow-lg transition-shadow">
          <div className="text-center">
            <User className="size-4 text-sky-600 mx-auto" />
            <span className="text-[10px] font-bold text-sky-700">Professor</span>
          </div>
        </div>
        <div className="w-8 h-2 rounded-b-full mx-auto -mt-0.5 bg-sky-300" />
      </div>
    )
  }

  // ---- CARTEIRA COM ALUNO (occupied desk) ----
  if (aluno) {
    return (
      <div ref={setNodeRef} className="h-20 group relative">
        <div
          className={cn(
            'flex items-center justify-center rounded-t-lg rounded-b-sm h-[62px]',
            'bg-amber-100 border-2 border-amber-300 shadow-md',
            'transition-all hover:shadow-lg hover:border-amber-400',
            isOver && 'border-emerald-500 bg-emerald-100 ring-2 ring-emerald-400'
          )}
        >
          <StudentCard aluno={aluno} isInGrid compact />
        </div>
        <Chair />
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemoveStudent(row, col)
          }}
          className="absolute -top-1.5 -right-1.5 hidden group-hover:flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow-sm hover:bg-red-600 transition-colors z-10"
        >
          <X className="size-3" />
        </button>
      </div>
    )
  }

  // ---- CARTEIRA VAZIA (empty desk) ----
  return (
    <div ref={setNodeRef} onClick={() => onToggleType(row, col)} className="h-20 cursor-pointer">
      <div
        className={cn(
          'flex items-center justify-center rounded-t-lg rounded-b-sm h-[62px]',
          'bg-amber-50/70 border-2 border-dashed border-amber-200/80',
          'transition-all hover:border-amber-300 hover:bg-amber-50',
          isOver && 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-300 border-solid'
        )}
      >
        <span className="text-[9px] text-amber-300/80 font-medium">vazio</span>
      </div>
      <Chair muted />
    </div>
  )
}
