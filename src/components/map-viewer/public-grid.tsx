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

function MiniChair({ muted = false, rotacao = 0 }: { muted?: boolean; rotacao?: number }) {
  const color = muted ? 'bg-stone-300/40' : 'bg-stone-400/80'

  if (rotacao === 180) {
    return <div className={cn('w-4 h-1.5 rounded-t-full mx-auto -mb-px', color)} />
  }
  if (rotacao === 90) {
    return <div className={cn('w-1.5 h-4 rounded-l-full absolute -left-1 top-1/2 -translate-y-1/2', color)} />
  }
  if (rotacao === 270) {
    return <div className={cn('w-1.5 h-4 rounded-r-full absolute -right-1 top-1/2 -translate-y-1/2', color)} />
  }
  // default: 0 (baixo)
  return <div className={cn('w-4 h-1.5 rounded-b-full mx-auto -mt-px', color)} />
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
              return <div key={`${rIdx}-${cIdx}`} className="h-14 sm:h-16" />
            }

            if (cell.tipo === 'bloqueado') {
              return (
                <div key={`${rIdx}-${cIdx}`} className="flex items-center justify-center rounded-md bg-stone-200/50 blocked-stripes h-14 sm:h-16">
                  <Ban className="size-3 text-stone-400" />
                </div>
              )
            }

            // carteira
            const aluno = cell.alunoId ? alunoMap.get(cell.alunoId) : null
            const connections = getDeskConnections(grid, rIdx, cIdx)
            const rot = (cell.rotacao as number) || 0
            return (
              <div key={`${rIdx}-${cIdx}`} className="relative h-14 overflow-visible sm:h-16">
                {connections.left && (
                  <div className={cn(
                    'absolute top-[10px] bottom-[18px] -left-1 w-2 rounded bg-amber-100 sm:top-[12px] sm:bottom-[20px]',
                    !aluno && 'bg-amber-50/70'
                  )} />
                )}
                {connections.right && (
                  <div className={cn(
                    'absolute top-[10px] bottom-[18px] -right-1 w-2 rounded bg-amber-100 sm:top-[12px] sm:bottom-[20px]',
                    !aluno && 'bg-amber-50/70'
                  )} />
                )}
                {connections.top && (
                  <div className={cn(
                    'absolute left-[10px] right-[10px] -top-1 h-2 rounded bg-amber-100',
                    !aluno && 'bg-amber-50/70'
                  )} />
                )}
                {connections.bottom && (
                  <div className={cn(
                    'absolute left-[10px] right-[10px] top-[36px] h-2 rounded bg-amber-100 sm:top-[44px]',
                    !aluno && 'bg-amber-50/70'
                  )} />
                )}
                {rot === 180 && <MiniChair muted={!aluno} rotacao={rot} />}
                <div className={cn(
                  'relative flex items-center justify-center rounded-t-md rounded-b-sm px-1 text-center',
                  'h-[42px] sm:h-[50px]',
                  aluno
                    ? 'bg-amber-100 border-2 border-amber-300 shadow-sm'
                    : 'bg-amber-50/50 border border-dashed border-amber-200/60'
                )}>
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
                {rot !== 180 && <MiniChair muted={!aluno} rotacao={rot} />}
              </div>
            )
          })
        )}
      </div>
    </ClassroomFrame>
  )
}
