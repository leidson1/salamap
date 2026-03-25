'use client'

import { cn } from '@/lib/utils'
import { User, Ban } from 'lucide-react'
import { ClassroomFrame } from '@/components/map-editor/classroom-frame'
import type { Grid, RoomConfig } from '@/types/database'

interface PublicGridProps {
  grid: Grid
  colunas: number
  alunoMap: Map<number, { nome: string; numero: number | null }>
  roomConfig?: RoomConfig | null
}

function MiniChair({ muted = false }: { muted?: boolean }) {
  return (
    <div className={cn(
      'w-4 h-1.5 rounded-b-full mx-auto -mt-px',
      muted ? 'bg-stone-300/40' : 'bg-stone-400/80'
    )} />
  )
}

export function PublicGrid({ grid, colunas, alunoMap, roomConfig }: PublicGridProps) {
  return (
    <ClassroomFrame roomConfig={roomConfig} compact>
      <div
        className="grid gap-1.5 sm:gap-2"
        style={{
          gridTemplateColumns: `repeat(${colunas}, minmax(55px, 1fr))`,
        }}
      >
        {grid.map((row, rIdx) =>
          row.map((cell, cIdx) => {
            if (cell.tipo === 'vazio') {
              return (
                <div
                  key={`${rIdx}-${cIdx}`}
                  className="h-14 sm:h-16"
                />
              )
            }

            if (cell.tipo === 'bloqueado') {
              return (
                <div
                  key={`${rIdx}-${cIdx}`}
                  className="flex items-center justify-center rounded-md bg-stone-200/50 blocked-stripes h-14 sm:h-16"
                >
                  <Ban className="size-3 text-stone-400" />
                </div>
              )
            }

            if (cell.tipo === 'professor') {
              return (
                <div key={`${rIdx}-${cIdx}`} className="h-14 sm:h-16">
                  <div className="flex items-center justify-center rounded-md bg-sky-100 border border-sky-400 h-[42px] sm:h-[50px] shadow-sm">
                    <div className="text-center">
                      <User className="size-3 text-sky-600 mx-auto" />
                      <span className="text-[8px] font-bold text-sky-700">Prof.</span>
                    </div>
                  </div>
                  <div className="w-5 h-1.5 rounded-b-full mx-auto -mt-px bg-sky-300/80" />
                </div>
              )
            }

            const aluno = cell.alunoId ? alunoMap.get(cell.alunoId) : null

            return (
              <div key={`${rIdx}-${cIdx}`} className="h-14 sm:h-16">
                <div
                  className={cn(
                    'flex items-center justify-center rounded-t-md rounded-b-sm px-1 text-center',
                    'h-[42px] sm:h-[50px]',
                    aluno
                      ? 'bg-amber-100 border-2 border-amber-300 shadow-sm'
                      : 'bg-amber-50/50 border border-dashed border-amber-200/60'
                  )}
                >
                  {aluno ? (
                    <div className="truncate">
                      <span className="text-[10px] sm:text-xs font-bold text-amber-700 block">
                        {aluno.numero ?? '?'}
                      </span>
                      <span className="text-[8px] sm:text-[9px] text-amber-900 truncate block leading-tight">
                        {aluno.nome.split(' ')[0]}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[8px] text-amber-300/60">-</span>
                  )}
                </div>
                <MiniChair muted={!aluno} />
              </div>
            )
          })
        )}
      </div>
    </ClassroomFrame>
  )
}
