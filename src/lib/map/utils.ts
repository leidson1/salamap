import type { Grid, GridCell } from '@/types/database'

export function createSoloBlockId(row: number, col: number): string {
  return `solo-${row}-${col}`
}

export function getCellBlockId(
  cell: GridCell | undefined,
  row: number,
  col: number
): string | null {
  if (!cell || cell.tipo !== 'carteira') return null
  return cell.blocoId ?? createSoloBlockId(row, col)
}

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
        row.push({ tipo: 'carteira', alunoId: null, blocoId: createSoloBlockId(r, c) })
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

/**
 * Nome curto: primeiro nome + iniciais de todos os sobrenomes
 * "João Pedro Brito" → "João P. B."
 * "Maria Santos" → "Maria S."
 * "Pedro" → "Pedro"
 */
export function shortName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length <= 1) return parts[0] || ''
  const first = parts[0]
  const initials = parts.slice(1).map(p => p[0]?.toUpperCase() + '.').join(' ')
  return `${first} ${initials}`
}

/**
 * Nome de exibição: usa apelido se existir, senão nome curto.
 */
export function displayName(aluno: { nome: string; apelido?: string | null }, _allAlunos?: Array<{ nome: string; apelido?: string | null }>): string {
  if (aluno.apelido?.trim()) return aluno.apelido.trim()
  return shortName(aluno.nome)
}
