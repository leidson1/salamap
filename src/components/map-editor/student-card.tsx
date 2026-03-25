'use client'

import { useDraggable } from '@dnd-kit/core'
import { cn } from '@/lib/utils'
import type { Aluno } from '@/types/database'

interface StudentCardProps {
  aluno: Aluno
  isInGrid?: boolean
  compact?: boolean
}

export function StudentCard({ aluno, isInGrid = false, compact = false }: StudentCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `student-${aluno.id}`,
    data: { aluno, source: isInGrid ? 'grid' : 'sidebar' },
  })

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined

  if (compact) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        className={cn(
          'text-xs font-medium text-emerald-900 truncate cursor-grab active:cursor-grabbing select-none',
          isDragging && 'opacity-40'
        )}
        title={`${aluno.numero ?? ''} - ${aluno.nome}`}
      >
        <span className="font-bold text-emerald-700">{aluno.numero ?? '?'}</span>{' '}
        {aluno.nome.split(' ')[0]}
      </div>
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        'flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm shadow-sm',
        'cursor-grab active:cursor-grabbing select-none transition-all',
        'hover:shadow-md hover:border-emerald-300',
        isDragging && 'opacity-40 shadow-lg ring-2 ring-emerald-400'
      )}
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
        {aluno.numero ?? '?'}
      </span>
      <span className="truncate font-medium">{aluno.nome}</span>
    </div>
  )
}
