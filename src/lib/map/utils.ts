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
 * Nome curto para exibição: "João S." ou "Maria" (se não tem sobrenome)
 */
export function shortName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length <= 1) return parts[0] || ''
  const first = parts[0]
  const lastInitial = parts[parts.length - 1][0]?.toUpperCase()
  return lastInitial ? `${first} ${lastInitial}.` : first
}

/**
 * Nome de exibição: usa apelido se existir, senão nome curto inteligente.
 * Quando há nomes duplicados, expande as iniciais pra diferenciar.
 */
export function displayName(aluno: { nome: string; apelido?: string | null }, allAlunos?: Array<{ nome: string; apelido?: string | null }>): string {
  // Se tem apelido, usa direto
  if (aluno.apelido?.trim()) return aluno.apelido.trim()

  const parts = aluno.nome.trim().split(/\s+/)
  if (parts.length <= 1) return parts[0] || ''

  const firstName = parts[0]

  // Se não tem lista pra comparar, usa shortName padrão
  if (!allAlunos || allAlunos.length === 0) return shortName(aluno.nome)

  // Verifica se há outros com mesmo primeiro nome (sem apelido)
  const sameFirst = allAlunos.filter(a =>
    !a.apelido?.trim() &&
    a.nome.trim().split(/\s+/)[0] === firstName
  )

  // Se é único, só primeiro nome basta
  if (sameFirst.length <= 1) return firstName

  // Vai expandindo sobrenome até diferenciar
  const restParts = parts.slice(1)
  for (let chars = 1; chars <= 10; chars++) {
    const suffix = restParts.map(p => p.substring(0, chars)).join(' ')
    const candidate = `${firstName} ${suffix}.`

    const othersWithSame = sameFirst.filter(a => {
      if (a.nome === aluno.nome) return false
      const oParts = a.nome.trim().split(/\s+/)
      const oRest = oParts.slice(1)
      const oSuffix = oRest.map(p => p.substring(0, chars)).join(' ')
      return `${oParts[0]} ${oSuffix}.` === candidate
    })

    if (othersWithSame.length === 0) return candidate
  }

  // Fallback: nome completo
  return aluno.nome
}
