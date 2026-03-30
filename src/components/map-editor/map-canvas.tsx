'use client'

import { useRef, useCallback, useEffect, useState } from 'react'
import { Stage, Layer, Rect, Group, Text, Line, Circle } from 'react-konva'
import type Konva from 'konva'
import type { FurnitureTool } from '@/lib/map/furniture-tools'
import type { Grid, Aluno, RoomConfig } from '@/types/database'
import { clampWallPosition } from '@/lib/map/room-config'
import { getCellBlockId } from '@/lib/map/utils'
import { DEFAULT_ROOM_CONFIG } from '@/types/database'

// Layout constants
const CELL_W = 90
const CELL_H = 78
const CELL_GAP = 10
const WALL_THICKNESS = 30
const TEACHER_AREA_H = 65
const PADDING = 16
const WALL_DRAG_THRESHOLD = 90
const BLOCK_CONNECTOR = CELL_GAP / 2 + 2

interface MapCanvasProps {
  grid: Grid
  colunas: number
  linhas: number
  alunos: Aluno[]
  roomConfig?: RoomConfig | null
  mode: 'alunos' | 'mobiliar' | 'sala'
  furnitureTool: FurnitureTool
  selectedStudentId?: number | null
  selectedFurnitureBlockId?: string | null
  selectedRoomElementId?: string | null
  onStudentPlace: (alunoId: number, row: number, col: number) => void
  onStudentRemove: (row: number, col: number) => void
  onCellSwap: (fromR: number, fromC: number, toR: number, toC: number) => void
  onFurnitureStamp: (row: number, col: number) => void
  onFurnitureBlockSelect?: (blockId: string | null) => void
  onRoomConfigChange?: (config: RoomConfig) => void
  onRoomElementSelect?: (elementId: string | null) => void
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function getNearestTeacherDeskPosition(canvasW: number, centerX: number): RoomConfig['teacherDesk'] {
  const leftBoundary = canvasW / 3
  const rightBoundary = (canvasW / 3) * 2

  if (centerX <= leftBoundary) return 'left'
  if (centerX >= rightBoundary) return 'right'
  return 'center'
}

function getWallDropTarget(
  px: number,
  py: number,
  canvasW: number,
  canvasH: number,
  currentWall: RoomConfig['wallElements'][number]['wall']
) {
  const distances = [
    { wall: 'top' as const, distance: py },
    { wall: 'bottom' as const, distance: canvasH - py },
    { wall: 'left' as const, distance: px },
    { wall: 'right' as const, distance: canvasW - px },
  ]

  const nearest = distances.reduce((best, candidate) =>
    candidate.distance < best.distance ? candidate : best
  )

  const wall = nearest.distance <= WALL_DRAG_THRESHOLD ? nearest.wall : currentWall
  const innerWidth = canvasW - WALL_THICKNESS * 2
  const innerHeight = canvasH - WALL_THICKNESS * 2

  const rawPosition = wall === 'top' || wall === 'bottom'
    ? (clamp(px - WALL_THICKNESS, 0, innerWidth) / innerWidth) * 100
    : (clamp(py - WALL_THICKNESS, 0, innerHeight) / innerHeight) * 100

  return {
    wall,
    position: clampWallPosition(rawPosition),
  }
}

type DraggableNode = Pick<Konva.Node, 'x' | 'y'>

interface DeskConnections {
  left: boolean
  right: boolean
  top: boolean
  bottom: boolean
}

function getCanvasSize(linhas: number, colunas: number) {
  const gridW = colunas * (CELL_W + CELL_GAP) - CELL_GAP
  const gridH = linhas * (CELL_H + CELL_GAP) - CELL_GAP
  const totalW = gridW + WALL_THICKNESS * 2 + PADDING * 2
  const totalH = gridH + WALL_THICKNESS * 2 + TEACHER_AREA_H + PADDING * 2
  return { totalW, totalH, gridW, gridH }
}

// Clean color palette
const COLORS = {
  floor: '#f8fafc',       // slate-50
  floorGrid: '#f1f5f9',   // slate-100
  wall: '#e2e8f0',        // slate-200
  wallBorder: '#cbd5e1',   // slate-300
  deskEmpty: '#ffffff',
  deskEmptyBorder: '#e2e8f0',
  deskOccupied: '#f0fdf4', // green-50
  deskOccupiedBorder: '#86efac', // green-300
  deskHighlight: '#dcfce7', // green-100
  deskHighlightBorder: '#4ade80',
  chair: '#94a3b8',        // slate-400
  chairEmpty: '#cbd5e1',   // slate-300
  studentNum: '#15803d',   // green-700
  studentName: '#374151',  // gray-700
  boardBg: '#ffffff',
  boardBorder: '#94a3b8',
  teacherBg: '#eff6ff',    // blue-50
  teacherBorder: '#93c5fd', // blue-300
  teacherText: '#1d4ed8',
  separator: '#e2e8f0',
  blocked: '#f1f5f9',
  blockedStroke: '#cbd5e1',
  doorBg: 'rgba(120,113,108,0.15)',
  doorBorder: '#78716c',
  windowBg: '#e0f2fe',
  windowBorder: '#7dd3fc',
}

function DeskShape({ x, y, w, h, occupied, studentName, studentNum, isDragOver, selected, connections }: {
  x: number; y: number; w: number; h: number
  occupied: boolean; studentName?: string; studentNum?: number | null
  isDragOver?: boolean
  selected?: boolean
  connections: DeskConnections
}) {
  const deskH = h * 0.72
  const chairW = 18
  const chairH = 7
  const connectorInsetX = 10
  const connectorInsetY = 8

  const bgColor = isDragOver ? COLORS.deskHighlight
    : selected ? '#fef3c7'
    : occupied ? COLORS.deskOccupied : COLORS.deskEmpty
  const borderColor = isDragOver ? COLORS.deskHighlightBorder
    : selected ? '#f59e0b'
    : occupied ? COLORS.deskOccupiedBorder : COLORS.deskEmptyBorder

  return (
    <Group x={x} y={y}>
      {connections.left && (
        <Rect
          x={-BLOCK_CONNECTOR}
          y={connectorInsetY}
          width={BLOCK_CONNECTOR + 2}
          height={deskH - connectorInsetY * 2}
          cornerRadius={4}
          fill={bgColor}
        />
      )}
      {connections.right && (
        <Rect
          x={w - 2}
          y={connectorInsetY}
          width={BLOCK_CONNECTOR + 2}
          height={deskH - connectorInsetY * 2}
          cornerRadius={4}
          fill={bgColor}
        />
      )}
      {connections.top && (
        <Rect
          x={connectorInsetX}
          y={-BLOCK_CONNECTOR}
          width={w - connectorInsetX * 2}
          height={BLOCK_CONNECTOR + 2}
          cornerRadius={4}
          fill={bgColor}
        />
      )}
      {connections.bottom && (
        <Rect
          x={connectorInsetX}
          y={deskH - 2}
          width={w - connectorInsetX * 2}
          height={BLOCK_CONNECTOR + 2}
          cornerRadius={4}
          fill={bgColor}
        />
      )}
      {/* Shadow */}
      <Rect
        x={2} y={3} width={w} height={deskH}
        cornerRadius={6}
        fill="rgba(0,0,0,0.05)"
      />
      {/* Desk surface */}
      <Rect
        width={w} height={deskH}
        cornerRadius={6}
        fill={bgColor}
        stroke={borderColor}
        strokeWidth={selected || occupied ? 2 : 1}
      />
      {/* Student info */}
      {occupied && studentNum !== undefined && (
        <>
          <Circle
            x={w / 2} y={deskH * 0.32}
            radius={11}
            fill={COLORS.studentNum} opacity={0.1}
          />
          <Text
            x={0} y={deskH * 0.18} width={w}
            text={String(studentNum ?? '?')}
            fontSize={12} fontStyle="bold" fill={COLORS.studentNum}
            align="center"
          />
          <Text
            x={4} y={deskH * 0.52} width={w - 8}
            text={studentName?.split(' ')[0] ?? ''}
            fontSize={10} fill={COLORS.studentName}
            align="center" ellipsis wrap="none"
          />
        </>
      )}
      {isDragOver && (
        <Text
          x={0} y={deskH * 0.32} width={w}
          text="Soltar aqui" fontSize={9} fill={COLORS.studentNum}
          align="center"
        />
      )}
      {/* Chair */}
      <Rect
        x={w / 2 - chairW / 2} y={deskH + 2}
        width={chairW} height={chairH}
        cornerRadius={[0, 0, 9, 9]}
        fill={occupied ? COLORS.chair : COLORS.chairEmpty}
      />
    </Group>
  )
}

function getDeskConnections(grid: Grid, row: number, col: number): DeskConnections {
  const cell = grid[row]?.[col]
  const blocoId = getCellBlockId(cell, row, col)

  if (!cell || cell.tipo !== 'carteira' || !blocoId) {
    return { left: false, right: false, top: false, bottom: false }
  }

  return {
    left: getCellBlockId(grid[row]?.[col - 1], row, col - 1) === blocoId,
    right: getCellBlockId(grid[row]?.[col + 1], row, col + 1) === blocoId,
    top: getCellBlockId(grid[row - 1]?.[col], row - 1, col) === blocoId,
    bottom: getCellBlockId(grid[row + 1]?.[col], row + 1, col) === blocoId,
  }
}

function WallElements({ config, canvasW, canvasH, interactive, selectedElementId, onConfigChange, onSelectElement }: {
  config: RoomConfig; canvasW: number; canvasH: number
  interactive: boolean; selectedElementId?: string | null
  onConfigChange?: (config: RoomConfig) => void
  onSelectElement?: (elementId: string | null) => void
}) {
  const wallEls = config.wallElements ?? []

  const handleBoardClick = () => {
    if (!interactive) return
    onSelectElement?.('board')
  }

  const handleTeacherClick = () => {
    if (!interactive) return
    onSelectElement?.('teacher-desk')
  }

  const handleBoardDrop = (node: DraggableNode) => {
    if (!interactive || !onConfigChange) return

    const boardCenterY = node.y() + 10
    onSelectElement?.('board')
    onConfigChange({
      ...config,
      boardWall: boardCenterY < canvasH / 2 ? 'top' : 'bottom',
    })
  }

  const handleTeacherDrop = (node: DraggableNode) => {
    if (!interactive || !onConfigChange) return

    const teacherCenterX = node.x() + 55
    onSelectElement?.('teacher-desk')
    onConfigChange({
      ...config,
      teacherDesk: getNearestTeacherDeskPosition(canvasW, teacherCenterX),
    })
  }

  const handleWallElementDrop = (
    elementId: string,
    currentWall: RoomConfig['wallElements'][number]['wall'],
    width: number,
    height: number,
    node: DraggableNode
  ) => {
    if (!interactive || !onConfigChange) return

    const centerX = node.x() + width / 2
    const centerY = node.y() + height / 2
    const nextTarget = getWallDropTarget(centerX, centerY, canvasW, canvasH, currentWall)

    onSelectElement?.(elementId)
    onConfigChange({
      ...config,
      wallElements: wallEls.map((item) =>
        item.id === elementId
          ? { ...item, ...nextTarget }
          : item
      ),
    })
  }

  const boardY = config.boardWall === 'top' ? 5 : canvasH - WALL_THICKNESS + 4
  const boardW = Math.min(canvasW * 0.5, 240)

  const teacherY = config.boardWall === 'top' ? WALL_THICKNESS + 12 : canvasH - WALL_THICKNESS - TEACHER_AREA_H + 12
  const teacherW = 110
  const teacherX = config.teacherDesk === 'left'
    ? WALL_THICKNESS + 20
    : config.teacherDesk === 'right'
      ? canvasW - WALL_THICKNESS - teacherW - 20
      : (canvasW - teacherW) / 2

  const boardSelected = selectedElementId === 'board'
  const teacherSelected = selectedElementId === 'teacher-desk'

  return (
    <Group>
      {/* Board */}
      <Group
        x={(canvasW - boardW) / 2}
        y={boardY}
        draggable={interactive}
        dragBoundFunc={(pos) => ({
          x: (canvasW - boardW) / 2,
          y: clamp(pos.y, 5, canvasH - WALL_THICKNESS + 4),
        })}
        onClick={handleBoardClick}
        onDragStart={() => onSelectElement?.('board')}
        onDragEnd={(event) => handleBoardDrop(event.target)}
        style={{ cursor: interactive ? 'move' : 'default' }}
      >
        <Rect
          width={boardW} height={20}
          fill={boardSelected ? '#ecfeff' : COLORS.boardBg}
          stroke={boardSelected ? '#06b6d4' : COLORS.boardBorder}
          strokeWidth={boardSelected ? 2 : 1.5}
          cornerRadius={3}
          shadowColor="rgba(0,0,0,0.06)" shadowBlur={3} shadowOffsetY={1}
        />
        <Text
          x={0} y={4}
          width={boardW} text={config.boardLabel}
          fontSize={10} fontStyle="bold" fill="#94a3b8"
          align="center" letterSpacing={2}
        />
      </Group>

      {/* Teacher desk */}
      {config.teacherDesk !== 'none' && (
        <Group
          x={teacherX}
          y={teacherY}
          draggable={interactive}
          dragBoundFunc={(pos) => ({
            x: clamp(pos.x, WALL_THICKNESS + 20, canvasW - WALL_THICKNESS - teacherW - 20),
            y: teacherY,
          })}
          onClick={handleTeacherClick}
          onDragStart={() => onSelectElement?.('teacher-desk')}
          onDragEnd={(event) => handleTeacherDrop(event.target)}
          style={{ cursor: interactive ? 'move' : 'default' }}
        >
          <Rect
            x={2} y={2}
            width={teacherW} height={36}
            cornerRadius={5} fill="rgba(0,0,0,0.04)"
          />
          <Rect
            width={teacherW} height={36}
            cornerRadius={5}
            fill={teacherSelected ? '#dbeafe' : COLORS.teacherBg}
            stroke={teacherSelected ? '#2563eb' : COLORS.teacherBorder}
            strokeWidth={teacherSelected ? 2 : 1.5}
          />
          <Text
            x={0} y={11}
            width={teacherW} text="Professor"
            fontSize={10} fontStyle="bold" fill={COLORS.teacherText}
            align="center"
          />
        </Group>
      )}

      {/* Doors & Windows */}
      {wallEls.map((el) => {
        const selected = selectedElementId === el.id
        const isH = el.wall === 'top' || el.wall === 'bottom'
        const maxLen = isH ? canvasW - WALL_THICKNESS * 2 : canvasH - WALL_THICKNESS * 2
        const pos = (el.position / 100) * maxLen
        const elSize = el.size ?? 2
        // Size multipliers: 1=0.7x, 2=1x, 3=1.4x
        const sizeMult = elSize === 1 ? 0.7 : elSize === 3 ? 1.8 : 1

        let ex = 0, ey = 0
        if (el.wall === 'top') { ex = WALL_THICKNESS + pos; ey = 2 }
        else if (el.wall === 'bottom') { ex = WALL_THICKNESS + pos; ey = canvasH - WALL_THICKNESS + 2 }
        else if (el.wall === 'left') { ex = 2; ey = WALL_THICKNESS + pos }
        else { ex = canvasW - WALL_THICKNESS + 2; ey = WALL_THICKNESS + pos }

        if (el.type === 'porta') {
          // Tamanho lateral (ao longo da parede) escala com size, espessura fica fixa
          const wallDepth = WALL_THICKNESS - 6
          const baseLen = 36
          const scaledLen = Math.round(baseLen * sizeMult)
          const pw = isH ? scaledLen : wallDepth
          const ph = isH ? wallDepth : scaledLen
          return (
            <Group
              key={el.id}
              x={ex}
              y={ey}
              draggable={interactive}
              dragBoundFunc={(pos) => ({
                x: clamp(pos.x, 0, canvasW - pw),
                y: clamp(pos.y, 0, canvasH - ph),
              })}
              onClick={() => interactive && onSelectElement?.(el.id)}
              onDragStart={() => interactive && onSelectElement?.(el.id)}
              onDragEnd={(event) => handleWallElementDrop(el.id, el.wall, pw, ph, event.target)}
              style={{ cursor: interactive ? 'move' : 'default' }}
            >
              <Rect
                width={pw}
                height={ph}
                fill={selected ? 'rgba(8,145,178,0.18)' : COLORS.doorBg}
                cornerRadius={2}
                stroke={selected ? '#0891b2' : COLORS.doorBorder}
                strokeWidth={selected ? 2 : 1}
              />
              <Text
                x={0}
                y={ph / 2 - 4}
                width={pw}
                text="P"
                fontSize={9}
                fontStyle="bold"
                fill={selected ? '#0f766e' : COLORS.doorBorder}
                align="center"
              />
            </Group>
          )
        }
        // Janela: lateral escala, espessura fixa na parede
        const jWallDepth = WALL_THICKNESS - 6
        const baseJLen = 40
        const scaledJLen = Math.round(baseJLen * sizeMult)
        const jw = isH ? scaledJLen : jWallDepth
        const jh = isH ? jWallDepth : scaledJLen
        return (
          <Group
            key={el.id}
            x={ex}
            y={ey}
            draggable={interactive}
            dragBoundFunc={(pos) => ({
              x: clamp(pos.x, 0, canvasW - jw),
              y: clamp(pos.y, 0, canvasH - jh),
            })}
            onClick={() => interactive && onSelectElement?.(el.id)}
            onDragStart={() => interactive && onSelectElement?.(el.id)}
            onDragEnd={(event) => handleWallElementDrop(el.id, el.wall, jw, jh, event.target)}
            style={{ cursor: interactive ? 'move' : 'default' }}
          >
            <Rect
              width={jw}
              height={jh}
              fill={selected ? '#cffafe' : COLORS.windowBg}
              stroke={selected ? '#0891b2' : COLORS.windowBorder}
              strokeWidth={selected ? 2 : 1}
              cornerRadius={2}
            />
            <Line points={[jw / 2, 0, jw / 2, jh]} stroke={selected ? '#0891b2' : COLORS.windowBorder} strokeWidth={0.5} opacity={0.6} />
            <Line points={[0, jh / 2, jw, jh / 2]} stroke={selected ? '#0891b2' : COLORS.windowBorder} strokeWidth={0.5} opacity={0.6} />
          </Group>
        )
      })}
    </Group>
  )
}

export function MapCanvas({
  grid, colunas, linhas, alunos, roomConfig, mode, furnitureTool, selectedStudentId, selectedFurnitureBlockId, selectedRoomElementId,
  onStudentPlace, onStudentRemove, onCellSwap, onFurnitureStamp, onFurnitureBlockSelect, onRoomConfigChange, onRoomElementSelect,
}: MapCanvasProps) {
  const stageRef = useRef<Konva.Stage>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(900)
  const [dragOverCell, setDragOverCell] = useState<{ r: number; c: number } | null>(null)

  const config = roomConfig ?? DEFAULT_ROOM_CONFIG
  const alunoMap = new Map(alunos.map((a) => [a.id, a]))
  const { totalW, totalH } = getCanvasSize(linhas, colunas)

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) setContainerWidth(containerRef.current.offsetWidth)
    }
    updateWidth()
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [])

  const scale = Math.min(1, containerWidth / totalW)
  const displayW = totalW * scale
  const displayH = totalH * scale

  const boardAtTop = config.boardWall === 'top'
  const gridOffsetX = WALL_THICKNESS + PADDING
  const gridOffsetY = boardAtTop
    ? WALL_THICKNESS + TEACHER_AREA_H + PADDING
    : WALL_THICKNESS + PADDING

  const getCellPos = useCallback((row: number, col: number) => ({
    x: gridOffsetX + col * (CELL_W + CELL_GAP),
    y: gridOffsetY + row * (CELL_H + CELL_GAP),
  }), [gridOffsetX, gridOffsetY])

  const getCellFromPos = useCallback((px: number, py: number) => {
    for (let r = 0; r < linhas; r++) {
      for (let c = 0; c < colunas; c++) {
        const pos = getCellPos(r, c)
        if (px >= pos.x && px <= pos.x + CELL_W && py >= pos.y && py <= pos.y + CELL_H) {
          return { r, c }
        }
      }
    }
    return null
  }, [linhas, colunas, getCellPos])

  // Calcula posicao no canvas compensando centralizacao do Stage
  const getCanvasPos = useCallback((clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return null
    // O Stage esta centralizado — descontar o offset
    const stageOffsetX = (rect.width - displayW) / 2
    const px = (clientX - rect.left - stageOffsetX) / scale
    const py = (clientY - rect.top) / scale
    return { px, py }
  }, [displayW, scale])

  // Handle HTML drag (from sidebar) into canvas
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const pos = getCanvasPos(e.clientX, e.clientY)
    if (!pos) return
    const cell = getCellFromPos(pos.px, pos.py)
    setDragOverCell(cell)
  }, [getCanvasPos, getCellFromPos])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOverCell(null)
    const alunoId = parseInt(e.dataTransfer.getData('text/plain'))
    if (isNaN(alunoId)) return
    const pos = getCanvasPos(e.clientX, e.clientY)
    if (!pos) return
    const cell = getCellFromPos(pos.px, pos.py)
    if (cell) {
      const gridCell = grid[cell.r]?.[cell.c]
      if (gridCell && (gridCell.tipo === 'carteira' || gridCell.tipo === 'vazio') && !gridCell.alunoId) {
        onStudentPlace(alunoId, cell.r, cell.c)
      }
    }
  }, [getCanvasPos, getCellFromPos, grid, onStudentPlace])

  const handleDragLeave = useCallback(() => setDragOverCell(null), [])

  return (
    <div
      ref={containerRef}
      className="w-full flex justify-center relative"
    >
      {/* Overlay transparente para capturar drag & drop HTML no modo alunos */}
      {mode === 'alunos' && (
        <div
          className="absolute inset-0 z-10"
          style={{ pointerEvents: dragOverCell ? 'auto' : 'none' }}
          onDragOver={(e) => {
            e.preventDefault()
            handleDragOver(e)
          }}
          onDrop={handleDrop}
          onDragLeave={handleDragLeave}
        />
      )}
      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onDragLeave={handleDragLeave}
        onDragEnter={(e) => e.preventDefault()}
      >
        <Stage
        ref={stageRef}
        width={displayW}
        height={displayH}
        scaleX={scale}
        scaleY={scale}
        className="rounded-xl"
        style={{ background: COLORS.floor }}
        onMouseDown={(event) => {
          if (mode === 'sala' && event.target === event.target.getStage()) {
            onRoomElementSelect?.(null)
          }
          if (mode === 'mobiliar' && furnitureTool === 'move' && event.target === event.target.getStage()) {
            onFurnitureBlockSelect?.(null)
          }
        }}
      >
        {/* Background & Walls */}
        <Layer>
          <Rect x={0} y={0} width={totalW} height={totalH} fill={COLORS.floor} cornerRadius={12} />

          {/* Subtle grid lines */}
          {Array.from({ length: Math.ceil(totalW / 50) + 1 }).map((_, i) => (
            <Line key={`vl-${i}`} points={[i * 50, 0, i * 50, totalH]} stroke={COLORS.floorGrid} strokeWidth={0.5} />
          ))}
          {Array.from({ length: Math.ceil(totalH / 50) + 1 }).map((_, i) => (
            <Line key={`hl-${i}`} points={[0, i * 50, totalW, i * 50]} stroke={COLORS.floorGrid} strokeWidth={0.5} />
          ))}

          {/* Walls */}
          <Rect x={0} y={0} width={totalW} height={WALL_THICKNESS} fill={COLORS.wall} cornerRadius={[12, 12, 0, 0]} />
          <Rect x={0} y={totalH - WALL_THICKNESS} width={totalW} height={WALL_THICKNESS} fill={COLORS.wall} cornerRadius={[0, 0, 12, 12]} />
          <Rect x={0} y={0} width={WALL_THICKNESS} height={totalH} fill={COLORS.wall} cornerRadius={[12, 0, 0, 12]} />
          <Rect x={totalW - WALL_THICKNESS} y={0} width={WALL_THICKNESS} height={totalH} fill={COLORS.wall} cornerRadius={[0, 12, 12, 0]} />

          <Rect
            x={WALL_THICKNESS} y={WALL_THICKNESS}
            width={totalW - WALL_THICKNESS * 2} height={totalH - WALL_THICKNESS * 2}
            stroke={COLORS.wallBorder} strokeWidth={1} fill="transparent"
          />

          {config.teacherDesk !== 'none' && (
            <Line
              points={[
                WALL_THICKNESS + 8,
                boardAtTop ? WALL_THICKNESS + TEACHER_AREA_H : totalH - WALL_THICKNESS - TEACHER_AREA_H,
                totalW - WALL_THICKNESS - 8,
                boardAtTop ? WALL_THICKNESS + TEACHER_AREA_H : totalH - WALL_THICKNESS - TEACHER_AREA_H,
              ]}
              stroke={COLORS.separator} strokeWidth={1} dash={[5, 3]}
            />
          )}
        </Layer>

        {/* Wall elements */}
        <Layer>
          <WallElements
            config={config} canvasW={totalW} canvasH={totalH}
            interactive={mode === 'sala'}
            selectedElementId={selectedRoomElementId}
            onConfigChange={onRoomConfigChange}
            onSelectElement={onRoomElementSelect}
          />
        </Layer>

        {/* Desks */}
        <Layer>
          {grid.map((row, rIdx) =>
            row.map((cell, cIdx) => {
              const pos = getCellPos(rIdx, cIdx)

              if (cell.tipo === 'vazio') {
                return (
                  <Group
                    key={`${rIdx}-${cIdx}`}
                    onClick={() => {
                      if (mode === 'mobiliar') {
                        if (furnitureTool !== 'move') {
                          onFurnitureStamp(rIdx, cIdx)
                        } else {
                          onFurnitureBlockSelect?.(null)
                        }
                      }
                    }}
                  >
                    <Rect
                      x={pos.x} y={pos.y} width={CELL_W} height={CELL_H}
                      fill="transparent" stroke={COLORS.deskEmptyBorder} strokeWidth={0.5}
                      dash={[3, 3]} cornerRadius={4}
                    />
                  </Group>
                )
              }

              if (cell.tipo === 'bloqueado') {
                return (
                  <Group
                    key={`${rIdx}-${cIdx}`}
                    onClick={() => {
                      if (mode === 'mobiliar') {
                        if (furnitureTool !== 'move') {
                          onFurnitureStamp(rIdx, cIdx)
                        } else {
                          onFurnitureBlockSelect?.(null)
                        }
                      }
                    }}
                  >
                    <Rect
                      x={pos.x} y={pos.y} width={CELL_W} height={CELL_H}
                      fill={COLORS.blocked} stroke={COLORS.blockedStroke} strokeWidth={1} cornerRadius={4}
                    />
                    <Line points={[pos.x + 8, pos.y + 8, pos.x + CELL_W - 8, pos.y + CELL_H - 8]} stroke={COLORS.blockedStroke} strokeWidth={1} />
                    <Line points={[pos.x + CELL_W - 8, pos.y + 8, pos.x + 8, pos.y + CELL_H - 8]} stroke={COLORS.blockedStroke} strokeWidth={1} />
                  </Group>
                )
              }

              const aluno = cell.alunoId ? alunoMap.get(cell.alunoId) : null
              const isOver = dragOverCell?.r === rIdx && dragOverCell?.c === cIdx
              const connections = getDeskConnections(grid, rIdx, cIdx)
              const blockId = getCellBlockId(cell, rIdx, cIdx)
              const selected = mode === 'mobiliar' && selectedFurnitureBlockId === blockId

              return (
                <Group
                  key={`${rIdx}-${cIdx}`}
                  draggable={mode === 'mobiliar' && furnitureTool === 'move'}
                  onClick={() => {
                    if (mode === 'alunos') {
                      if (selectedStudentId && !aluno && cell.tipo === 'carteira') {
                        onStudentPlace(selectedStudentId, rIdx, cIdx)
                      } else if (aluno) {
                        onStudentRemove(rIdx, cIdx)
                      }
                    } else if (mode === 'mobiliar') {
                      if (furnitureTool === 'move') {
                        onFurnitureBlockSelect?.(blockId)
                      } else {
                        onFurnitureStamp(rIdx, cIdx)
                      }
                    }
                  }}
                  onDragStart={() => {
                    if (mode === 'mobiliar' && furnitureTool === 'move') {
                      onFurnitureBlockSelect?.(blockId)
                    }
                  }}
                  onDragEnd={(e) => {
                    if (mode !== 'mobiliar' || furnitureTool !== 'move') return
                    const stage = stageRef.current
                    if (!stage) return
                    const pointer = stage.getPointerPosition()
                    if (!pointer) return
                    const target = getCellFromPos(pointer.x / scale, pointer.y / scale)
                    if (target && (target.r !== rIdx || target.c !== cIdx)) {
                      onCellSwap(rIdx, cIdx, target.r, target.c)
                    }
                    e.target.position({ x: 0, y: 0 })
                  }}
                >
                  <DeskShape
                    x={pos.x} y={pos.y} w={CELL_W} h={CELL_H}
                    occupied={!!aluno}
                    studentName={aluno?.nome}
                    studentNum={aluno?.numero}
                    isDragOver={isOver}
                    selected={selected}
                    connections={connections}
                  />
                </Group>
              )
            })
          )}
        </Layer>
      </Stage>
      </div>
    </div>
  )
}
