'use client'

interface ClassroomFrameProps {
  children: React.ReactNode
  compact?: boolean
}

export function ClassroomFrame({ children, compact = false }: ClassroomFrameProps) {
  const padding = compact ? 'p-3 sm:p-4' : 'p-4 sm:p-6'

  return (
    <div className={`relative classroom-floor bg-amber-50/50 border-[5px] border-stone-400 rounded-xl ${padding} shadow-inner`}>
      {children}
    </div>
  )
}
