export type { CellType, GridCell, Grid } from '@/types/database'

export interface MapLayout {
  linhas: number
  colunas: number
  layout_tipo: 'tradicional' | 'u' | 'grupos'
  grid: import('@/types/database').Grid
  mesa_professor: { linha: number; coluna: number } | null
}
