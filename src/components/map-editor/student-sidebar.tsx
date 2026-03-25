'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Search, UserRound } from 'lucide-react'
import { Input } from '@/components/ui/input'
import type { Aluno } from '@/types/database'

interface StudentSidebarProps {
  alunos: Aluno[]
  placedIds: number[]
  selectedStudentId?: number | null
  onSelectStudent?: (alunoId: number | null) => void
}

export function StudentSidebar({ alunos, placedIds, selectedStudentId, onSelectStudent }: StudentSidebarProps) {
  const [search, setSearch] = useState('')

  const unplacedAlunos = alunos
    .filter((a) => !placedIds.includes(a.id))
    .filter((a) =>
      search
        ? a.nome.toLowerCase().includes(search.toLowerCase()) ||
          a.numero?.toString().includes(search)
        : true
    )

  const placedCount = alunos.filter((a) => placedIds.includes(a.id)).length

  return (
    <div className="flex flex-col rounded-lg border bg-white w-full lg:w-72 lg:shrink-0">
      <div className="border-b p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Alunos</h3>
          <span className="text-xs text-muted-foreground">
            {placedCount}/{alunos.length} posicionados
          </span>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar aluno..."
            className="pl-8 h-8 text-sm"
          />
        </div>
        {selectedStudentId && (
          <p className="mt-2 text-xs text-emerald-600 font-medium">
            Clique em uma carteira vazia para posicionar
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 max-h-[calc(100vh-320px)] lg:max-h-[calc(100vh-280px)]">
        {unplacedAlunos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <UserRound className="size-8 text-muted-foreground/50" />
            <p className="mt-2 text-xs text-muted-foreground">
              {alunos.length === 0
                ? 'Nenhum aluno cadastrado'
                : search
                  ? 'Nenhum resultado'
                  : 'Todos posicionados!'}
            </p>
          </div>
        ) : (
          unplacedAlunos.map((aluno) => (
            <div
              key={aluno.id}
              onClick={() => onSelectStudent?.(selectedStudentId === aluno.id ? null : aluno.id)}
              className={cn(
                'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-all select-none',
                selectedStudentId === aluno.id
                  ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-300 shadow-md'
                  : 'bg-white hover:shadow-md hover:border-emerald-300'
              )}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                {aluno.numero ?? '?'}
              </span>
              <span className="truncate font-medium">{aluno.nome}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
