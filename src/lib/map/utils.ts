import type { Grid, GridCell } from '@/types/database'

export function resizeGrid(
  oldGrid: Grid,
  newLinhas: number,
  newColunas: number
): Grid {
  const grid: Grid = []
  for (let r = 0; r < newLinhas; r++) {
    const row: GridCell[] = []
    for (let c = 0; c < newColunas; c++) {
      if (r < oldGrid.length && c < (oldGrid[r]?.length ?? 0)) {
        row.push({ ...oldGrid[r][c] })
      } else {
        row.push({ tipo: 'carteira', alunoId: null })
      }
    }
    grid.push(row)
  }
  return grid
}

export function getPlacedStudentIds(grid: Grid): number[] {
  const ids: number[] = []
  for (const row of grid) {
    for (const cell of row) {
      if (cell.alunoId !== null) {
        ids.push(cell.alunoId)
      }
    }
  }
  return ids
}

export function findStudentPosition(
  grid: Grid,
  alunoId: number
): { row: number; col: number } | null {
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (grid[r][c].alunoId === alunoId) {
        return { row: r, col: c }
      }
    }
  }
  return null
}

export function generateShareCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let code = ''
  const array = new Uint8Array(8)
  crypto.getRandomValues(array)
  for (const byte of array) {
    code += chars[byte % chars.length]
  }
  return code
}
