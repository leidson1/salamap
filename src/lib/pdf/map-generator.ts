import jsPDF from 'jspdf'
import type { Grid } from '@/types/database'

interface MapPdfOptions {
  grid: Grid
  linhas: number
  colunas: number
  serie: string
  turma: string
  turno: string
  alunoMap: Map<number, { nome: string; numero: number | null }>
}

export function generateMapPdf(options: MapPdfOptions) {
  const { grid, colunas, serie, turma, turno, alunoMap } = options

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()

  // Header
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(`Mapa de Sala - ${serie} ${turma}`, pageW / 2, 15, { align: 'center' })

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Turno: ${turno} | Data: ${new Date().toLocaleDateString('pt-BR')}`, pageW / 2, 22, { align: 'center' })

  // Grid
  const marginX = 15
  const marginY = 30
  const availW = pageW - marginX * 2
  const availH = pageH - marginY - 15
  const cellW = Math.min(availW / colunas, 40)
  const cellH = Math.min(availH / grid.length, 20)
  const gridW = cellW * colunas
  const startX = (pageW - gridW) / 2

  grid.forEach((row, rIdx) => {
    row.forEach((cell, cIdx) => {
      const x = startX + cIdx * cellW
      const y = marginY + rIdx * cellH

      if (cell.tipo === 'vazio') return

      if (cell.tipo === 'bloqueado') {
        doc.setFillColor(200, 200, 200)
        doc.rect(x, y, cellW, cellH, 'FD')
        doc.setFontSize(7)
        doc.text('X', x + cellW / 2, y + cellH / 2 + 1, { align: 'center' })
        return
      }

      // carteira
      const aluno = cell.alunoId ? alunoMap.get(cell.alunoId) : null
      if (aluno) {
        doc.setFillColor(236, 253, 245) // emerald-50
        doc.rect(x, y, cellW, cellH, 'FD')
        doc.setFontSize(7)
        doc.setFont('helvetica', 'bold')
        doc.text(`${aluno.numero ?? '?'}`, x + cellW / 2, y + cellH / 2 - 2, { align: 'center' })
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(6)
        const nome = aluno.nome.length > 12 ? aluno.nome.substring(0, 12) + '...' : aluno.nome
        doc.text(nome, x + cellW / 2, y + cellH / 2 + 3, { align: 'center' })
      } else {
        doc.setDrawColor(200, 200, 200)
        doc.setLineDashPattern([1, 1], 0)
        doc.rect(x, y, cellW, cellH)
        doc.setLineDashPattern([], 0)
      }
    })
  })

  // Footer
  doc.setFontSize(7)
  doc.setTextColor(150)
  doc.text('Gerado pelo SalaMap - salamap.profdia.com.br', pageW / 2, pageH - 5, { align: 'center' })

  doc.save(`mapa-${serie}-${turma}.pdf`)
}
