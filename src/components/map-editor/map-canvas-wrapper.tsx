'use client'

import dynamic from 'next/dynamic'
import type { Grid, Aluno, RoomConfig } from '@/types/database'

const MapCanvas = dynamic(
  () => import('./map-canvas').then((mod) => mod.MapCanvas),
  { ssr: false, loading: () => (
    <div className="w-full h-96 bg-amber-50/50 rounded-xl border-2 border-stone-300 flex items-center justify-center">
      <div className="text-sm text-muted-foreground animate-pulse">Carregando editor...</div>
    </div>
  )}
)

interface MapCanvasWrapperProps {
  grid: Grid
  colunas: number
  linhas: number
  alunos: Aluno[]
  roomConfig?: RoomConfig | null
  mode: 'alunos' | 'mobiliar'
  selectedStudentId?: number | null
  onStudentPlace: (alunoId: number, row: number, col: number) => void
  onStudentRemove: (row: number, col: number) => void
  onCellSwap: (fromR: number, fromC: number, toR: number, toC: number) => void
  onToggleCell: (row: number, col: number) => void
  onRoomConfigChange?: (config: RoomConfig) => void
}

export function MapCanvasWrapper(props: MapCanvasWrapperProps) {
  return <MapCanvas {...props} />
}
