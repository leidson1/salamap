'use client'

import { User, DoorOpen, Plus, X } from 'lucide-react'
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

function WallElementIcon({ el, compact, interactive, onRemove }: {
  el: WallElement
  compact?: boolean
  interactive?: boolean
  onRemove?: () => void
}) {
  const size = compact ? 'w-7 h-7' : 'w-9 h-9'

  if (el.type === 'porta') {
    return (
      <div className={`${size} bg-amber-800/25 border-2 border-amber-700/50 rounded flex items-center justify-center relative group ${interactive ? 'cursor-move' : ''}`}>
        <DoorOpen className={compact ? 'size-3' : 'size-4'} style={{ color: '#92400e' }} />
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
    <div className={`${size} bg-sky-200/80 border-2 border-sky-400/70 rounded-sm relative group ${interactive ? 'cursor-move' : ''}`}>
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
      className={`${compact ? 'w-5 h-5' : 'w-7 h-7'} border-2 border-dashed border-stone-300 rounded flex items-center justify-center hover:border-stone-400 hover:bg-stone-100 transition-colors`}
    >
      <Plus className={compact ? 'size-2.5' : 'size-3'} style={{ color: '#a8a29e' }} />
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
    <div className={`flex ${justifyClass} ${compact ? 'py-1.5 px-2' : 'py-2.5 px-4'}`}>
      <div
        onClick={cycle}
        className={cn(
          'flex items-center gap-2 rounded-lg border-2 shadow-sm',
          compact ? 'px-3 py-1.5' : 'px-5 py-2.5',
          'bg-sky-50 border-sky-300',
          interactive && 'cursor-pointer hover:shadow-md hover:border-sky-400 transition-all'
        )}
        title={interactive ? 'Clique para mudar posicao da mesa' : undefined}
      >
        <User className={compact ? 'size-3.5 text-sky-600' : 'size-5 text-sky-600'} />
        <span className={`${compact ? 'text-[9px]' : 'text-xs'} font-bold text-sky-700`}>Mesa do Professor</span>
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
  const isHorizontal = wall === 'top' || wall === 'bottom'
  const sorted = [...elements].sort((a, b) => a.position - b.position)

  return (
    <div className={cn(
      'flex items-center gap-1.5',
      isHorizontal ? 'flex-row justify-center' : 'flex-col justify-center',
      compact ? 'p-1' : 'p-1.5'
    )}>
      {sorted.map(el => (
        <WallElementIcon
          key={el.id}
          el={el}
          compact={compact}
          interactive={interactive}
          onRemove={interactive && onRemove ? () => onRemove(el.id) : undefined}
        />
      ))}
      {interactive && onAdd && (
        <div className={cn('flex gap-1', isHorizontal ? 'flex-row' : 'flex-col')}>
          <AddButton compact={compact} onClick={() => onAdd(wall, 'porta')} />
          <AddButton compact={compact} onClick={() => onAdd(wall, 'janela')} />
        </div>
      )}
    </div>
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
      wallElements: [...wallElements, { id, type, wall, position }],
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

  const wallThickness = compact ? 'min-h-[32px] min-w-[32px]' : 'min-h-[44px] min-w-[44px]'
  const boardAtTop = config.boardWall === 'top'

  return (
    <div className="classroom-floor bg-amber-50/50 rounded-xl shadow-inner overflow-hidden">
      {/* === LAYOUT: top wall, content, bottom wall with left/right walls === */}
      <div className="flex flex-col">

        {/* TOP WALL */}
        <div className={cn(
          'bg-stone-300/60 border-b-4 border-stone-400 flex items-center justify-center gap-2',
          wallThickness
        )}>
          {boardAtTop && (
            <div
              onClick={handleBoardCycle}
              className={cn(
                'bg-white border-2 border-stone-400 rounded shadow-sm flex items-center justify-center',
                compact ? 'h-5 px-8' : 'h-7 px-16',
                interactive && 'cursor-pointer hover:shadow-md hover:border-stone-500 transition-all'
              )}
              title={interactive ? 'Clique para mover quadro' : undefined}
            >
              <span className={`${compact ? 'text-[7px]' : 'text-[10px]'} font-bold text-stone-500 tracking-widest uppercase`}>
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
          <div className={cn(
            'bg-stone-300/60 border-r-4 border-stone-400 flex flex-col items-center justify-center',
            wallThickness
          )}>
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
          <div className="flex-1 flex flex-col">
            {/* Teacher area (after board) */}
            {boardAtTop && (
              <TeacherArea
                position={config.teacherDesk}
                compact={compact}
                interactive={interactive}
                onPositionChange={handleTeacherPos}
              />
            )}

            {/* Separator line */}
            {boardAtTop && config.teacherDesk !== 'none' && (
              <div className={`mx-4 border-t border-dashed border-stone-300 ${compact ? 'mb-1' : 'mb-2'}`} />
            )}

            {/* Student grid */}
            <div className={compact ? 'p-2' : 'p-3 sm:p-4'}>
              {children}
            </div>

            {/* Teacher area (if board at bottom) */}
            {!boardAtTop && config.teacherDesk !== 'none' && (
              <div className={`mx-4 border-t border-dashed border-stone-300 ${compact ? 'mt-1' : 'mt-2'}`} />
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
          <div className={cn(
            'bg-stone-300/60 border-l-4 border-stone-400 flex flex-col items-center justify-center',
            wallThickness
          )}>
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
        <div className={cn(
          'bg-stone-300/60 border-t-4 border-stone-400 flex items-center justify-center gap-2',
          wallThickness
        )}>
          {!boardAtTop && (
            <div
              onClick={handleBoardCycle}
              className={cn(
                'bg-white border-2 border-stone-400 rounded shadow-sm flex items-center justify-center',
                compact ? 'h-5 px-8' : 'h-7 px-16',
                interactive && 'cursor-pointer hover:shadow-md hover:border-stone-500 transition-all'
              )}
            >
              <span className={`${compact ? 'text-[7px]' : 'text-[10px]'} font-bold text-stone-500 tracking-widest uppercase`}>
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
