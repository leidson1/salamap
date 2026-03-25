'use client'

import type { RoomConfig } from '@/types/database'
import { DEFAULT_ROOM_CONFIG } from '@/types/database'

interface ClassroomFrameProps {
  roomConfig?: RoomConfig | null
  children: React.ReactNode
  compact?: boolean
}

function DoorArc({ position, compact }: { position: string; compact?: boolean }) {
  const size = compact ? 20 : 28
  const isBottom = position.startsWith('bottom')
  const isLeft = position.endsWith('left')

  // Rotate the arc based on position
  let rotate = ''
  if (isBottom && isLeft) rotate = 'rotate(0)'
  else if (isBottom && !isLeft) rotate = 'rotate(90)'
  else if (!isBottom && isLeft) rotate = 'rotate(-90)'
  else rotate = 'rotate(180)'

  const posClass = [
    isBottom ? 'bottom-0' : 'top-0',
    isLeft ? 'left-0' : 'right-0',
  ].join(' ')

  return (
    <div className={`absolute ${posClass} z-10`} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 30 30"
        className="text-stone-400"
        style={{ transform: rotate, transformOrigin: 'center' }}
      >
        <path
          d="M0,30 A30,30 0 0,1 30,0"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeDasharray="4 3"
        />
        {/* Door opening indicator */}
        <rect x="0" y="28" width="8" height="3" fill="currentColor" rx="1" />
      </svg>
    </div>
  )
}

function Window({ compact }: { compact?: boolean }) {
  return (
    <div
      className={`${compact ? 'w-2 h-6' : 'w-2.5 h-8'} bg-sky-200/70 border border-sky-400/60 rounded-sm`}
    />
  )
}

export function ClassroomFrame({ roomConfig, children, compact = false }: ClassroomFrameProps) {
  const config = roomConfig ?? DEFAULT_ROOM_CONFIG
  const windowCount = Math.max(0, Math.min(5, config.windowCount))
  const padding = compact ? 'pt-10 pb-8 px-4 sm:px-5' : 'pt-12 pb-10 px-5 sm:px-8'

  return (
    <div className={`relative classroom-floor bg-amber-50/50 border-[5px] border-stone-400 rounded-xl ${padding} shadow-inner`}>
      {/* Whiteboard / Quadro */}
      <div className="absolute top-2.5 left-1/2 -translate-x-1/2 flex items-center justify-center">
        <div className={`${compact ? 'h-5 px-6' : 'h-6 px-10'} bg-white border-2 border-stone-300 rounded-sm shadow-sm flex items-center`}>
          <span className={`${compact ? 'text-[8px]' : 'text-[10px]'} font-medium text-stone-400 tracking-wider uppercase`}>
            {config.boardLabel}
          </span>
        </div>
      </div>

      {/* Windows - Left wall */}
      {config.windowWall === 'left' && windowCount > 0 && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-[3px] flex flex-col gap-3 sm:gap-4">
          {Array.from({ length: windowCount }).map((_, i) => (
            <Window key={i} compact={compact} />
          ))}
        </div>
      )}

      {/* Windows - Right wall */}
      {config.windowWall === 'right' && windowCount > 0 && (
        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-[3px] flex flex-col gap-3 sm:gap-4">
          {Array.from({ length: windowCount }).map((_, i) => (
            <Window key={i} compact={compact} />
          ))}
        </div>
      )}

      {/* Door */}
      <DoorArc position={config.doorPosition} compact={compact} />

      {/* Grid content */}
      <div className="relative z-0">
        {children}
      </div>
    </div>
  )
}
