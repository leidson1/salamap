import type { Grid, GridCell } from '@/types/database'

function cell(tipo: GridCell['tipo']): GridCell {
  return { tipo, alunoId: null }
}

export function generateTradicional(linhas: number, colunas: number): Grid {
  const grid: Grid = []
  for (let r = 0; r < linhas; r++) {
    const row: GridCell[] = []
    for (let c = 0; c < colunas; c++) {
      row.push(cell('carteira'))
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
      const isEdge = r === 0 || c === 0 || c === colunas - 1
      row.push(isEdge ? cell('carteira') : cell('vazio'))
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
      row.push(isDesk ? cell('carteira') : cell('vazio'))
    }
    grid.push(row)
  }
  return grid
}

export function generateEmptyGrid(linhas: number, colunas: number): Grid {
  return generateTradicional(linhas, colunas)
}

export function clearStudentsFromGrid(grid: Grid): Grid {
  return grid.map(row =>
    row.map(c => ({
      ...c,
      alunoId: c.tipo === 'carteira' ? null : c.alunoId,
    }))
  )
}
