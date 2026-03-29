import type { Grid, GridCell } from '@/types/database'
import { createSoloBlockId, getCellBlockId } from '@/lib/map/utils'

export const FURNITURE_TOOLS = [
  { value: 'move', label: 'Mover', description: 'Arraste blocos inteiros de mobiliario.' },
  { value: 'custom-block', label: 'Compositor', description: 'Cria fileiras, grupos e bancadas parametrizadas.' },
  { value: 'solo', label: '1 lugar', description: 'Insere uma carteira individual.' },
  { value: 'dupla-h', label: 'Dupla H', description: 'Bloco horizontal com 2 lugares.' },
  { value: 'dupla-v', label: 'Dupla V', description: 'Bloco vertical com 2 lugares.' },
  { value: 'ilha-4', label: 'Ilha 4', description: 'Bloco de 4 lugares em 2x2.' },
  { value: 'corredor', label: 'Corredor', description: 'Abre espaco de circulacao.' },
  { value: 'bloqueio', label: 'Bloqueio', description: 'Marca area indisponivel.' },
  { value: 'apagar', label: 'Apagar', description: 'Remove qualquer mobiliario da area.' },
] as const

export type FurnitureTool = typeof FURNITURE_TOOLS[number]['value']

export const FURNITURE_COMPOSER_PRESETS = [
  {
    value: 'fileira',
    label: 'Fileira',
    description: 'Linha unica de carteiras com tamanho variavel.',
    defaultWidth: 5,
    defaultHeight: 1,
  },
  {
    value: 'grupo',
    label: 'Grupo',
    description: 'Bloco retangular para trabalho em equipe.',
    defaultWidth: 2,
    defaultHeight: 2,
  },
  {
    value: 'bancada',
    label: 'Bancada',
    description: 'Mesa profunda para laboratorio ou oficina.',
    defaultWidth: 4,
    defaultHeight: 2,
  },
] as const

export type FurnitureComposerKind = typeof FURNITURE_COMPOSER_PRESETS[number]['value']

export interface FurnitureComposerConfig {
  kind: FurnitureComposerKind
  width: number
  height: number
}

export const DEFAULT_FURNITURE_COMPOSER_CONFIG: FurnitureComposerConfig = {
  kind: 'fileira',
  width: 5,
  height: 1,
}

export interface FurnitureBlockDetails {
  blockId: string
  label: string
  seats: number
  occupiedSeats: number
  width: number
  height: number
  minRow: number
  maxRow: number
  minCol: number
  maxCol: number
}

function cloneGrid(grid: Grid): Grid {
  return grid.map((row) => row.map((cell) => ({ ...cell })))
}

function createBlockId(prefix: string, row: number, col: number) {
  return `${prefix}-${row}-${col}-${Math.random().toString(36).slice(2, 6)}`
}

function setDesk(cell: GridCell, blocoId: string) {
  cell.tipo = 'carteira'
  cell.alunoId = null
  cell.blocoId = blocoId
}

function setEmpty(cell: GridCell) {
  cell.tipo = 'vazio'
  cell.alunoId = null
  cell.blocoId = null
}

function setBlocked(cell: GridCell) {
  cell.tipo = 'bloqueado'
  cell.alunoId = null
  cell.blocoId = null
}

export function normalizeFurnitureComposerConfig(
  config?: Partial<FurnitureComposerConfig> | null
): FurnitureComposerConfig {
  const kind = FURNITURE_COMPOSER_PRESETS.some((preset) => preset.value === config?.kind)
    ? (config?.kind as FurnitureComposerKind)
    : DEFAULT_FURNITURE_COMPOSER_CONFIG.kind

  const width = typeof config?.width === 'number' ? Math.round(config.width) : DEFAULT_FURNITURE_COMPOSER_CONFIG.width
  const height = typeof config?.height === 'number' ? Math.round(config.height) : DEFAULT_FURNITURE_COMPOSER_CONFIG.height

  switch (kind) {
    case 'grupo':
      return {
        kind,
        width: Math.min(4, Math.max(2, width)),
        height: Math.min(4, Math.max(2, height)),
      }
    case 'bancada':
      return {
        kind,
        width: Math.min(8, Math.max(3, width)),
        height: 2,
      }
    default:
      return {
        kind: 'fileira',
        width: Math.min(8, Math.max(2, width)),
        height: 1,
      }
  }
}

function getComposerPattern(config: FurnitureComposerConfig) {
  const pattern: Array<{ rowOffset: number; colOffset: number; type: 'carteira' }> = []

  for (let rowOffset = 0; rowOffset < config.height; rowOffset++) {
    for (let colOffset = 0; colOffset < config.width; colOffset++) {
      pattern.push({ rowOffset, colOffset, type: 'carteira' })
    }
  }

  return pattern
}

function getStampPattern(
  tool: FurnitureTool,
  composerConfig?: FurnitureComposerConfig
): Array<{ rowOffset: number; colOffset: number; type: 'carteira' | 'vazio' | 'bloqueado' }> {
  switch (tool) {
    case 'custom-block':
      return getComposerPattern(normalizeFurnitureComposerConfig(composerConfig))
    case 'solo':
      return [{ rowOffset: 0, colOffset: 0, type: 'carteira' }]
    case 'dupla-h':
      return [
        { rowOffset: 0, colOffset: 0, type: 'carteira' },
        { rowOffset: 0, colOffset: 1, type: 'carteira' },
      ]
    case 'dupla-v':
      return [
        { rowOffset: 0, colOffset: 0, type: 'carteira' },
        { rowOffset: 1, colOffset: 0, type: 'carteira' },
      ]
    case 'ilha-4':
      return [
        { rowOffset: 0, colOffset: 0, type: 'carteira' },
        { rowOffset: 0, colOffset: 1, type: 'carteira' },
        { rowOffset: 1, colOffset: 0, type: 'carteira' },
        { rowOffset: 1, colOffset: 1, type: 'carteira' },
      ]
    case 'corredor':
    case 'apagar':
      return [{ rowOffset: 0, colOffset: 0, type: 'vazio' }]
    case 'bloqueio':
      return [{ rowOffset: 0, colOffset: 0, type: 'bloqueado' }]
    default:
      return []
  }
}

export function applyFurnitureTool(
  grid: Grid,
  row: number,
  col: number,
  tool: FurnitureTool,
  composerConfig?: FurnitureComposerConfig
): Grid {
  if (tool === 'move') return grid

  const normalizedComposer = normalizeFurnitureComposerConfig(composerConfig)
  const pattern = getStampPattern(tool, normalizedComposer)
  if (pattern.length === 0) return grid

  const nextGrid = cloneGrid(grid)
  const blockId = tool === 'solo' || tool === 'dupla-h' || tool === 'dupla-v' || tool === 'ilha-4' || tool === 'custom-block'
    ? createBlockId(tool === 'custom-block' ? normalizedComposer.kind : tool, row, col)
    : null

  for (const item of pattern) {
    const targetRow = row + item.rowOffset
    const targetCol = col + item.colOffset
    const targetCell = grid[targetRow]?.[targetCol]

    if (!targetCell) {
      return grid
    }

    if (targetCell.alunoId !== null) {
      return grid
    }
  }

  for (const item of pattern) {
    const targetRow = row + item.rowOffset
    const targetCol = col + item.colOffset
    const targetCell = nextGrid[targetRow]?.[targetCol]

    if (!targetCell) continue

    if (item.type === 'carteira' && blockId) {
      setDesk(targetCell, blockId)
    } else if (item.type === 'bloqueado') {
      setBlocked(targetCell)
    } else {
      setEmpty(targetCell)
    }
  }

  return nextGrid
}

interface BlockBounds {
  minRow: number
  maxRow: number
  minCol: number
  maxCol: number
}

function getBlockCells(grid: Grid, row: number, col: number) {
  const blockId = getCellBlockId(grid[row]?.[col], row, col)
  if (!blockId) return []

  return getBlockCellsById(grid, blockId)
}

function getBlockCellsById(grid: Grid, blockId: string) {
  if (!blockId) return []

  const cells: Array<{ row: number; col: number }> = []
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < (grid[r]?.length ?? 0); c++) {
      if (getCellBlockId(grid[r]?.[c], r, c) === blockId) {
        cells.push({ row: r, col: c })
      }
    }
  }
  return cells
}

function getBlockBounds(cells: Array<{ row: number; col: number }>): BlockBounds | null {
  if (cells.length === 0) return null

  return {
    minRow: Math.min(...cells.map((cell) => cell.row)),
    maxRow: Math.max(...cells.map((cell) => cell.row)),
    minCol: Math.min(...cells.map((cell) => cell.col)),
    maxCol: Math.max(...cells.map((cell) => cell.col)),
  }
}

function getBlockLabel(blockId: string, width: number, height: number, seats: number) {
  if (blockId.startsWith('bancada-')) return `Bancada ${width}x${height}`
  if (blockId.startsWith('fileira-')) return `Fileira de ${seats}`
  if (blockId.startsWith('grupo-')) return `Grupo ${height}x${width}`
  if (blockId.startsWith('dupla-h-')) return 'Dupla horizontal'
  if (blockId.startsWith('dupla-v-')) return 'Dupla vertical'
  if (blockId.startsWith('dupla-') && width === 2 && height === 1) return 'Dupla horizontal'
  if (blockId.startsWith('solo-')) return 'Carteira individual'
  if (seats === 1) return 'Carteira individual'
  if (seats === 2 && width === 2 && height === 1) return 'Dupla horizontal'
  if (seats === 2 && width === 1 && height === 2) return 'Dupla vertical'
  if (seats === 4 && width === 2 && height === 2) return 'Ilha de 4'
  if (height === 1) return `Fileira de ${seats}`
  if (width === 1) return `Coluna de ${seats}`
  return `Bloco ${height}x${width}`
}

export function countFurnitureBlocks(grid: Grid) {
  const blockIds = new Set<string>()

  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < (grid[r]?.length ?? 0); c++) {
      const blockId = getCellBlockId(grid[r]?.[c], r, c)
      if (blockId) {
        blockIds.add(blockId)
      }
    }
  }

  return blockIds.size
}

export function getFurnitureBlockDetails(grid: Grid, blockId: string | null | undefined): FurnitureBlockDetails | null {
  if (!blockId) return null

  const cells = getBlockCellsById(grid, blockId)
  const bounds = getBlockBounds(cells)

  if (!bounds) return null

  const seats = cells.length
  const occupiedSeats = cells.reduce((sum, cell) =>
    sum + (grid[cell.row]?.[cell.col]?.alunoId ? 1 : 0)
  , 0)
  const width = bounds.maxCol - bounds.minCol + 1
  const height = bounds.maxRow - bounds.minRow + 1

  return {
    blockId,
    label: getBlockLabel(blockId, width, height, seats),
    seats,
    occupiedSeats,
    width,
    height,
    minRow: bounds.minRow,
    maxRow: bounds.maxRow,
    minCol: bounds.minCol,
    maxCol: bounds.maxCol,
  }
}

export function moveFurnitureBlock(grid: Grid, fromRow: number, fromCol: number, toRow: number, toCol: number): Grid {
  const sourceCells = getBlockCells(grid, fromRow, fromCol)
  const bounds = getBlockBounds(sourceCells)

  if (!bounds) return grid

  const footprintHeight = bounds.maxRow - bounds.minRow + 1
  const footprintWidth = bounds.maxCol - bounds.minCol + 1
  const anchorOffsetRow = fromRow - bounds.minRow
  const anchorOffsetCol = fromCol - bounds.minCol
  const targetMinRow = toRow - anchorOffsetRow
  const targetMinCol = toCol - anchorOffsetCol
  const targetMaxRow = targetMinRow + footprintHeight - 1
  const targetMaxCol = targetMinCol + footprintWidth - 1

  if (
    targetMinRow < 0 ||
    targetMinCol < 0 ||
    targetMaxRow >= grid.length ||
    targetMaxCol >= (grid[0]?.length ?? 0)
  ) {
    return grid
  }

  const nextGrid = cloneGrid(grid)
  const blockId = getCellBlockId(grid[fromRow]?.[fromCol], fromRow, fromCol)

  if (!blockId) return grid

  for (let r = 0; r < footprintHeight; r++) {
    for (let c = 0; c < footprintWidth; c++) {
      const absoluteRow = targetMinRow + r
      const absoluteCol = targetMinCol + c
      const currentBlockId = getCellBlockId(grid[absoluteRow]?.[absoluteCol], absoluteRow, absoluteCol)
      const targetCell = grid[absoluteRow]?.[absoluteCol]

      if (currentBlockId !== blockId && targetCell?.tipo !== 'vazio') {
        return grid
      }
    }
  }

  const sourceFootprint = cloneGrid(
    grid.slice(bounds.minRow, bounds.maxRow + 1).map((row) => row.slice(bounds.minCol, bounds.maxCol + 1))
  )

  for (let r = 0; r < footprintHeight; r++) {
    for (let c = 0; c < footprintWidth; c++) {
      const sourceRow = bounds.minRow + r
      const sourceCol = bounds.minCol + c

      if (getCellBlockId(grid[sourceRow]?.[sourceCol], sourceRow, sourceCol) === blockId) {
        setEmpty(nextGrid[sourceRow][sourceCol])
      }
    }
  }

  for (let r = 0; r < footprintHeight; r++) {
    for (let c = 0; c < footprintWidth; c++) {
      const sourceCell = sourceFootprint[r][c]

      if (sourceCell.tipo === 'carteira') {
        nextGrid[targetMinRow + r][targetMinCol + c] = {
          ...sourceCell,
          blocoId: sourceCell.blocoId ?? createSoloBlockId(targetMinRow + r, targetMinCol + c),
        }
      }
    }
  }

  return nextGrid
}

export function rotateFurnitureBlock(grid: Grid, blockId: string): Grid {
  const block = getFurnitureBlockDetails(grid, blockId)
  if (!block || (block.width === 1 && block.height === 1)) return grid

  const targetHeight = block.width
  const targetWidth = block.height
  const targetMaxRow = block.minRow + targetHeight - 1
  const targetMaxCol = block.minCol + targetWidth - 1

  if (
    targetMaxRow >= grid.length ||
    targetMaxCol >= (grid[0]?.length ?? 0)
  ) {
    return grid
  }

  for (let r = block.minRow; r <= targetMaxRow; r++) {
    for (let c = block.minCol; c <= targetMaxCol; c++) {
      const currentBlockId = getCellBlockId(grid[r]?.[c], r, c)
      if (currentBlockId !== blockId && grid[r]?.[c]?.tipo !== 'vazio') {
        return grid
      }
    }
  }

  const nextGrid = cloneGrid(grid)
  const sourceCells = getBlockCellsById(grid, blockId)

  for (const cell of sourceCells) {
    setEmpty(nextGrid[cell.row][cell.col])
  }

  for (const cell of sourceCells) {
    const localRow = cell.row - block.minRow
    const localCol = cell.col - block.minCol
    const targetRow = block.minRow + localCol
    const targetCol = block.minCol + (block.height - 1 - localRow)
    nextGrid[targetRow][targetCol] = {
      ...grid[cell.row][cell.col],
      tipo: 'carteira',
      blocoId: blockId,
    }
  }

  return nextGrid
}

export function splitFurnitureBlock(grid: Grid, blockId: string): Grid {
  const block = getFurnitureBlockDetails(grid, blockId)
  if (!block || block.seats <= 1) return grid

  const nextGrid = cloneGrid(grid)
  const cells = getBlockCellsById(grid, blockId)

  for (const cell of cells) {
    nextGrid[cell.row][cell.col] = {
      ...nextGrid[cell.row][cell.col],
      tipo: 'carteira',
      blocoId: createSoloBlockId(cell.row, cell.col),
    }
  }

  return nextGrid
}

export function clearFurnitureBlock(grid: Grid, blockId: string): Grid {
  const block = getFurnitureBlockDetails(grid, blockId)
  if (!block) return grid
  if (block.occupiedSeats > 0) return grid

  const nextGrid = cloneGrid(grid)
  const cells = getBlockCellsById(grid, blockId)

  for (const cell of cells) {
    setEmpty(nextGrid[cell.row][cell.col])
  }

  return nextGrid
}

export type FurnitureResizeAction = 'grow-width' | 'shrink-width' | 'grow-depth' | 'shrink-depth'

export function resizeFurnitureBlock(grid: Grid, blockId: string, action: FurnitureResizeAction): Grid {
  const block = getFurnitureBlockDetails(grid, blockId)
  if (!block) return grid

  const nextGrid = cloneGrid(grid)

  if (action === 'grow-width') {
    const targetCol = block.maxCol + 1
    if (targetCol >= (grid[0]?.length ?? 0)) return grid

    for (let row = block.minRow; row <= block.maxRow; row++) {
      if (grid[row]?.[targetCol]?.tipo !== 'vazio') {
        return grid
      }
    }

    for (let row = block.minRow; row <= block.maxRow; row++) {
      setDesk(nextGrid[row][targetCol], blockId)
    }

    return nextGrid
  }

  if (action === 'grow-depth') {
    const targetRow = block.maxRow + 1
    if (targetRow >= grid.length) return grid

    for (let col = block.minCol; col <= block.maxCol; col++) {
      if (grid[targetRow]?.[col]?.tipo !== 'vazio') {
        return grid
      }
    }

    for (let col = block.minCol; col <= block.maxCol; col++) {
      setDesk(nextGrid[targetRow][col], blockId)
    }

    return nextGrid
  }

  if (action === 'shrink-width') {
    if (block.width <= 1) return grid

    for (let row = block.minRow; row <= block.maxRow; row++) {
      if (grid[row]?.[block.maxCol]?.alunoId) {
        return grid
      }
    }

    for (let row = block.minRow; row <= block.maxRow; row++) {
      if (getCellBlockId(grid[row]?.[block.maxCol], row, block.maxCol) === blockId) {
        setEmpty(nextGrid[row][block.maxCol])
      }
    }

    return nextGrid
  }

  if (block.height <= 1) return grid

  for (let col = block.minCol; col <= block.maxCol; col++) {
    if (grid[block.maxRow]?.[col]?.alunoId) {
      return grid
    }
  }

  for (let col = block.minCol; col <= block.maxCol; col++) {
    if (getCellBlockId(grid[block.maxRow]?.[col], block.maxRow, col) === blockId) {
      setEmpty(nextGrid[block.maxRow][col])
    }
  }

  return nextGrid
}
