import type { Grid, GridCell } from '@/types/database'

export const LAYOUT_OPTIONS = [
  { value: 'tradicional', label: 'Fileiras', description: 'Carteiras individuais em linhas continuas.' },
  { value: 'duplas', label: 'Duplas', description: 'Blocos de 2 lugares lado a lado.' },
  { value: 'corredor-central', label: 'Corredor Central', description: 'Fileiras com um corredor no meio da sala.' },
  { value: 'u', label: 'Formato U', description: 'Mesa em U com area central livre.' },
  { value: 'grupos', label: 'Ilhas de 4', description: 'Grupos de trabalho com 4 lugares.' },
  { value: 'bancadas', label: 'Bancadas', description: 'Mesas de laboratorio em blocos largos e profundos.' },
] as const

export type LayoutPreset = typeof LAYOUT_OPTIONS[number]['value']

function cell(tipo: GridCell['tipo'], blocoId: string | null = null, rotacao?: 0 | 90 | 180 | 270): GridCell {
  const c: GridCell = { tipo, alunoId: null, blocoId }
  if (rotacao) c.rotacao = rotacao
  return c
}

function soloId(row: number, col: number) {
  return `solo-${row}-${col}`
}

function pairId(row: number, col: number) {
  return `dupla-${row}-${Math.floor(col / 2)}`
}

function groupId(row: number, col: number) {
  return `grupo-${Math.floor(row / 3)}-${Math.floor(col / 3)}`
}

function benchId(row: number, col: number) {
  return `bancada-${Math.floor(row / 3)}-${Math.floor(col / 5)}`
}

export function generateTradicional(linhas: number, colunas: number): Grid {
  const grid: Grid = []
  for (let r = 0; r < linhas; r++) {
    const row: GridCell[] = []
    for (let c = 0; c < colunas; c++) {
      row.push(cell('carteira', soloId(r, c)))
    }
    grid.push(row)
  }
  return grid
}

export function generateDuplas(linhas: number, colunas: number): Grid {
  const grid: Grid = []
  for (let r = 0; r < linhas; r++) {
    const row: GridCell[] = []
    for (let c = 0; c < colunas; c++) {
      const pairSlot = c % 3
      if (pairSlot === 2) {
        row.push(cell('vazio'))
      } else {
        row.push(cell('carteira', pairId(r, c - pairSlot)))
      }
    }
    grid.push(row)
  }
  return grid
}

export function generateCorredorCentral(linhas: number, colunas: number): Grid {
  const centerStart = Math.floor((colunas - 1) / 2)
  const centerEnd = colunas % 2 === 0 ? centerStart + 1 : centerStart
  const grid: Grid = []

  for (let r = 0; r < linhas; r++) {
    const row: GridCell[] = []
    for (let c = 0; c < colunas; c++) {
      if (c >= centerStart && c <= centerEnd) {
        row.push(cell('vazio'))
      } else {
        row.push(cell('carteira', soloId(r, c)))
      }
    }
    grid.push(row)
  }

  return grid
}

export function generateU(linhas: number, colunas: number): Grid {
  const grid: Grid = []
  for (let r = 0; r < linhas; r++) {
    const row: GridCell[] = []
    for (let c = 0; c < colunas; c++) {
      const isTop = r === 0
      const isLeft = c === 0
      const isRight = c === colunas - 1
      const isEdge = isTop || isLeft || isRight

      if (!isEdge) {
        row.push(cell('vazio'))
      } else {
        // Cadeiras apontam pro centro do U
        const rot: 0 | 90 | 180 | 270 = isTop ? 180
          : isLeft ? 270
          : isRight ? 90
          : 0
        row.push(cell('carteira', soloId(r, c), rot))
      }
    }
    grid.push(row)
  }
  return grid
}

export function generateGrupos(linhas: number, colunas: number): Grid {
  const grid: Grid = []
  for (let r = 0; r < linhas; r++) {
    const row: GridCell[] = []
    for (let c = 0; c < colunas; c++) {
      const groupR = Math.floor(r / 3)
      const groupC = Math.floor(c / 3)
      const inGroupR = r - groupR * 3
      const inGroupC = c - groupC * 3
      const isDesk = inGroupR < 2 && inGroupC < 2
      row.push(isDesk ? cell('carteira', groupId(r, c)) : cell('vazio'))
    }
    grid.push(row)
  }
  return grid
}

export function generateBancadas(linhas: number, colunas: number): Grid {
  const grid: Grid = []

  for (let r = 0; r < linhas; r++) {
    const row: GridCell[] = []
    const inBenchRow = r % 3 !== 2

    for (let c = 0; c < colunas; c++) {
      const inBenchCol = c % 5 < 4
      if (inBenchRow && inBenchCol) {
        row.push(cell('carteira', benchId(r, c)))
      } else {
        row.push(cell('vazio'))
      }
    }

    grid.push(row)
  }

  return grid
}

export function getLayoutGenerator(layout: string) {
  switch (layout) {
    case 'duplas':
      return generateDuplas
    case 'corredor-central':
      return generateCorredorCentral
    case 'u':
      return generateU
    case 'grupos':
      return generateGrupos
    case 'bancadas':
      return generateBancadas
    default:
      return generateTradicional
  }
}

export function generateEmptyGrid(linhas: number, colunas: number): Grid {
  return generateTradicional(linhas, colunas)
}

export function clearStudentsFromGrid(grid: Grid): Grid {
  return grid.map(row =>
    row.map(c => ({
      ...c,
      alunoId: null,
    }))
  )
}

export function clearAllFurniture(linhas: number, colunas: number): Grid {
  return Array.from({ length: linhas }, () =>
    Array.from({ length: colunas }, () => ({
      tipo: 'vazio' as const,
      alunoId: null,
      blocoId: null,
    }))
  )
}
