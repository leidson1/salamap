'use client'

import { cn } from '@/lib/utils'
import { User, Ban } from 'lucide-react'
import type { Grid } from '@/types/database'

interface PublicGridProps {
  grid: Grid
  colunas: number
  alunoMap: Map<number, { nome: string; numero: number | null }>
}

export function PublicGrid({ grid, colunas, alunoMap }: PublicGridProps) {
  return (
    <div
      className="grid gap-1.5 sm:gap-2"
      style={{
        gridTemplateColumns: `repeat(${colunas}, minmax(60px, 1fr))`,
      }}
    >
      {grid.map((row, rIdx) =>
        row.map((cell, cIdx) => {
          if (cell.tipo === 'vazio') {
            return (
              <div
                key={`${rIdx}-${cIdx}`}
                className="h-12 sm:h-14 rounded-md"
              />
            )
          }

          if (cell.tipo === 'bloqueado') {
            return (
              <div
                key={`${rIdx}-${cIdx}`}
                className="flex items-center justify-center rounded-md bg-gray-200 h-12 sm:h-14"
              >
                <Ban className="size-3.5 text-gray-400" />
              </div>
            )
          }

          if (cell.tipo === 'professor') {
            return (
              <div
                key={`${rIdx}-${cIdx}`}
                className="flex items-center justify-center rounded-md bg-blue-100 border border-blue-300 h-12 sm:h-14"
              >
                <div className="text-center">
                  <User className="size-3.5 text-blue-600 mx-auto" />
                  <span className="text-[9px] font-semibold text-blue-700">Prof.</span>
                </div>
              </div>
            )
          }

          const aluno = cell.alunoId ? alunoMap.get(cell.alunoId) : null

          return (
            <div
              key={`${rIdx}-${cIdx}`}
              className={cn(
                'flex items-center justify-center rounded-md h-12 sm:h-14 px-1 text-center',
                aluno
                  ? 'bg-emerald-50 border-2 border-emerald-300'
                  : 'border border-dashed border-gray-300'
              )}
            >
              {aluno ? (
                <div className="truncate">
                  <span className="text-[10px] sm:text-xs font-bold text-emerald-700 block">
                    {aluno.numero ?? '?'}
                  </span>
                  <span className="text-[9px] sm:text-[10px] text-emerald-900 truncate block leading-tight">
                    {aluno.nome.split(' ')[0]}
                  </span>
                </div>
              ) : (
                <span className="text-[9px] text-gray-300">-</span>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
