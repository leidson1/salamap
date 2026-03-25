'use client'

import { useDroppable, useDraggable } from '@dnd-kit/core'
import { cn } from '@/lib/utils'
import { StudentCard } from './student-card'
import { X, User, Ban, DoorOpen, PanelTop, Square } from 'lucide-react'
import type { GridCell, Aluno } from '@/types/database'

interface DeskCellProps {
  cell: GridCell
  row: number
  col: number
  aluno: Aluno | null
  mode: 'alunos' | 'mobiliar'
  onToggleType: (row: number, col: number) => void
  onRemoveStudent: (row: number, col: number) => void
}

function Chair({ muted = false }: { muted?: boolean }) {
  return (
    <div className={cn(
      'w-5 h-2 rounded-b-full mx-auto -mt-0.5',
      muted ? 'bg-stone-300/50' : 'bg-stone-400'
    )} />
  )
}

function DraggableWrapper({
  id,
  data,
  enabled,
  children,
}: {
  id: string
  data: Record<string, unknown>
  enabled: boolean
  children: React.ReactNode
}) {
  const { setNodeRef, attributes, listeners, transform, isDragging } = useDraggable({
    id,
    data,
    disabled: !enabled,
  })

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(enabled ? listeners : {})}
      {...(enabled ? attributes : {})}
      className={cn(
        enabled && 'cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-30'
      )}
    >
      {children}
    </div>
  )
}

export function DeskCell({ cell, row, col, aluno, mode, onToggleType, onRemoveStudent }: DeskCellProps) {
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `cell-${row}-${col}`,
    data: { row, col, cell },
  })

  const isMobiliar = mode === 'mobiliar'
  const canDrag = isMobiliar && cell.tipo !== 'vazio'

  const content = (() => {
    // ---- VAZIO (empty floor) ----
    if (cell.tipo === 'vazio') {
      return (
        <div
          onClick={() => isMobiliar && onToggleType(row, col)}
          className={cn(
            'h-20 rounded-lg border border-transparent transition-all',
            isMobiliar && 'cursor-pointer hover:border-dashed hover:border-stone-300',
            isOver && 'border-dashed border-emerald-400 bg-emerald-50/40'
          )}
        />
      )
    }

    // ---- PORTA ----
    if (cell.tipo === 'porta') {
      return (
        <div className="h-20">
          <div className={cn(
            'flex items-center justify-center rounded-lg h-[62px] transition-all',
            'bg-amber-700/15 border-2 border-amber-700/40',
            isOver && 'ring-2 ring-emerald-400'
          )}>
            <div className="text-center">
              <DoorOpen className="size-5 text-amber-700 mx-auto" />
              <span className="text-[9px] font-bold text-amber-700">Porta</span>
            </div>
          </div>
        </div>
      )
    }

    // ---- QUADRO ----
    if (cell.tipo === 'quadro') {
      return (
        <div className="h-20">
          <div className={cn(
            'flex items-center justify-center rounded-lg h-[62px] transition-all',
            'bg-white border-2 border-stone-300 shadow-sm',
            isOver && 'ring-2 ring-emerald-400'
          )}>
            <div className="text-center">
              <PanelTop className="size-5 text-stone-500 mx-auto" />
              <span className="text-[9px] font-bold text-stone-500">Quadro</span>
            </div>
          </div>
        </div>
      )
    }

    // ---- JANELA ----
    if (cell.tipo === 'janela') {
      return (
        <div className="h-20">
          <div className={cn(
            'flex items-center justify-center rounded-lg h-[62px] transition-all',
            'bg-sky-100/80 border-2 border-sky-400/60',
            isOver && 'ring-2 ring-emerald-400'
          )}>
            <div className="text-center">
              <Square className="size-5 text-sky-500 mx-auto" />
              <span className="text-[9px] font-bold text-sky-500">Janela</span>
            </div>
          </div>
        </div>
      )
    }

    // ---- BLOQUEADO ----
    if (cell.tipo === 'bloqueado') {
      return (
        <div className="flex items-center justify-center rounded-lg bg-stone-200/60 blocked-stripes h-20 transition-all">
          <Ban className="size-4 text-stone-400" />
        </div>
      )
    }

    // ---- PROFESSOR ----
    if (cell.tipo === 'professor') {
      return (
        <div className="h-20">
          <div className={cn(
            'flex items-center justify-center rounded-lg bg-sky-100 border-2 border-sky-400 h-[62px] shadow-md transition-shadow',
            isOver && 'ring-2 ring-emerald-400'
          )}>
            <div className="text-center">
              <User className="size-4 text-sky-600 mx-auto" />
              <span className="text-[10px] font-bold text-sky-700">Professor</span>
            </div>
          </div>
          <div className="w-8 h-2 rounded-b-full mx-auto -mt-0.5 bg-sky-300" />
        </div>
      )
    }

    // ---- CARTEIRA COM ALUNO ----
    if (cell.tipo === 'carteira' && aluno) {
      return (
        <div className="h-20 group relative">
          <div className={cn(
            'flex items-center justify-center rounded-t-lg rounded-b-sm h-[62px]',
            'bg-amber-100 border-2 border-amber-300 shadow-md',
            'transition-all hover:shadow-lg hover:border-amber-400',
            isOver && 'border-emerald-500 bg-emerald-100 ring-2 ring-emerald-400'
          )}>
            {mode === 'alunos' ? (
              <StudentCard aluno={aluno} isInGrid compact />
            ) : (
              <div className="text-center">
                <span className="text-[10px] font-bold text-emerald-700">{aluno.numero ?? '?'}</span>
                <span className="text-[9px] text-amber-900 block truncate px-1">{aluno.nome.split(' ')[0]}</span>
              </div>
            )}
          </div>
          <Chair />
          {mode === 'alunos' && (
            <button
              onClick={(e) => { e.stopPropagation(); onRemoveStudent(row, col) }}
              className="absolute -top-1.5 -right-1.5 hidden group-hover:flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow-sm hover:bg-red-600 transition-colors z-10"
            >
              <X className="size-3" />
            </button>
          )}
        </div>
      )
    }

    // ---- CARTEIRA VAZIA ----
    return (
      <div className="h-20 cursor-pointer" onClick={() => !isMobiliar && onToggleType(row, col)}>
        <div className={cn(
          'flex items-center justify-center rounded-t-lg rounded-b-sm h-[62px]',
          'bg-amber-50/70 border-2 border-dashed border-amber-200/80',
          'transition-all hover:border-amber-300 hover:bg-amber-50',
          isOver && 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-300 border-solid'
        )}>
          <span className="text-[9px] text-amber-300/80 font-medium">vazio</span>
        </div>
        <Chair muted />
      </div>
    )
  })()

  return (
    <div ref={setDropRef}>
      <DraggableWrapper
        id={`cell-${row}-${col}`}
        data={{ row, col, cell, type: 'cell' }}
        enabled={canDrag}
      >
        {content}
      </DraggableWrapper>
    </div>
  )
}
