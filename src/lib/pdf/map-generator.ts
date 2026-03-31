import jsPDF from 'jspdf'
import { generateQrDataUrl } from '@/components/qr-code-card'
import type { Grid, RoomConfig } from '@/types/database'
import { getCellBlockId, displayName } from '@/lib/map/utils'

interface MapPdfOptions {
  grid: Grid
  linhas: number
  colunas: number
  serie: string
  turma: string
  turno: string
  alunoMap: Map<number, { nome: string; numero: number | null; apelido?: string | null }>
  shareUrl?: string
  roomConfig?: RoomConfig | null
  escolaNome?: string
  escolaLogoUrl?: string
}

// Colors
const C = {
  wall: [210, 215, 224],       // slate-200
  wallBorder: [185, 195, 210], // slate-300
  floor: [248, 250, 252],      // slate-50
  deskEmpty: [255, 255, 255],
  deskEmptyBorder: [210, 215, 224],
  deskOccupied: [240, 253, 244],    // green-50
  deskOccupiedBorder: [134, 239, 172], // green-300
  chair: [148, 163, 184],       // slate-400
  chairEmpty: [203, 213, 225],  // slate-300
  shadow: [0, 0, 0],
  studentNum: [21, 128, 61],    // green-700
  studentName: [55, 65, 81],    // gray-700
  boardBg: [255, 255, 255],
  boardBorder: [148, 163, 184],
  teacherBg: [239, 246, 255],   // blue-50
  teacherBorder: [147, 197, 253], // blue-300
  teacherText: [29, 78, 216],   // blue-700
  blocked: [241, 245, 249],
  blockedBorder: [203, 213, 225],
  headerBg: [5, 46, 22],        // emerald-950
} as const

function rgb(c: readonly number[]): [number, number, number] {
  return [c[0], c[1], c[2]]
}

export function generateMapPdf(options: MapPdfOptions) {
  const { grid, linhas, colunas, serie, turma, turno, alunoMap, shareUrl, roomConfig, escolaNome, escolaLogoUrl } = options

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()

  // --- Layout calculations ---
  const headerH = 18
  const footerH = 10
  const marginX = 12
  const wallT = 5 // wall thickness
  const teacherH = roomConfig?.teacherDesk !== 'none' ? 10 : 0
  const boardH = 4

  const innerTop = headerH + wallT + boardH + teacherH + 2
  const innerBottom = pageH - footerH - wallT - 2
  const innerLeft = marginX + wallT
  const innerRight = pageW - marginX - wallT

  const availW = innerRight - innerLeft - 4
  const availH = innerBottom - innerTop - 2
  const gap = 1.5

  const cellW = Math.min((availW - gap * (colunas - 1)) / colunas, 32)
  const cellH = Math.min((availH - gap * (linhas - 1)) / linhas, 18)
  const deskH = cellH * 0.72
  const chairH = 1.5

  const gridW = colunas * cellW + (colunas - 1) * gap
  const gridH = linhas * cellH + (linhas - 1) * gap
  const gridStartX = innerLeft + (availW - gridW) / 2 + 2
  const gridStartY = innerTop + (availH - gridH) / 2 + 1

  const frameLeft = marginX
  const frameRight = pageW - marginX
  const frameTop = headerH
  const frameBottom = pageH - footerH
  const frameW = frameRight - frameLeft
  const frameH = frameBottom - frameTop

  // --- Header bar ---
  doc.setFillColor(...rgb(C.headerBg))
  doc.rect(0, 0, pageW, headerH, 'F')

  let headerTextX = marginX + wallT + 2

  // Logo da escola (se existir)
  if (escolaLogoUrl) {
    try {
      doc.addImage(escolaLogoUrl, 'PNG', marginX + 2, 2, 14, 14)
      headerTextX = marginX + 19
    } catch {
      // Logo nao carregou — continua sem
    }
  }

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')

  if (escolaNome) {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text(escolaNome, headerTextX, headerH / 2 - 2)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(`${serie} ${turma}`, headerTextX, headerH / 2 + 4)
  } else {
    doc.text(`${serie} ${turma}`, headerTextX, headerH / 2 + 1.5)
  }

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`${turno} | ${new Date().toLocaleDateString('pt-BR')}`, pageW - marginX - wallT - 2, headerH / 2 + 1.5, { align: 'right' })

  // --- Room frame (walls) ---
  // Floor background
  doc.setFillColor(...rgb(C.floor))
  doc.roundedRect(frameLeft, frameTop, frameW, frameH, 2, 2, 'F')

  // Walls
  doc.setFillColor(...rgb(C.wall))
  // Top wall
  doc.rect(frameLeft, frameTop, frameW, wallT, 'F')
  // Bottom wall
  doc.rect(frameLeft, frameBottom - wallT, frameW, wallT, 'F')
  // Left wall
  doc.rect(frameLeft, frameTop, wallT, frameH, 'F')
  // Right wall
  doc.rect(frameRight - wallT, frameTop, wallT, frameH, 'F')

  // Inner border
  doc.setDrawColor(...rgb(C.wallBorder))
  doc.setLineWidth(0.2)
  doc.rect(frameLeft + wallT, frameTop + wallT, frameW - wallT * 2, frameH - wallT * 2)

  // --- Board ---
  const boardW = Math.min(frameW * 0.4, 80)
  const boardX = frameLeft + (frameW - boardW) / 2
  const boardY = frameTop + wallT - 1

  doc.setFillColor(...rgb(C.boardBg))
  doc.setDrawColor(...rgb(C.boardBorder))
  doc.setLineWidth(0.3)
  doc.roundedRect(boardX, boardY, boardW, boardH, 1, 1, 'FD')

  doc.setTextColor(...rgb(C.boardBorder))
  doc.setFontSize(5)
  doc.setFont('helvetica', 'bold')
  doc.text(roomConfig?.boardLabel || 'QUADRO', boardX + boardW / 2, boardY + boardH / 2 + 1, { align: 'center' })

  // --- Teacher desk ---
  if (roomConfig?.teacherDesk !== 'none') {
    const tDeskW = 22
    const tDeskH = 7
    const tDeskY = frameTop + wallT + boardH + 1

    const pos = roomConfig?.teacherDesk || 'center'
    const tDeskX = pos === 'left'
      ? frameLeft + wallT + 6
      : pos === 'right'
        ? frameRight - wallT - tDeskW - 6
        : frameLeft + (frameW - tDeskW) / 2

    // Shadow
    doc.setFillColor(0, 0, 0)
    doc.setGState(doc.GState({ opacity: 0.04 }))
    doc.roundedRect(tDeskX + 0.3, tDeskY + 0.3, tDeskW, tDeskH, 1, 1, 'F')
    doc.setGState(doc.GState({ opacity: 1 }))

    doc.setFillColor(...rgb(C.teacherBg))
    doc.setDrawColor(...rgb(C.teacherBorder))
    doc.setLineWidth(0.3)
    doc.roundedRect(tDeskX, tDeskY, tDeskW, tDeskH, 1, 1, 'FD')

    doc.setTextColor(...rgb(C.teacherText))
    doc.setFontSize(5)
    doc.setFont('helvetica', 'bold')
    doc.text('Professor', tDeskX + tDeskW / 2, tDeskY + tDeskH / 2 + 1, { align: 'center' })
  }

  // --- Separator line ---
  if (teacherH > 0) {
    const sepY = frameTop + wallT + boardH + teacherH + 1
    doc.setDrawColor(...rgb(C.deskEmptyBorder))
    doc.setLineWidth(0.15)
    doc.setLineDashPattern([2, 1], 0)
    doc.line(frameLeft + wallT + 4, sepY, frameRight - wallT - 4, sepY)
    doc.setLineDashPattern([], 0)
  }

  // --- Desks ---
  const allAlunosList = Array.from(alunoMap.values())
  grid.forEach((row, rIdx) => {
    row.forEach((cell, cIdx) => {
      const x = gridStartX + cIdx * (cellW + gap)
      const y = gridStartY + rIdx * (cellH + gap)

      if (cell.tipo === 'vazio') return

      if (cell.tipo === 'bloqueado') {
        doc.setFillColor(...rgb(C.blocked))
        doc.setDrawColor(...rgb(C.blockedBorder))
        doc.setLineWidth(0.2)
        doc.roundedRect(x, y, cellW, deskH, 1, 1, 'FD')
        // X
        doc.setDrawColor(...rgb(C.blockedBorder))
        doc.setLineWidth(0.3)
        doc.line(x + 2, y + 2, x + cellW - 2, y + deskH - 2)
        doc.line(x + cellW - 2, y + 2, x + 2, y + deskH - 2)
        return
      }

      // carteira
      const aluno = cell.alunoId ? alunoMap.get(cell.alunoId) : null
      const occupied = !!aluno
      const blockId = getCellBlockId(cell, rIdx, cIdx)

      // Block connectors
      if (blockId) {
        const rightNeighbor = getCellBlockId(grid[rIdx]?.[cIdx + 1], rIdx, cIdx + 1)
        const bottomNeighbor = getCellBlockId(grid[rIdx + 1]?.[cIdx], rIdx + 1, cIdx)

        if (rightNeighbor === blockId) {
          doc.setFillColor(...(occupied ? rgb(C.deskOccupied) : rgb(C.deskEmpty)))
          doc.rect(x + cellW - 0.5, y + 2, gap + 1, deskH - 4, 'F')
        }
        if (bottomNeighbor === blockId) {
          doc.setFillColor(...(occupied ? rgb(C.deskOccupied) : rgb(C.deskEmpty)))
          doc.rect(x + 2, y + deskH - 0.5, cellW - 4, gap + 1, 'F')
        }
      }

      // Shadow
      doc.setFillColor(0, 0, 0)
      doc.setGState(doc.GState({ opacity: 0.05 }))
      doc.roundedRect(x + 0.3, y + 0.4, cellW, deskH, 1, 1, 'F')
      doc.setGState(doc.GState({ opacity: 1 }))

      // Desk surface
      doc.setFillColor(...(occupied ? rgb(C.deskOccupied) : rgb(C.deskEmpty)))
      doc.setDrawColor(...(occupied ? rgb(C.deskOccupiedBorder) : rgb(C.deskEmptyBorder)))
      doc.setLineWidth(occupied ? 0.3 : 0.15)
      doc.roundedRect(x, y, cellW, deskH, 1, 1, 'FD')

      // Student info
      if (aluno) {
        // Number circle bg
        doc.setFillColor(...rgb(C.studentNum))
        doc.setGState(doc.GState({ opacity: 0.08 }))
        doc.circle(x + cellW / 2, y + deskH * 0.32, 2.2, 'F')
        doc.setGState(doc.GState({ opacity: 1 }))

        // Number
        doc.setTextColor(...rgb(C.studentNum))
        doc.setFontSize(6)
        doc.setFont('helvetica', 'bold')
        doc.text(`${aluno.numero ?? '?'}`, x + cellW / 2, y + deskH * 0.37, { align: 'center' })

        // Name
        doc.setTextColor(...rgb(C.studentName))
        doc.setFontSize(4.5)
        doc.setFont('helvetica', 'normal')
        const maxChars = Math.floor(cellW / 1.8)
        const nome = displayName(aluno, allAlunosList)
        const nomeExibido = nome.length > maxChars ? nome.substring(0, maxChars) + '..' : nome
        doc.text(nomeExibido, x + cellW / 2, y + deskH * 0.68, { align: 'center' })
      }

      // Chair
      const chairW = Math.min(cellW * 0.4, 4)
      doc.setFillColor(...(occupied ? rgb(C.chair) : rgb(C.chairEmpty)))
      doc.roundedRect(x + cellW / 2 - chairW / 2, y + deskH + 0.3, chairW, chairH, 0.4, 0.4, 'F')
    })
  })

  // --- Stats bar ---
  const totalSeats = grid.reduce((s, r) => s + r.filter(c => c.tipo === 'carteira').length, 0)
  const placedCount = grid.reduce((s, r) => s + r.filter(c => c.alunoId !== null).length, 0)

  doc.setTextColor(140, 140, 140)
  doc.setFontSize(5)
  doc.setFont('helvetica', 'normal')
  doc.text(`${placedCount}/${totalSeats} alunos posicionados`, frameLeft + wallT + 2, frameBottom - wallT - 1.5)

  // --- QR Code ---
  if (shareUrl) {
    const qrDataUrl = generateQrDataUrl(shareUrl, 400)
    if (qrDataUrl) {
      const qrSize = 18
      const qrX = frameRight - wallT - qrSize - 1
      const qrY = frameBottom - wallT - qrSize - 1

      doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize)

      doc.setTextColor(150, 150, 150)
      doc.setFontSize(3.5)
      doc.text('Escaneie para ver atualizado', qrX + qrSize / 2, qrY - 1, { align: 'center' })
    }
  }

  // --- Footer ---
  doc.setFillColor(245, 245, 245)
  doc.rect(0, pageH - footerH, pageW, footerH, 'F')

  doc.setTextColor(160, 160, 160)
  doc.setFontSize(5)
  doc.text('SalaMap - salamap.profdia.com.br', pageW / 2, pageH - footerH / 2 + 1, { align: 'center' })

  doc.save(`mapa-${serie}-${turma}.pdf`)
}
