'use client'

import { useRef, useCallback, useEffect, useState } from 'react'
import { Stage, Layer, Rect, Group, Text, Line, Circle } from 'react-konva'
import type Konva from 'konva'
import type { Grid, Aluno, RoomConfig } from '@/types/database'
import { DEFAULT_ROOM_CONFIG } from '@/types/database'

// Layout constants
const CELL_W = 90
const CELL_H = 80
const CELL_GAP = 12
const WALL_THICKNESS = 32
const TEACHER_AREA_H = 70
const PADDING = 20

interface MapCanvasProps {
  grid: Grid
  colunas: number
  linhas: number
  alunos: Aluno[]
  roomConfig?: RoomConfig | null
  mode: 'alunos' | 'mobiliar'
  selectedStudentId?: number | null
  onStudentPlace: (alunoId: number, row: number, col: number) => void
  onStudentRemove: (row: number, col: number) => void
  onCellSwap: (fromR: number, fromC: number, toR: number, toC: number) => void
  onToggleCell: (row: number, col: number) => void
  onRoomConfigChange?: (config: RoomConfig) => void
}

function getCanvasSize(linhas: number, colunas: number) {
  const gridW = colunas * (CELL_W + CELL_GAP) - CELL_GAP
  const gridH = linhas * (CELL_H + CELL_GAP) - CELL_GAP
  const totalW = gridW + WALL_THICKNESS * 2 + PADDING * 2
  const totalH = gridH + WALL_THICKNESS * 2 + TEACHER_AREA_H + PADDING * 2
  return { totalW, totalH, gridW, gridH }
}

function DeskShape({ x, y, w, h, occupied, studentName, studentNum, isDragOver }: {
  x: number; y: number; w: number; h: number
  occupied: boolean; studentName?: string; studentNum?: number | null
  isDragOver?: boolean
}) {
  const deskH = h * 0.75
  const chairH = 8

  return (
    <Group x={x} y={y}>
      {/* Shadow */}
      <Rect
        x={3} y={4} width={w} height={deskH}
        cornerRadius={[8, 8, 3, 3]}
        fill="rgba(0,0,0,0.08)"
      />
      {/* Desk surface */}
      <Rect
        width={w} height={deskH}
        cornerRadius={[8, 8, 3, 3]}
        fill={isDragOver ? '#d1fae5' : occupied ? '#fef3c7' : '#fefce8'}
        stroke={isDragOver ? '#34d399' : occupied ? '#d97706' : '#e5e7eb'}
        strokeWidth={occupied ? 2 : 1.5}
      />
      {/* Wood grain lines */}
      {occupied && (
        <>
          <Line points={[8, deskH * 0.3, w - 8, deskH * 0.3]} stroke="#f59e0b" strokeWidth={0.3} opacity={0.3} />
          <Line points={[8, deskH * 0.6, w - 8, deskH * 0.6]} stroke="#f59e0b" strokeWidth={0.3} opacity={0.3} />
        </>
      )}
      {/* Student info */}
      {occupied && studentNum !== undefined && (
        <>
          <Circle
            x={w / 2} y={deskH * 0.32}
            radius={12}
            fill="#059669" opacity={0.15}
          />
          <Text
            x={0} y={deskH * 0.18} width={w}
            text={String(studentNum ?? '?')}
            fontSize={13} fontStyle="bold" fill="#047857"
            align="center"
          />
          <Text
            x={4} y={deskH * 0.52} width={w - 8}
            text={studentName?.split(' ')[0] ?? ''}
            fontSize={10} fill="#78350f"
            align="center" ellipsis wrap="none"
          />
        </>
      )}
      {!occupied && (
        <Text
          x={0} y={deskH * 0.35} width={w}
          text="vazio" fontSize={9} fill="#d1d5db"
          align="center"
        />
      )}
      {/* Chair (semicircle) */}
      <Rect
        x={w / 2 - 10} y={deskH + 2}
        width={20} height={chairH}
        cornerRadius={[0, 0, 10, 10]}
        fill={occupied ? '#78716c' : '#d6d3d1'}
      />
    </Group>
  )
}

function WallElements({ config, canvasW, canvasH, gridStartY, interactive, onConfigChange }: {
  config: RoomConfig; canvasW: number; canvasH: number; gridStartY: number
  interactive: boolean; onConfigChange?: (c: RoomConfig) => void
}) {
  const wallEls = config.wallElements ?? []

  const handleBoardClick = () => {
    if (!interactive || !onConfigChange) return
    onConfigChange({ ...config, boardWall: config.boardWall === 'top' ? 'bottom' : 'top' })
  }

  const handleTeacherClick = () => {
    if (!interactive || !onConfigChange) return
    const positions: Array<RoomConfig['teacherDesk']> = ['left', 'center', 'right', 'none']
    const idx = positions.indexOf(config.teacherDesk)
    onConfigChange({ ...config, teacherDesk: positions[(idx + 1) % positions.length] })
  }

  // Board position
  const boardY = config.boardWall === 'top' ? 6 : canvasH - WALL_THICKNESS + 4
  const boardW = Math.min(canvasW * 0.5, 250)

  // Teacher desk position
  const teacherY = config.boardWall === 'top' ? WALL_THICKNESS + 10 : canvasH - WALL_THICKNESS - TEACHER_AREA_H + 10
  const teacherW = 120
  const teacherX = config.teacherDesk === 'left'
    ? WALL_THICKNESS + 20
    : config.teacherDesk === 'right'
      ? canvasW - WALL_THICKNESS - teacherW - 20
      : (canvasW - teacherW) / 2

  return (
    <Group>
      {/* Whiteboard */}
      <Group onClick={handleBoardClick}>
        <Rect
          x={(canvasW - boardW) / 2} y={boardY}
          width={boardW} height={22}
          fill="white" stroke="#a8a29e" strokeWidth={2}
          cornerRadius={3}
          shadowColor="rgba(0,0,0,0.1)" shadowBlur={4} shadowOffsetY={2}
        />
        <Text
          x={(canvasW - boardW) / 2} y={boardY + 4}
          width={boardW} text={config.boardLabel}
          fontSize={11} fontStyle="bold" fill="#78716c"
          align="center" letterSpacing={2}
        />
      </Group>

      {/* Teacher desk */}
      {config.teacherDesk !== 'none' && (
        <Group onClick={handleTeacherClick}>
          <Rect
            x={teacherX - 2} y={teacherY + 2}
            width={teacherW} height={40}
            cornerRadius={6} fill="rgba(0,0,0,0.06)"
          />
          <Rect
            x={teacherX} y={teacherY}
            width={teacherW} height={40}
            cornerRadius={6}
            fill="#e0f2fe" stroke="#38bdf8" strokeWidth={2}
          />
          <Text
            x={teacherX} y={teacherY + 12}
            width={teacherW} text="Professor"
            fontSize={11} fontStyle="bold" fill="#0369a1"
            align="center"
          />
        </Group>
      )}

      {/* Wall elements (doors & windows) */}
      {wallEls.map((el) => {
        const isH = el.wall === 'top' || el.wall === 'bottom'
        const maxLen = isH ? canvasW - WALL_THICKNESS * 2 : canvasH - WALL_THICKNESS * 2
        const pos = (el.position / 100) * maxLen

        let ex = 0, ey = 0
        if (el.wall === 'top') { ex = WALL_THICKNESS + pos; ey = 2 }
        else if (el.wall === 'bottom') { ex = WALL_THICKNESS + pos; ey = canvasH - WALL_THICKNESS + 2 }
        else if (el.wall === 'left') { ex = 2; ey = WALL_THICKNESS + pos }
        else { ex = canvasW - WALL_THICKNESS + 2; ey = WALL_THICKNESS + pos }

        if (el.type === 'porta') {
          const pw = isH ? 30 : WALL_THICKNESS - 6
          const ph = isH ? WALL_THICKNESS - 6 : 30
          return (
            <Group key={el.id} x={ex} y={ey}>
              <Rect width={pw} height={ph} fill="#92400e" opacity={0.25} cornerRadius={3} stroke="#92400e" strokeWidth={1.5} />
              <Text x={0} y={ph / 2 - 5} width={pw} text="P" fontSize={10} fontStyle="bold" fill="#92400e" align="center" />
            </Group>
          )
        }
        // janela
        const jw = isH ? 35 : WALL_THICKNESS - 6
        const jh = isH ? WALL_THICKNESS - 6 : 35
        return (
          <Group key={el.id} x={ex} y={ey}>
            <Rect width={jw} height={jh} fill="#bae6fd" stroke="#38bdf8" strokeWidth={1.5} cornerRadius={2} />
            <Line points={[jw / 2, 0, jw / 2, jh]} stroke="#7dd3fc" strokeWidth={1} />
            <Line points={[0, jh / 2, jw, jh / 2]} stroke="#7dd3fc" strokeWidth={1} />
          </Group>
        )
      })}
    </Group>
  )
}

export function MapCanvas({
  grid, colunas, linhas, alunos, roomConfig, mode, selectedStudentId,
  onStudentPlace, onStudentRemove, onCellSwap, onToggleCell, onRoomConfigChange,
}: MapCanvasProps) {
  const stageRef = useRef<Konva.Stage>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(800)
  const [draggedStudent, setDraggedStudent] = useState<number | null>(null)
  const [dragOverCell, setDragOverCell] = useState<{ r: number; c: number } | null>(null)

  const config = roomConfig ?? DEFAULT_ROOM_CONFIG
  const alunoMap = new Map(alunos.map((a) => [a.id, a]))

  const { totalW, totalH } = getCanvasSize(linhas, colunas)

  // Responsive scaling
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth)
      }
    }
    updateWidth()
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [])

  const scale = Math.min(1, containerWidth / totalW)
  const displayW = totalW * scale
  const displayH = totalH * scale

  // Grid offset (inside walls, after teacher area)
  const boardAtTop = config.boardWall === 'top'
  const gridOffsetX = WALL_THICKNESS + PADDING
  const gridOffsetY = boardAtTop
    ? WALL_THICKNESS + TEACHER_AREA_H + PADDING
    : WALL_THICKNESS + PADDING

  const getCellPos = (row: number, col: number) => ({
    x: gridOffsetX + col * (CELL_W + CELL_GAP),
    y: gridOffsetY + row * (CELL_H + CELL_GAP),
  })

  const getCellFromPos = useCallback((px: number, py: number) => {
    for (let r = 0; r < linhas; r++) {
      for (let c = 0; c < colunas; c++) {
        const { x, y } = getCellPos(r, c)
        if (px >= x && px <= x + CELL_W && py >= y && py <= y + CELL_H) {
          return { r, c }
        }
      }
    }
    return null
  }, [linhas, colunas, gridOffsetX, gridOffsetY])

  return (
    <div ref={containerRef} className="w-full">
      <Stage
        ref={stageRef}
        width={displayW}
        height={displayH}
        scaleX={scale}
        scaleY={scale}
        className="rounded-xl overflow-hidden"
        style={{ background: '#fefce8' }}
      >
        {/* Background & Walls */}
        <Layer>
          {/* Floor */}
          <Rect x={0} y={0} width={totalW} height={totalH} fill="#fffbeb" cornerRadius={12} />

          {/* Floor grid lines */}
          {Array.from({ length: Math.ceil(totalW / 50) + 1 }).map((_, i) => (
            <Line key={`vl-${i}`} points={[i * 50, 0, i * 50, totalH]} stroke="#f5f5f4" strokeWidth={0.5} />
          ))}
          {Array.from({ length: Math.ceil(totalH / 50) + 1 }).map((_, i) => (
            <Line key={`hl-${i}`} points={[0, i * 50, totalW, i * 50]} stroke="#f5f5f4" strokeWidth={0.5} />
          ))}

          {/* Walls */}
          <Rect x={0} y={0} width={totalW} height={WALL_THICKNESS} fill="#d6d3d1" cornerRadius={[12, 12, 0, 0]} />
          <Rect x={0} y={totalH - WALL_THICKNESS} width={totalW} height={WALL_THICKNESS} fill="#d6d3d1" cornerRadius={[0, 0, 12, 12]} />
          <Rect x={0} y={0} width={WALL_THICKNESS} height={totalH} fill="#d6d3d1" cornerRadius={[12, 0, 0, 12]} />
          <Rect x={totalW - WALL_THICKNESS} y={0} width={WALL_THICKNESS} height={totalH} fill="#d6d3d1" cornerRadius={[0, 12, 12, 0]} />

          {/* Wall inner border */}
          <Rect
            x={WALL_THICKNESS} y={WALL_THICKNESS}
            width={totalW - WALL_THICKNESS * 2} height={totalH - WALL_THICKNESS * 2}
            stroke="#a8a29e" strokeWidth={2} fill="transparent"
          />

          {/* Separator line (teacher area / student area) */}
          {config.teacherDesk !== 'none' && (
            <Line
              points={[
                WALL_THICKNESS + 10,
                boardAtTop ? WALL_THICKNESS + TEACHER_AREA_H : totalH - WALL_THICKNESS - TEACHER_AREA_H,
                totalW - WALL_THICKNESS - 10,
                boardAtTop ? WALL_THICKNESS + TEACHER_AREA_H : totalH - WALL_THICKNESS - TEACHER_AREA_H,
              ]}
              stroke="#d6d3d1" strokeWidth={1} dash={[6, 4]}
            />
          )}
        </Layer>

        {/* Wall elements (board, teacher desk, doors, windows) */}
        <Layer>
          <WallElements
            config={config}
            canvasW={totalW}
            canvasH={totalH}
            gridStartY={gridOffsetY}
            interactive={mode === 'mobiliar'}
            onConfigChange={onRoomConfigChange}
          />
        </Layer>

        {/* Desks */}
        <Layer>
          {grid.map((row, rIdx) =>
            row.map((cell, cIdx) => {
              const { x, y } = getCellPos(rIdx, cIdx)

              if (cell.tipo === 'vazio') {
                return (
                  <Group
                    key={`${rIdx}-${cIdx}`}
                    onClick={() => onToggleCell(rIdx, cIdx)}
                  >
                    <Rect
                      x={x} y={y} width={CELL_W} height={CELL_H}
                      fill="transparent" stroke="#e5e7eb" strokeWidth={1}
                      dash={[4, 4]} cornerRadius={6}
                    />
                  </Group>
                )
              }

              if (cell.tipo === 'bloqueado') {
                return (
                  <Group
                    key={`${rIdx}-${cIdx}`}
                    onClick={() => onToggleCell(rIdx, cIdx)}
                  >
                    <Rect
                      x={x} y={y} width={CELL_W} height={CELL_H}
                      fill="#e7e5e4" stroke="#a8a29e" strokeWidth={1}
                      cornerRadius={6}
                    />
                    <Line points={[x + 10, y + 10, x + CELL_W - 10, y + CELL_H - 10]} stroke="#a8a29e" strokeWidth={1.5} />
                    <Line points={[x + CELL_W - 10, y + 10, x + 10, y + CELL_H - 10]} stroke="#a8a29e" strokeWidth={1.5} />
                  </Group>
                )
              }

              // Carteira
              const aluno = cell.alunoId ? alunoMap.get(cell.alunoId) : null
              const isOver = dragOverCell?.r === rIdx && dragOverCell?.c === cIdx

              return (
                <Group
                  key={`${rIdx}-${cIdx}`}
                  draggable={mode === 'mobiliar'}
                  onClick={() => {
                    if (mode === 'alunos') {
                      if (selectedStudentId && !aluno && cell.tipo === 'carteira') {
                        onStudentPlace(selectedStudentId, rIdx, cIdx)
                      } else if (aluno) {
                        onStudentRemove(rIdx, cIdx)
                      } else {
                        onToggleCell(rIdx, cIdx)
                      }
                    }
                  }}
                  onDragEnd={(e) => {
                    if (mode !== 'mobiliar') return
                    const stage = stageRef.current
                    if (!stage) return
                    const pointer = stage.getPointerPosition()
                    if (!pointer) return
                    const target = getCellFromPos(pointer.x / scale, pointer.y / scale)
                    if (target && (target.r !== rIdx || target.c !== cIdx)) {
                      onCellSwap(rIdx, cIdx, target.r, target.c)
                    }
                    // Reset position
                    e.target.position({ x: 0, y: 0 })
                  }}
                >
                  <DeskShape
                    x={x} y={y} w={CELL_W} h={CELL_H}
                    occupied={!!aluno}
                    studentName={aluno?.nome}
                    studentNum={aluno?.numero}
                    isDragOver={isOver}
                  />
                </Group>
              )
            })
          )}
        </Layer>
      </Stage>
    </div>
  )
}
