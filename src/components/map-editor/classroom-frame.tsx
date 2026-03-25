'use client'

import type { RoomConfig } from '@/types/database'
import { DEFAULT_ROOM_CONFIG } from '@/types/database'

interface ClassroomFrameProps {
  roomConfig?: RoomConfig | null
  children: React.ReactNode
  compact?: boolean
  interactive?: boolean
  onRoomConfigChange?: (config: RoomConfig) => void
}

export function ClassroomFrame({
  roomConfig,
  children,
  compact = false,
  interactive = false,
  onRoomConfigChange,
}: ClassroomFrameProps) {
  const config = roomConfig ?? DEFAULT_ROOM_CONFIG
  const windowCount = Math.max(0, Math.min(5, config.windowCount))

  const cycleBoard = () => {
    if (!interactive || !onRoomConfigChange) return
    const walls: Array<RoomConfig['boardWall']> = ['top', 'bottom']
    const idx = walls.indexOf(config.boardWall)
    onRoomConfigChange({ ...config, boardWall: walls[(idx + 1) % walls.length] })
  }

  const cycleDoor = () => {
    if (!interactive || !onRoomConfigChange) return
    const positions: Array<RoomConfig['doorPosition']> = ['bottom-left', 'bottom-right', 'top-left', 'top-right']
    const idx = positions.indexOf(config.doorPosition)
    onRoomConfigChange({ ...config, doorPosition: positions[(idx + 1) % positions.length] })
  }

  const cycleWindows = () => {
    if (!interactive || !onRoomConfigChange) return
    const walls: Array<RoomConfig['windowWall']> = ['left', 'right', 'none']
    const idx = walls.indexOf(config.windowWall)
    onRoomConfigChange({ ...config, windowWall: walls[(idx + 1) % walls.length] })
  }

  const boardSize = compact ? 'h-5' : 'h-7'
  const doorW = compact ? 'w-10' : 'w-14'
  const doorH = compact ? 'h-6' : 'h-8'

  // Door position classes
  const doorIsTop = config.doorPosition.startsWith('top')
  const doorIsLeft = config.doorPosition.endsWith('left')

  return (
    <div className="relative classroom-floor bg-amber-50/50 border-[5px] border-stone-400 rounded-xl shadow-inner">

      {/* ===== QUADRO (whiteboard) ===== */}
      <div
        className={`absolute ${config.boardWall === 'top' ? 'top-0 -translate-y-1/2' : 'bottom-0 translate-y-1/2'} left-1/2 -translate-x-1/2 z-10`}
        onClick={cycleBoard}
        title={interactive ? 'Clique para mudar parede do quadro' : undefined}
      >
        <div className={`${boardSize} px-8 sm:px-14 bg-white border-2 border-stone-300 rounded shadow-sm flex items-center justify-center ${interactive ? 'cursor-pointer hover:border-stone-400 hover:shadow-md transition-all' : ''}`}>
          <span className={`${compact ? 'text-[7px]' : 'text-[9px]'} font-semibold text-stone-400 tracking-widest uppercase`}>
            {config.boardLabel}
          </span>
        </div>
      </div>

      {/* ===== PORTA (door) ===== */}
      <div
        className={`absolute z-10 ${doorIsTop ? 'top-0 -translate-y-1/2' : 'bottom-0 translate-y-1/2'} ${doorIsLeft ? 'left-4 sm:left-6' : 'right-4 sm:right-6'}`}
        onClick={cycleDoor}
        title={interactive ? 'Clique para mudar posicao da porta' : undefined}
      >
        <div className={`${doorW} ${doorH} bg-amber-800/20 border-2 border-amber-700/50 rounded flex items-center justify-center ${interactive ? 'cursor-pointer hover:bg-amber-800/30 hover:border-amber-700 transition-all' : ''}`}>
          <div className="text-center">
            <svg className={`${compact ? 'w-3 h-3' : 'w-4 h-4'} mx-auto text-amber-800`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 21V3h12l6 3v15H3z" />
              <circle cx="15" cy="12" r="1" fill="currentColor" />
            </svg>
            <span className={`${compact ? 'text-[6px]' : 'text-[8px]'} font-bold text-amber-800 block`}>Porta</span>
          </div>
        </div>
      </div>

      {/* ===== JANELAS (windows) - left wall ===== */}
      {config.windowWall === 'left' && windowCount > 0 && (
        <div
          className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col z-10 ${compact ? 'gap-2' : 'gap-3'}`}
          onClick={cycleWindows}
          title={interactive ? 'Clique para mudar parede das janelas' : undefined}
        >
          {Array.from({ length: windowCount }).map((_, i) => (
            <div
              key={i}
              className={`${compact ? 'w-3 h-7' : 'w-3.5 h-9'} bg-sky-200/80 border-2 border-sky-400/70 rounded-sm shadow-sm ${interactive ? 'cursor-pointer hover:bg-sky-300/80 transition-colors' : ''}`}
            />
          ))}
        </div>
      )}

      {/* ===== JANELAS (windows) - right wall ===== */}
      {config.windowWall === 'right' && windowCount > 0 && (
        <div
          className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 flex flex-col z-10 ${compact ? 'gap-2' : 'gap-3'}`}
          onClick={cycleWindows}
          title={interactive ? 'Clique para mudar parede das janelas' : undefined}
        >
          {Array.from({ length: windowCount }).map((_, i) => (
            <div
              key={i}
              className={`${compact ? 'w-3 h-7' : 'w-3.5 h-9'} bg-sky-200/80 border-2 border-sky-400/70 rounded-sm shadow-sm ${interactive ? 'cursor-pointer hover:bg-sky-300/80 transition-colors' : ''}`}
            />
          ))}
        </div>
      )}

      {/* ===== GRID CONTENT ===== */}
      <div className={compact ? 'p-3 pt-5 pb-5 sm:p-4 sm:pt-6 sm:pb-6' : 'p-5 pt-8 pb-8 sm:p-7 sm:pt-10 sm:pb-10'}>
        {children}
      </div>
    </div>
  )
}
