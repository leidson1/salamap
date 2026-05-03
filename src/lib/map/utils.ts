import type { DeskNameMode, Grid, GridCell } from '@/types/database'
import { DEFAULT_DESK_LABEL_CONFIG } from '@/types/database'

type StudentLike = {
  id: number
  nome: string
  numero?: number | null
  apelido?: string | null
}

export const DESK_NAME_MODE_LABELS: Record<DeskNameMode, string> = {
  apelido_ou_curto: 'Apelido ou nome curto',
  primeiro_nome: 'Primeiro nome',
  primeiro_e_segundo: 'Dois primeiros nomes',
  primeiro_e_iniciais: 'Primeiro nome + iniciais',
  nome_completo: 'Nome completo',
}

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

function splitName(fullName: string): string[] {
  return fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
}

export function firstName(fullName: string): string {
  return splitName(fullName)[0] || ''
}

export function firstTwoNames(fullName: string): string {
  return splitName(fullName).slice(0, 2).join(' ')
}

/**
 * Nome curto: primeiro nome + iniciais de todos os sobrenomes
 * "Joao Pedro Brito" -> "Joao P. B."
 * "Maria Santos" -> "Maria S."
 * "Pedro" -> "Pedro"
 */
export function shortName(fullName: string): string {
  const parts = splitName(fullName)
  if (parts.length <= 1) return parts[0] || ''
  const first = parts[0]
  const initials = parts.slice(1).map((part) => part[0]?.toUpperCase() + '.').join(' ')
  return `${first} ${initials}`
}

/**
 * Nome de exibicao: usa apelido se existir, senao aplica a regra escolhida.
 */
export function displayName(
  aluno: { nome: string; apelido?: string | null },
  _allAlunos?: Array<{ nome: string; apelido?: string | null }>,
  mode: DeskNameMode = DEFAULT_DESK_LABEL_CONFIG.nameMode
): string {
  if (aluno.apelido?.trim()) return aluno.apelido.trim()

  if (mode === 'primeiro_nome') return firstName(aluno.nome)
  if (mode === 'primeiro_e_segundo') return firstTwoNames(aluno.nome)
  if (mode === 'primeiro_e_iniciais') return shortName(aluno.nome)
  if (mode === 'nome_completo') return aluno.nome.trim()
  return shortName(aluno.nome)
}

export function sortStudentsForPlacement<T extends Pick<StudentLike, 'nome' | 'numero'>>(alunos: T[]): T[] {
  return [...alunos].sort((a, b) => {
    const numeroA = a.numero ?? Number.MAX_SAFE_INTEGER
    const numeroB = b.numero ?? Number.MAX_SAFE_INTEGER
    if (numeroA !== numeroB) return numeroA - numeroB
    return a.nome.localeCompare(b.nome, 'pt-BR')
  })
}

export function getSeatPositions(grid: Grid, boardWall: 'top' | 'bottom' = 'top') {
  const rowIndexes = Array.from({ length: grid.length }, (_, index) => index)
  if (boardWall === 'bottom') rowIndexes.reverse()

  const positions: Array<{ row: number; col: number }> = []

  for (const rowIndex of rowIndexes) {
    const row = grid[rowIndex] ?? []
    for (let col = 0; col < row.length; col++) {
      if (row[col]?.tipo === 'carteira') {
        positions.push({ row: rowIndex, col })
      }
    }
  }

  return positions
}

export function autoPlaceStudents<T extends StudentLike>(
  grid: Grid,
  alunos: T[],
  boardWall: 'top' | 'bottom' = 'top'
) {
  const nextGrid = grid.map((row) =>
    row.map((cell) => ({
      ...cell,
      alunoId: cell.tipo === 'carteira' ? null : cell.alunoId,
    }))
  )
  const orderedStudents = sortStudentsForPlacement(alunos)
  const seatPositions = getSeatPositions(nextGrid, boardWall)
  const placedCount = Math.min(orderedStudents.length, seatPositions.length)

  for (let index = 0; index < placedCount; index++) {
    const seat = seatPositions[index]
    nextGrid[seat.row][seat.col].alunoId = orderedStudents[index].id
  }

  return {
    grid: nextGrid,
    placedCount,
    unplacedCount: Math.max(0, orderedStudents.length - placedCount),
    emptySeatCount: Math.max(0, seatPositions.length - placedCount),
    totalSeats: seatPositions.length,
  }
}
