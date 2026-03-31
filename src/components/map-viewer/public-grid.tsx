'use client'

import { cn } from '@/lib/utils'
import { getCellBlockId, displayName } from '@/lib/map/utils'
import { Ban } from 'lucide-react'
import { ClassroomFrame } from '@/components/map-editor/classroom-frame'
import type { Grid, RoomConfig } from '@/types/database'

interface PublicGridProps {
  grid: Grid
  colunas: number
  alunoMap: Map<number, { nome: string; numero: number | null; apelido?: string | null }>
  roomConfig?: RoomConfig | null
}

function getDeskConnections(grid: Grid, row: number, col: number) {
  const blockId = getCellBlockId(grid[row]?.[col], row, col)

  if (!blockId) {
    return { left: false, right: false, top: false, bottom: false }
  }

  return {
    left: getCellBlockId(grid[row]?.[col - 1], row, col - 1) === blockId,
    right: getCellBlockId(grid[row]?.[col + 1], row, col + 1) === blockId,
    top: getCellBlockId(grid[row - 1]?.[col], row - 1, col) === blockId,
    bottom: getCellBlockId(grid[row + 1]?.[col], row + 1, col) === blockId,
  }
}

export function PublicGrid({ grid, colunas, alunoMap, roomConfig }: PublicGridProps) {
  const allAlunos = Array.from(alunoMap.values())
  return (
    <ClassroomFrame roomConfig={roomConfig} compact>
      <div
        className="grid gap-2 sm:gap-2.5"
        style={{
          gridTemplateColumns: `repeat(${colunas}, minmax(60px, 1fr))`,
        }}
      >
        {grid.map((row, rIdx) =>
          row.map((cell, cIdx) => {
            if (cell.tipo === 'vazio') {
              return <div key={`${rIdx}-${cIdx}`} className="h-[58px] sm:h-[68px]" />
            }

            if (cell.tipo === 'bloqueado') {
              return (
                <div key={`${rIdx}-${cIdx}`} className="flex items-center justify-center rounded-md bg-slate-100 border border-slate-200 h-[58px] sm:h-[68px]">
                  <Ban className="size-3 text-slate-400" />
                </div>
              )
            }

            // carteira
            const aluno = cell.alunoId ? alunoMap.get(Number(cell.alunoId)) : null
            const connections = getDeskConnections(grid, rIdx, cIdx)
            const occupied = !!aluno

            return (
              <div key={`${rIdx}-${cIdx}`} className="relative overflow-visible">
                {/* Block connectors */}
                {connections.left && (
                  <div className={cn(
                    'absolute top-[6px] bottom-[16px] -left-1.5 w-2.5 rounded',
                    occupied ? 'bg-green-50' : 'bg-white'
                  )} />
                )}
                {connections.right && (
                  <div className={cn(
                    'absolute top-[6px] bottom-[16px] -right-1.5 w-2.5 rounded',
                    occupied ? 'bg-green-50' : 'bg-white'
                  )} />
                )}
                {connections.top && (
                  <div className={cn(
                    'absolute left-[8px] right-[8px] -top-1.5 h-2.5 rounded',
                    occupied ? 'bg-green-50' : 'bg-white'
                  )} />
                )}
                {connections.bottom && (
                  <div className={cn(
                    'absolute left-[8px] right-[8px] bottom-[6px] h-2.5 rounded',
                    occupied ? 'bg-green-50' : 'bg-white'
                  )} />
                )}

                {/* Shadow */}
                <div className={cn(
                  'absolute top-[1px] left-[1px] right-0 rounded-md',
                  'h-[46px] sm:h-[54px]',
                  'bg-black/[0.04]'
                )} />

                {/* Desk surface */}
                <div className={cn(
                  'relative flex flex-col items-center justify-center rounded-md px-1 text-center',
                  'h-[46px] sm:h-[54px]',
                  occupied
                    ? 'bg-green-50 border border-green-300 shadow-sm'
                    : 'bg-white border border-slate-200'
                )}>
                  {aluno ? (
                    <>
                      <div className="flex items-center justify-center w-[22px] h-[22px] rounded-full bg-green-700/10 mb-0.5">
                        <span className="text-[11px] sm:text-xs font-bold text-green-700 leading-none">
                          {aluno.numero ?? '?'}
                        </span>
                      </div>
                      <span className="text-[9px] sm:text-[10px] text-gray-700 truncate block leading-tight max-w-full font-medium">
                        {displayName(aluno, allAlunos)}
                      </span>
                    </>
                  ) : null}
                </div>

                {/* Chair */}
                <div className={cn(
                  'w-[18px] h-[8px] rounded-b-full mx-auto mt-0.5',
                  occupied ? 'bg-slate-400' : 'bg-slate-300/60'
                )} />
              </div>
            )
          })
        )}
      </div>
    </ClassroomFrame>
  )
}
