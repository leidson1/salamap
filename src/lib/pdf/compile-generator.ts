import jsPDF from 'jspdf'
import { generateQrDataUrl } from '@/components/qr-code-card'
import type { Grid, RoomConfig } from '@/types/database'
import { getCellBlockId, displayName } from '@/lib/map/utils'

interface TurmaMapData {
  serie: string
  turma: string
  turno: string
  grid: Grid
  linhas: number
  colunas: number
  roomConfig?: RoomConfig | null
  alunoMap: Map<number, { nome: string; numero: number | null }>
  shareUrl?: string
}

interface CompilePdfOptions {
  turmas: TurmaMapData[]
  escolaNome?: string
  escolaLogoUrl?: string
}

// Colors
const C = {
  wall: [210, 215, 224],
  floor: [248, 250, 252],
  deskEmpty: [255, 255, 255],
  deskEmptyBorder: [210, 215, 224],
  deskOccupied: [240, 253, 244],
  deskOccupiedBorder: [134, 239, 172],
  chair: [148, 163, 184],
  chairEmpty: [203, 213, 225],
  studentNum: [21, 128, 61],
  studentName: [55, 65, 81],
  boardBg: [255, 255, 255],
  boardBorder: [148, 163, 184],
  teacherBg: [239, 246, 255],
  teacherBorder: [147, 197, 253],
  teacherText: [29, 78, 216],
  blocked: [241, 245, 249],
  blockedBorder: [203, 213, 225],
  headerBg: [5, 46, 22],
} as const

function rgb(c: readonly number[]): [number, number, number] {
  return [c[0], c[1], c[2]]
}

function renderMapPage(
  doc: jsPDF,
  t: TurmaMapData,
  escolaNome?: string,
  escolaLogoUrl?: string
) {
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()

  const headerH = 18
  const footerH = 8
  const marginX = 12
  const wallT = 5
  const teacherH = t.roomConfig?.teacherDesk !== 'none' ? 10 : 0
  const boardH = 4

  const innerTop = headerH + wallT + boardH + teacherH + 2
  const innerBottom = pageH - footerH - wallT - 2
  const innerLeft = marginX + wallT
  const innerRight = pageW - marginX - wallT

  const availW = innerRight - innerLeft - 4
  const availH = innerBottom - innerTop - 2
  const gap = 1.5

  const cellW = Math.min((availW - gap * (t.grid[0]?.length ?? 6 - 1)) / (t.grid[0]?.length ?? 6), 32)
  const cellH = Math.min((availH - gap * (t.grid.length - 1)) / t.grid.length, 18)
  const deskH = cellH * 0.72
  const chairH = 1.5

  const gridW = (t.grid[0]?.length ?? 6) * cellW + ((t.grid[0]?.length ?? 6) - 1) * gap
  const gridH = t.grid.length * cellH + (t.grid.length - 1) * gap
  const gridStartX = innerLeft + (availW - gridW) / 2 + 2
  const gridStartY = innerTop + (availH - gridH) / 2 + 1

  const frameLeft = marginX
  const frameRight = pageW - marginX
  const frameTop = headerH
  const frameBottom = pageH - footerH
  const frameW = frameRight - frameLeft
  const frameH = frameBottom - frameTop

  // Header
  doc.setFillColor(...rgb(C.headerBg))
  doc.rect(0, 0, pageW, headerH, 'F')

  let headerTextX = marginX + wallT + 2
  if (escolaLogoUrl) {
    try { doc.addImage(escolaLogoUrl, 'PNG', marginX + 2, 2, 14, 14); headerTextX = marginX + 19 } catch {}
  }

  doc.setTextColor(255, 255, 255)
  if (escolaNome) {
    doc.setFontSize(8); doc.setFont('helvetica', 'normal')
    doc.text(escolaNome, headerTextX, headerH / 2 - 2)
    doc.setFontSize(12); doc.setFont('helvetica', 'bold')
    doc.text(`${t.serie} ${t.turma}`, headerTextX, headerH / 2 + 4)
  } else {
    doc.setFontSize(13); doc.setFont('helvetica', 'bold')
    doc.text(`${t.serie} ${t.turma}`, headerTextX, headerH / 2 + 1.5)
  }

  doc.setFontSize(9); doc.setFont('helvetica', 'normal')
  doc.text(`${t.turno} | ${new Date().toLocaleDateString('pt-BR')}`, pageW - marginX - wallT - 2, headerH / 2 + 1.5, { align: 'right' })

  // Room frame
  doc.setFillColor(...rgb(C.floor))
  doc.roundedRect(frameLeft, frameTop, frameW, frameH, 2, 2, 'F')
  doc.setFillColor(...rgb(C.wall))
  doc.rect(frameLeft, frameTop, frameW, wallT, 'F')
  doc.rect(frameLeft, frameBottom - wallT, frameW, wallT, 'F')
  doc.rect(frameLeft, frameTop, wallT, frameH, 'F')
  doc.rect(frameRight - wallT, frameTop, wallT, frameH, 'F')

  // Board
  const boardW = Math.min(frameW * 0.4, 80)
  doc.setFillColor(...rgb(C.boardBg))
  doc.setDrawColor(...rgb(C.boardBorder))
  doc.setLineWidth(0.3)
  doc.roundedRect((pageW - boardW) / 2, frameTop + wallT - 1, boardW, boardH, 1, 1, 'FD')
  doc.setTextColor(...rgb(C.boardBorder))
  doc.setFontSize(5); doc.setFont('helvetica', 'bold')
  doc.text(t.roomConfig?.boardLabel || 'QUADRO', pageW / 2, frameTop + wallT + boardH / 2, { align: 'center' })

  // Teacher
  if (t.roomConfig?.teacherDesk !== 'none') {
    const tW = 22, tH = 7
    const tY = frameTop + wallT + boardH + 1
    const pos = t.roomConfig?.teacherDesk || 'center'
    const tX = pos === 'left' ? frameLeft + wallT + 6 : pos === 'right' ? frameRight - wallT - tW - 6 : (pageW - tW) / 2
    doc.setFillColor(...rgb(C.teacherBg)); doc.setDrawColor(...rgb(C.teacherBorder)); doc.setLineWidth(0.3)
    doc.roundedRect(tX, tY, tW, tH, 1, 1, 'FD')
    doc.setTextColor(...rgb(C.teacherText)); doc.setFontSize(5); doc.setFont('helvetica', 'bold')
    doc.text('Professor', tX + tW / 2, tY + tH / 2 + 1, { align: 'center' })
  }

  // Desks
  t.grid.forEach((row, rIdx) => {
    row.forEach((cell, cIdx) => {
      const x = gridStartX + cIdx * (cellW + gap)
      const y = gridStartY + rIdx * (cellH + gap)
      if (cell.tipo === 'vazio') return
      if (cell.tipo === 'bloqueado') {
        doc.setFillColor(...rgb(C.blocked)); doc.setDrawColor(...rgb(C.blockedBorder)); doc.setLineWidth(0.2)
        doc.roundedRect(x, y, cellW, deskH, 1, 1, 'FD')
        return
      }
      const aluno = cell.alunoId ? t.alunoMap.get(Number(cell.alunoId)) : null
      const occupied = !!aluno
      // Connectors
      const blockId = getCellBlockId(cell, rIdx, cIdx)
      if (blockId) {
        if (getCellBlockId(t.grid[rIdx]?.[cIdx + 1], rIdx, cIdx + 1) === blockId) {
          doc.setFillColor(...(occupied ? rgb(C.deskOccupied) : rgb(C.deskEmpty)))
          doc.rect(x + cellW - 0.5, y + 2, gap + 1, deskH - 4, 'F')
        }
      }
      // Shadow
      doc.setFillColor(0, 0, 0); doc.setGState(doc.GState({ opacity: 0.05 }))
      doc.roundedRect(x + 0.3, y + 0.4, cellW, deskH, 1, 1, 'F')
      doc.setGState(doc.GState({ opacity: 1 }))
      // Desk
      doc.setFillColor(...(occupied ? rgb(C.deskOccupied) : rgb(C.deskEmpty)))
      doc.setDrawColor(...(occupied ? rgb(C.deskOccupiedBorder) : rgb(C.deskEmptyBorder)))
      doc.setLineWidth(occupied ? 0.3 : 0.15)
      doc.roundedRect(x, y, cellW, deskH, 1, 1, 'FD')
      if (aluno) {
        doc.setTextColor(...rgb(C.studentNum)); doc.setFontSize(6); doc.setFont('helvetica', 'bold')
        doc.text(`${aluno.numero ?? '?'}`, x + cellW / 2, y + deskH * 0.37, { align: 'center' })
        doc.setTextColor(...rgb(C.studentName)); doc.setFontSize(4.5); doc.setFont('helvetica', 'normal')
        const maxChars = Math.floor(cellW / 1.8)
        const nome = displayName(aluno, Array.from(t.alunoMap.values()))
        doc.text(nome.length > maxChars ? nome.substring(0, maxChars) + '..' : nome, x + cellW / 2, y + deskH * 0.68, { align: 'center' })
      }
      // Chair
      const cW = Math.min(cellW * 0.4, 4)
      doc.setFillColor(...(occupied ? rgb(C.chair) : rgb(C.chairEmpty)))
      doc.roundedRect(x + cellW / 2 - cW / 2, y + deskH + 0.3, cW, chairH, 0.4, 0.4, 'F')
    })
  })

  // Stats
  const totalSeats = t.grid.reduce((s, r) => s + r.filter(c => c.tipo === 'carteira').length, 0)
  const placed = t.grid.reduce((s, r) => s + r.filter(c => c.alunoId != null).length, 0)
  doc.setTextColor(140, 140, 140); doc.setFontSize(5); doc.setFont('helvetica', 'normal')
  doc.text(`${placed}/${totalSeats} alunos`, frameLeft + wallT + 2, frameBottom - wallT - 1.5)

  // QR
  if (t.shareUrl) {
    const qr = generateQrDataUrl(t.shareUrl, 400)
    if (qr) { doc.addImage(qr, 'PNG', frameRight - wallT - 17, frameBottom - wallT - 17, 16, 16) }
  }
}

export function generateAllMapsPdf(options: CompilePdfOptions) {
  if (options.turmas.length === 0) return

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  options.turmas.forEach((t, i) => {
    if (i > 0) doc.addPage()
    renderMapPage(doc, t, options.escolaNome, options.escolaLogoUrl)
  })

  const prefix = options.escolaNome ? options.escolaNome.replace(/\s+/g, '-').toLowerCase() : 'salamap'
  doc.save(`${prefix}-todos-os-mapas.pdf`)
}

export function generateAllStudentListsPdf(options: CompilePdfOptions) {
  if (options.turmas.length === 0) return

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()

  options.turmas.forEach((t, i) => {
    if (i > 0) doc.addPage()

    // Header
    doc.setFillColor(5, 46, 22)
    doc.rect(0, 0, pageW, 16, 'F')

    let hx = 10
    if (options.escolaLogoUrl) {
      try { doc.addImage(options.escolaLogoUrl, 'PNG', 6, 1.5, 13, 13); hx = 22 } catch {}
    }

    doc.setTextColor(255, 255, 255)
    if (options.escolaNome) {
      doc.setFontSize(7); doc.setFont('helvetica', 'normal')
      doc.text(options.escolaNome, hx, 6)
    }
    doc.setFontSize(11); doc.setFont('helvetica', 'bold')
    doc.text(`Lista de Alunos - ${t.serie} ${t.turma}`, hx, options.escolaNome ? 13 : 10)

    doc.setFontSize(8); doc.setFont('helvetica', 'normal')
    doc.text(`Turno: ${t.turno}`, pageW - 10, 10, { align: 'right' })

    // Students
    const alunos = Array.from(t.alunoMap.values()).sort((a, b) => (a.numero ?? 999) - (b.numero ?? 999))
    const startY = 24
    const rowH = 7
    const colW = (pageW - 20) / 2

    alunos.forEach((aluno, idx) => {
      const col = idx % 2
      const row = Math.floor(idx / 2)
      const x = 10 + col * colW
      const y = startY + row * rowH

      if (y > pageH - 15) return // nao ultrapassa pagina

      // Numero
      doc.setFillColor(209, 250, 229) // emerald-100
      doc.roundedRect(x, y, 5, 5, 1, 1, 'F')
      doc.setTextColor(21, 128, 61)
      doc.setFontSize(6); doc.setFont('helvetica', 'bold')
      doc.text(`${aluno.numero ?? '?'}`, x + 2.5, y + 3.5, { align: 'center' })

      // Nome
      doc.setTextColor(55, 65, 81)
      doc.setFontSize(8); doc.setFont('helvetica', 'normal')
      doc.text(aluno.nome, x + 7, y + 3.5)
    })

    // Footer
    doc.setTextColor(160, 160, 160); doc.setFontSize(5)
    doc.text('SalaMap', pageW / 2, pageH - 5, { align: 'center' })
  })

  const prefix = options.escolaNome ? options.escolaNome.replace(/\s+/g, '-').toLowerCase() : 'salamap'
  doc.save(`${prefix}-todas-as-listas.pdf`)
}
