import jsPDF from 'jspdf'
import { generateQrDataUrl } from '@/components/qr-code-card'

interface QrPosterOptions {
  url: string
  serie: string
  turma: string
  turno: string
  updatedAt: string
}

export function generateQrPoster(options: QrPosterOptions) {
  const { url, serie, turma, turno, updatedAt } = options

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()

  // Background accent
  doc.setFillColor(5, 46, 22) // emerald-950
  doc.rect(0, 0, pageW, 60, 'F')

  // Title
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(28)
  doc.setFont('helvetica', 'bold')
  doc.text('Mapa de Sala', pageW / 2, 30, { align: 'center' })

  doc.setFontSize(20)
  doc.text(`${serie} ${turma}`, pageW / 2, 45, { align: 'center' })

  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text(`Turno: ${turno}`, pageW / 2, 55, { align: 'center' })

  // QR Code
  const qrDataUrl = generateQrDataUrl(url, 800)
  const qrSize = 100
  const qrX = (pageW - qrSize) / 2
  const qrY = 80

  if (qrDataUrl) {
    doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize)
  }

  // Instructions
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Escaneie o QR Code', pageW / 2, qrY + qrSize + 15, { align: 'center' })

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text('para ver o mapa de sala atualizado', pageW / 2, qrY + qrSize + 23, { align: 'center' })

  // URL
  doc.setFontSize(8)
  doc.setTextColor(100)
  doc.text(url, pageW / 2, qrY + qrSize + 33, { align: 'center' })

  // Updated at
  if (updatedAt) {
    const dateStr = new Date(updatedAt).toLocaleString('pt-BR')
    doc.setFontSize(9)
    doc.text(`Ultima atualizacao: ${dateStr}`, pageW / 2, qrY + qrSize + 42, { align: 'center' })
  }

  // Footer
  doc.setFontSize(8)
  doc.setTextColor(150)
  doc.text('SalaMap - salamap.profdia.com.br', pageW / 2, pageH - 10, { align: 'center' })

  doc.save(`qr-poster-${serie}-${turma}.pdf`)
}
