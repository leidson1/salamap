import type { RoomConfig, WallElement, WallSide } from '@/types/database'
import { DEFAULT_ROOM_CONFIG } from '@/types/database'

export const WALL_SIDES: WallSide[] = ['top', 'right', 'bottom', 'left']

export const WALL_SIDE_LABELS: Record<WallSide, string> = {
  top: 'Parede superior',
  right: 'Parede direita',
  bottom: 'Parede inferior',
  left: 'Parede esquerda',
}

export const TEACHER_DESK_LABELS: Record<RoomConfig['teacherDesk'], string> = {
  left: 'Esquerda',
  center: 'Centro',
  right: 'Direita',
  none: 'Sem mesa',
}

export const WALL_ELEMENT_TYPE_LABELS: Record<WallElement['type'], string> = {
  porta: 'Porta',
  janela: 'Janela',
}

const POSITION_STEPS = [15, 35, 50, 65, 85]

function cloneDefaultWallElements() {
  return DEFAULT_ROOM_CONFIG.wallElements.map((element) => ({ ...element }))
}

function createElementId(type: WallElement['type']) {
  const token = Math.random().toString(36).slice(2, 8)
  return `${type}-${token}`
}

export function clampWallPosition(position: number) {
  return Math.max(5, Math.min(95, Math.round(position / 5) * 5))
}

export function normalizeWallElement(element: Partial<WallElement> | null | undefined): WallElement | null {
  if (!element || (element.type !== 'porta' && element.type !== 'janela')) {
    return null
  }

  const wall = WALL_SIDES.includes(element.wall as WallSide)
    ? element.wall as WallSide
    : 'left'

  const rawSize = typeof element.size === 'number' ? element.size : 2
  const size = (rawSize >= 1 && rawSize <= 3 ? rawSize : 2) as 1 | 2 | 3

  return {
    id: element.id || createElementId(element.type),
    type: element.type,
    wall,
    position: clampWallPosition(typeof element.position === 'number' ? element.position : 50),
    size,
  }
}

export function normalizeRoomConfig(config?: RoomConfig | null): RoomConfig {
  if (!config) {
    return {
      boardWall: DEFAULT_ROOM_CONFIG.boardWall,
      boardLabel: DEFAULT_ROOM_CONFIG.boardLabel,
      teacherDesk: DEFAULT_ROOM_CONFIG.teacherDesk,
      wallElements: cloneDefaultWallElements(),
    }
  }

  const hasExplicitWallElements = Array.isArray(config.wallElements)
  const wallElements = (hasExplicitWallElements ? config.wallElements : cloneDefaultWallElements())
    .map((element) => normalizeWallElement(element))
    .filter((element): element is WallElement => element !== null)

  return {
    boardWall: config.boardWall === 'bottom' ? 'bottom' : DEFAULT_ROOM_CONFIG.boardWall,
    boardLabel: config.boardLabel?.trim() || DEFAULT_ROOM_CONFIG.boardLabel,
    teacherDesk: config.teacherDesk && config.teacherDesk in TEACHER_DESK_LABELS
      ? config.teacherDesk
      : DEFAULT_ROOM_CONFIG.teacherDesk,
    wallElements,
  }
}

function nextWallPosition(elements: WallElement[]) {
  const usedPositions = new Set(elements.map((element) => clampWallPosition(element.position)))
  const available = POSITION_STEPS.find((position) => !usedPositions.has(position))
  return available ?? clampWallPosition(50 + elements.length * 10)
}

export function createWallElement(type: WallElement['type'], wall: WallSide, position?: number, size?: 1 | 2 | 3): WallElement {
  return {
    id: createElementId(type),
    type,
    wall,
    position: clampWallPosition(position ?? 50),
    size: size ?? 2,
  }
}

export function addWallElement(config: RoomConfig, type: WallElement['type'], wall: WallSide) {
  const wallElements = config.wallElements.filter((element) => element.wall === wall)
  const newElement = createWallElement(type, wall, nextWallPosition(wallElements))

  return {
    ...config,
    wallElements: [...config.wallElements, newElement],
  }
}

export function updateWallElement(
  config: RoomConfig,
  id: string,
  patch: Partial<Pick<WallElement, 'type' | 'wall' | 'position' | 'size'>>
) {
  return {
    ...config,
    wallElements: config.wallElements.map((element) =>
      element.id === id
        ? {
          ...element,
          ...patch,
          position: clampWallPosition(patch.position ?? element.position),
          size: patch.size ?? element.size ?? 2,
        }
        : element
    ),
  }
}

export function removeWallElement(config: RoomConfig, id: string) {
  return {
    ...config,
    wallElements: config.wallElements.filter((element) => element.id !== id),
  }
}

export function applyRoomPreset(
  config: RoomConfig,
  preset: 'padrao' | 'corredor' | 'laboratorio'
) {
  const boardLabel = config.boardLabel?.trim() || DEFAULT_ROOM_CONFIG.boardLabel

  if (preset === 'corredor') {
    return normalizeRoomConfig({
      boardWall: 'top',
      boardLabel,
      teacherDesk: 'left',
      wallElements: [
        createWallElement('porta', 'right', 20),
        createWallElement('porta', 'bottom', 82),
        createWallElement('janela', 'left', 20),
        createWallElement('janela', 'left', 50),
        createWallElement('janela', 'left', 80),
      ],
    })
  }

  if (preset === 'laboratorio') {
    return normalizeRoomConfig({
      boardWall: 'top',
      boardLabel,
      teacherDesk: 'center',
      wallElements: [
        createWallElement('porta', 'bottom', 85),
        createWallElement('janela', 'left', 25),
        createWallElement('janela', 'right', 25),
        createWallElement('janela', 'left', 70),
        createWallElement('janela', 'right', 70),
      ],
    })
  }

  return normalizeRoomConfig({
    boardWall: 'top',
    boardLabel,
    teacherDesk: 'center',
    wallElements: [
      createWallElement('porta', 'bottom', 12),
      createWallElement('janela', 'left', 25),
      createWallElement('janela', 'left', 50),
      createWallElement('janela', 'left', 75),
    ],
  })
}
