'use client'

import { cn } from '@/lib/utils'
import { getCellBlockId } from '@/lib/map/utils'
import { Ban } from 'lucide-react'
import { ClassroomFrame } from '@/components/map-editor/classroom-frame'
import type { Grid, RoomConfig } from '@/types/database'

interface PublicGridProps {
  grid: Grid
  colunas: number
  alunoMap: Map<number, { nome: string; numero: number | null }>
  roomConfig?: RoomConfig | null
}

function MiniChair({ occupied = false }: { occupied?: boolean }) {
  return (
    <div className={cn(
      'w-5 h-1.5 rounded-b-full mx-auto',
      occupied ? 'bg-slate-400/80' : 'bg-slate-300/50'
    )} />
  )
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
              return <div key={`${rIdx}-${cIdx}`} className="h-[52px] sm:h-[60px]" />
            }

            if (cell.tipo === 'bloqueado') {
              return (
                <div key={`${rIdx}-${cIdx}`} className="flex items-center justify-center rounded-md bg-slate-100 border border-slate-200 h-[52px] sm:h-[60px]">
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
                    'absolute top-[6px] bottom-[14px] -left-1.5 w-2.5 rounded',
                    occupied ? 'bg-green-50' : 'bg-white'
                  )} />
                )}
                {connections.right && (
                  <div className={cn(
                    'absolute top-[6px] bottom-[14px] -right-1.5 w-2.5 rounded',
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
                    'absolute left-[8px] right-[8px] bottom-[4px] h-2.5 rounded',
                    occupied ? 'bg-green-50' : 'bg-white'
                  )} />
                )}

                {/* Desk surface — sombra + mesa */}
                <div className={cn(
                  'relative flex flex-col items-center justify-center rounded-md px-1 text-center shadow-sm',
                  'h-[42px] sm:h-[50px]',
                  occupied
                    ? 'bg-green-50 border border-green-300'
                    : 'bg-white border border-slate-200'
                )}>
                  {aluno ? (
                    <>
                      <div className="flex items-center justify-center w-5 h-5 rounded-full bg-green-700/10 mb-0.5">
                        <span className="text-[10px] sm:text-xs font-bold text-green-700 leading-none">
                          {aluno.numero ?? '?'}
                        </span>
                      </div>
                      <span className="text-[8px] sm:text-[9px] text-gray-700 truncate block leading-tight max-w-full">
                        {aluno.nome.split(' ')[0]}
                      </span>
                    </>
                  ) : (
                    <span className="text-[8px] text-slate-300">—</span>
                  )}
                </div>

                {/* Chair */}
                <MiniChair occupied={occupied} />
              </div>
            )
          })
        )}
      </div>
    </ClassroomFrame>
  )
}
