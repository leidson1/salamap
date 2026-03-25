interface StudentListProps {
  alunos: Array<{ id: number; nome: string; numero: number | null }>
}

export function StudentList({ alunos }: StudentListProps) {
  const sorted = [...alunos].sort((a, b) => (a.numero ?? 999) - (b.numero ?? 999))

  return (
    <div className="rounded-lg border bg-white overflow-hidden">
      <div className="grid grid-cols-1 sm:grid-cols-2">
        {sorted.map((aluno) => (
          <div
            key={aluno.id}
            className="flex items-center gap-2 px-3 py-2 border-b last:border-b-0 sm:odd:border-r text-sm"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
              {aluno.numero ?? '-'}
            </span>
            <span className="truncate">{aluno.nome}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
