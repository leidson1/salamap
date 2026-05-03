import { cn } from '@/lib/utils'

interface StudentListProps {
  alunos: Array<{ id: number; nome: string; numero: number | null }>
  interactive?: boolean
  selectedAlunoId?: number | null
  selectableIds?: Set<number>
  onSelectAluno?: (alunoId: number) => void
}

export function StudentList({
  alunos,
  interactive = false,
  selectedAlunoId,
  selectableIds,
  onSelectAluno,
}: StudentListProps) {
  const sorted = [...alunos].sort((a, b) => (a.numero ?? 999) - (b.numero ?? 999))

  return (
    <div className="rounded-lg border bg-white overflow-hidden">
      <div className="grid grid-cols-1 sm:grid-cols-2">
        {sorted.map((aluno) => {
          const canSelect = !interactive || !selectableIds || selectableIds.has(aluno.id)
          const isSelected = selectedAlunoId === aluno.id

          return (
            <button
              key={aluno.id}
              type="button"
              disabled={interactive && !canSelect}
              onClick={() => canSelect && onSelectAluno?.(aluno.id)}
              className={cn(
                'flex w-full items-center gap-2 border-b px-3 py-2 text-left text-sm last:border-b-0 sm:odd:border-r',
                interactive && canSelect && 'cursor-pointer transition-colors hover:bg-emerald-50/70 active:bg-emerald-100/60',
                interactive && !canSelect && 'cursor-default opacity-60',
                isSelected && 'bg-emerald-50 ring-1 ring-inset ring-emerald-300'
              )}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
              {aluno.numero ?? '-'}
              </span>
              <span className="min-w-0 flex-1 truncate">{aluno.nome}</span>
              {interactive && (
                <span className={cn(
                  'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium',
                  canSelect
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-100 text-slate-500'
                )}>
                  {canSelect ? 'Mover' : 'Sem cadeira'}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
