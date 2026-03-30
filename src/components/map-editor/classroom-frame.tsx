'use client'

import { Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RoomConfig, WallElement, WallSide } from '@/types/database'
import { DEFAULT_ROOM_CONFIG } from '@/types/database'

interface ClassroomFrameProps {
  roomConfig?: RoomConfig | null
  children: React.ReactNode
  compact?: boolean
  interactive?: boolean
  onRoomConfigChange?: (config: RoomConfig) => void
}

// Tamanhos baseados no campo size do WallElement
const WALL_DEPTH = { compact: 28, normal: 36 }

function getElementLength(el: WallElement, compact: boolean) {
  const base = compact ? 30 : 40
  const mult = el.size === 1 ? 0.7 : el.size === 3 ? 1.8 : 1
  return Math.round(base * mult)
}

function WallElementIcon({ el, wall, compact, interactive, onRemove }: {
  el: WallElement
  wall: WallSide
  compact?: boolean
  interactive?: boolean
  onRemove?: () => void
}) {
  const isH = wall === 'top' || wall === 'bottom'
  const len = getElementLength(el, !!compact)
  const depth = compact ? WALL_DEPTH.compact - 4 : WALL_DEPTH.normal - 6

  const w = isH ? len : depth
  const h = isH ? depth : len

  if (el.type === 'porta') {
    return (
      <div
        style={{ width: w, height: h, position: 'absolute',
          ...(wall === 'top' ? { left: `${el.position}%`, top: 2, transform: 'translateX(-50%)' } :
              wall === 'bottom' ? { left: `${el.position}%`, bottom: 2, transform: 'translateX(-50%)' } :
              wall === 'left' ? { top: `${el.position}%`, left: 2, transform: 'translateY(-50%)' } :
              { top: `${el.position}%`, right: 2, transform: 'translateY(-50%)' })
        }}
        className={`bg-stone-500/15 border border-stone-400/60 rounded-sm flex items-center justify-center relative group shrink-0 ${interactive ? 'cursor-move' : ''}`}
      >
        <span className="text-[8px] font-bold text-stone-500">P</span>
        {interactive && onRemove && (
          <button onClick={(e) => { e.stopPropagation(); onRemove() }}
            className="absolute -top-1 -right-1 hidden group-hover:flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-white text-[8px]">
            <X className="size-2" />
          </button>
        )}
      </div>
    )
  }

  // janela
  return (
    <div
      style={{ width: w, height: h, position: 'absolute',
        ...(wall === 'top' ? { left: `${el.position}%`, top: 2, transform: 'translateX(-50%)' } :
            wall === 'bottom' ? { left: `${el.position}%`, bottom: 2, transform: 'translateX(-50%)' } :
            wall === 'left' ? { top: `${el.position}%`, left: 2, transform: 'translateY(-50%)' } :
            { top: `${el.position}%`, right: 2, transform: 'translateY(-50%)' })
      }}
      className={`bg-cyan-200/60 border border-cyan-400/60 rounded-sm relative group shrink-0 ${interactive ? 'cursor-move' : ''}`}
    >
      {interactive && onRemove && (
        <button onClick={(e) => { e.stopPropagation(); onRemove() }}
          className="absolute -top-1 -right-1 hidden group-hover:flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-white text-[8px]">
          <X className="size-2" />
        </button>
      )}
    </div>
  )
}

function AddButton({ onClick, compact }: { onClick: () => void; compact?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`${compact ? 'w-5 h-5' : 'w-7 h-7'} border border-dashed border-slate-300 rounded flex items-center justify-center hover:border-slate-400 hover:bg-slate-100 transition-colors shrink-0`}
    >
      <Plus className={compact ? 'size-2.5' : 'size-3'} style={{ color: '#94a3b8' }} />
    </button>
  )
}

function TeacherArea({ position, compact, interactive, onPositionChange }: {
  position: string
  compact?: boolean
  interactive?: boolean
  onPositionChange?: (pos: 'left' | 'center' | 'right' | 'none') => void
}) {
  if (position === 'none') {
    if (!interactive) return null
    return (
      <div className="flex justify-center py-2">
        <button
          onClick={() => onPositionChange?.('center')}
          className="text-[10px] text-muted-foreground border border-dashed rounded px-3 py-1 hover:bg-muted/50 transition-colors"
        >
          + Adicionar mesa do professor
        </button>
      </div>
    )
  }

  const justifyClass = position === 'left' ? 'justify-start' : position === 'right' ? 'justify-end' : 'justify-center'
  const cycle = () => {
    if (!interactive || !onPositionChange) return
    const positions: Array<'left' | 'center' | 'right' | 'none'> = ['left', 'center', 'right', 'none']
    const idx = positions.indexOf(position as 'left' | 'center' | 'right')
    onPositionChange(positions[(idx + 1) % positions.length])
  }

  return (
    <div className={`flex ${justifyClass} ${compact ? 'py-1.5 px-3' : 'py-2.5 px-4'}`}>
      <div
        onClick={cycle}
        className={cn(
          'flex items-center justify-center rounded-md border shadow-sm',
          compact ? 'px-4 py-1.5' : 'px-6 py-2.5',
          'bg-blue-50 border-blue-300',
          interactive && 'cursor-pointer hover:shadow-md hover:border-blue-400 transition-all'
        )}
        title={interactive ? 'Clique para mudar posição da mesa' : undefined}
      >
        <span className={`${compact ? 'text-[9px]' : 'text-[10px]'} font-bold text-blue-700`}>Professor</span>
      </div>
    </div>
  )
}

function WallWithElements({ wall, elements, compact, interactive, onAdd, onRemove }: {
  wall: WallSide
  elements: WallElement[]
  compact?: boolean
  interactive?: boolean
  onAdd?: (wall: WallSide, type: 'porta' | 'janela') => void
  onRemove?: (id: string) => void
}) {
  // Elementos posicionados com position absolute (% do el.position)
  return (
    <>
      {elements.map(el => (
        <WallElementIcon
          key={el.id}
          el={el}
          wall={wall}
          compact={compact}
          interactive={interactive}
          onRemove={interactive && onRemove ? () => onRemove(el.id) : undefined}
        />
      ))}
      {interactive && onAdd && (
        <div className={cn(
          'absolute flex gap-1',
          wall === 'top' ? 'right-2 top-1/2 -translate-y-1/2 flex-row' :
          wall === 'bottom' ? 'right-2 top-1/2 -translate-y-1/2 flex-row' :
          wall === 'left' ? 'bottom-1 left-1/2 -translate-x-1/2 flex-col' :
          'bottom-1 right-1/2 translate-x-1/2 flex-col'
        )}>
          <AddButton compact={compact} onClick={() => onAdd(wall, 'porta')} />
          <AddButton compact={compact} onClick={() => onAdd(wall, 'janela')} />
        </div>
      )}
    </>
  )
}

export function ClassroomFrame({
  roomConfig,
  children,
  compact = false,
  interactive = false,
  onRoomConfigChange,
}: ClassroomFrameProps) {
  const config = roomConfig ?? DEFAULT_ROOM_CONFIG
  const wallElements = config.wallElements ?? []

  const getWallElements = (wall: WallSide) => wallElements.filter(e => e.wall === wall)

  const handleAdd = (wall: WallSide, type: 'porta' | 'janela') => {
    if (!onRoomConfigChange) return
    const id = `${type}-${Date.now()}`
    const position = Math.random() * 80 + 10
    onRoomConfigChange({
      ...config,
      wallElements: [...wallElements, { id, type, wall, position, size: 2 as const }],
    })
  }

  const handleRemove = (id: string) => {
    if (!onRoomConfigChange) return
    onRoomConfigChange({
      ...config,
      wallElements: wallElements.filter(e => e.id !== id),
    })
  }

  const handleTeacherPos = (pos: 'left' | 'center' | 'right' | 'none') => {
    if (!onRoomConfigChange) return
    onRoomConfigChange({ ...config, teacherDesk: pos })
  }

  const handleBoardCycle = () => {
    if (!interactive || !onRoomConfigChange) return
    onRoomConfigChange({
      ...config,
      boardWall: config.boardWall === 'top' ? 'bottom' : 'top',
    })
  }

  const wallT = compact ? `${WALL_DEPTH.compact}px` : `${WALL_DEPTH.normal}px`
  const boardAtTop = config.boardWall === 'top'

  return (
    <div className="bg-slate-50 rounded-xl overflow-hidden">
      <div className="flex flex-col">

        {/* TOP WALL */}
        <div
          className="bg-slate-200 relative flex items-center justify-center"
          style={{ minHeight: wallT }}
        >
          {boardAtTop && (
            <div
              onClick={handleBoardCycle}
              className={cn(
                'bg-white border-2 border-cyan-400/70 rounded shadow-sm flex items-center justify-center z-10',
                compact ? 'h-5 w-[45%] max-w-[200px]' : 'h-6 w-[50%] max-w-[280px]',
                interactive && 'cursor-pointer hover:shadow-md hover:border-cyan-500 transition-all'
              )}
              title={interactive ? 'Clique para mover quadro' : undefined}
            >
              <span className={`${compact ? 'text-[7px] sm:text-[8px]' : 'text-[9px]'} font-bold text-slate-400 tracking-[0.15em]`}>
                {config.boardLabel}
              </span>
            </div>
          )}
          <WallWithElements
            wall="top"
            elements={getWallElements('top')}
            compact={compact}
            interactive={interactive}
            onAdd={handleAdd}
            onRemove={handleRemove}
          />
        </div>

        {/* MIDDLE: left wall + content + right wall */}
        <div className="flex">
          {/* LEFT WALL */}
          <div
            className="bg-slate-200 relative shrink-0"
            style={{ minWidth: wallT }}
          >
            <WallWithElements
              wall="left"
              elements={getWallElements('left')}
              compact={compact}
              interactive={interactive}
              onAdd={handleAdd}
              onRemove={handleRemove}
            />
          </div>

          {/* INTERIOR */}
          <div className="flex-1 flex flex-col border-x border-slate-300/50">
            {boardAtTop && (
              <TeacherArea
                position={config.teacherDesk}
                compact={compact}
                interactive={interactive}
                onPositionChange={handleTeacherPos}
              />
            )}

            {boardAtTop && config.teacherDesk !== 'none' && (
              <div className={`mx-3 border-t border-dashed border-slate-200 ${compact ? 'mb-1' : 'mb-2'}`} />
            )}

            <div className={compact ? 'p-2 sm:p-3' : 'p-3 sm:p-4'}>
              {children}
            </div>

            {!boardAtTop && config.teacherDesk !== 'none' && (
              <div className={`mx-3 border-t border-dashed border-slate-200 ${compact ? 'mt-1' : 'mt-2'}`} />
            )}
            {!boardAtTop && (
              <TeacherArea
                position={config.teacherDesk}
                compact={compact}
                interactive={interactive}
                onPositionChange={handleTeacherPos}
              />
            )}
          </div>

          {/* RIGHT WALL */}
          <div
            className="bg-slate-200 relative shrink-0"
            style={{ minWidth: wallT }}
          >
            <WallWithElements
              wall="right"
              elements={getWallElements('right')}
              compact={compact}
              interactive={interactive}
              onAdd={handleAdd}
              onRemove={handleRemove}
            />
          </div>
        </div>

        {/* BOTTOM WALL */}
        <div
          className="bg-slate-200 relative flex items-center justify-center"
          style={{ minHeight: wallT }}
        >
          {!boardAtTop && (
            <div
              onClick={handleBoardCycle}
              className={cn(
                'bg-white border-2 border-cyan-400/70 rounded shadow-sm flex items-center justify-center z-10',
                compact ? 'h-5 w-[45%] max-w-[200px]' : 'h-6 w-[50%] max-w-[280px]',
                interactive && 'cursor-pointer hover:shadow-md hover:border-cyan-500 transition-all'
              )}
            >
              <span className={`${compact ? 'text-[7px] sm:text-[8px]' : 'text-[9px]'} font-bold text-slate-400 tracking-[0.15em]`}>
                {config.boardLabel}
              </span>
            </div>
          )}
          <WallWithElements
            wall="bottom"
            elements={getWallElements('bottom')}
            compact={compact}
            interactive={interactive}
            onAdd={handleAdd}
            onRemove={handleRemove}
          />
        </div>
      </div>
    </div>
  )
}
