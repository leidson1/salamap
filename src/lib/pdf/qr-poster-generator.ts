import jsPDF from 'jspdf'
import { generateQrDataUrl } from '@/components/qr-code-card'

interface QrPosterOptions {
  url: string
  serie: string
  turma: string
  turno: string
  updatedAt: string
  escolaNome?: string
  escolaLogoUrl?: string
}

export function generateQrPoster(options: QrPosterOptions) {
  const { url, serie, turma, turno, updatedAt, escolaNome, escolaLogoUrl } = options

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()

  // --- Header bar ---
  doc.setFillColor(5, 46, 22) // emerald-950
  doc.rect(0, 0, pageW, 65, 'F')

  // Logo (se existir)
  if (escolaLogoUrl) {
    try {
      doc.addImage(escolaLogoUrl, 'PNG', pageW / 2 - 8, 5, 16, 16)
    } catch { /* logo nao carregou */ }
  }

  // Title
  doc.setTextColor(255, 255, 255)
  const titleStartY = escolaLogoUrl ? 28 : 22

  if (escolaNome) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(escolaNome, pageW / 2, titleStartY - 4, { align: 'center' })
  }

  doc.setFontSize(14)
  doc.setFont('helvetica', 'normal')
  doc.text('MAPA DE SALA', pageW / 2, titleStartY, { align: 'center' })

  doc.setFontSize(32)
  doc.setFont('helvetica', 'bold')
  doc.text(`${serie} ${turma}`, pageW / 2, titleStartY + 18, { align: 'center' })

  doc.setFontSize(13)
  doc.setFont('helvetica', 'normal')
  doc.text(`Turno: ${turno}`, pageW / 2, titleStartY + 30, { align: 'center' })

  // --- QR Code (grande e centralizado) ---
  const qrDataUrl = generateQrDataUrl(url, 800)
  const qrSize = 110
  const qrX = (pageW - qrSize) / 2
  const qrY = 82

  // QR border/frame
  doc.setDrawColor(220, 220, 220)
  doc.setLineWidth(0.5)
  doc.roundedRect(qrX - 6, qrY - 6, qrSize + 12, qrSize + 12, 4, 4)

  if (qrDataUrl) {
    doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize)
  }

  // --- Instructions ---
  const instrY = qrY + qrSize + 22

  doc.setTextColor(30, 30, 30)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('Aponte a camera do celular', pageW / 2, instrY, { align: 'center' })
  doc.text('para o QR Code acima', pageW / 2, instrY + 8, { align: 'center' })

  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  doc.text('O mapa estara sempre atualizado.', pageW / 2, instrY + 22, { align: 'center' })
  doc.text('Nao precisa de login.', pageW / 2, instrY + 30, { align: 'center' })

  // --- Updated at ---
  if (updatedAt) {
    const dateStr = new Date(updatedAt).toLocaleString('pt-BR')
    doc.setFontSize(9)
    doc.setTextColor(140)
    doc.text(`Ultima atualizacao: ${dateStr}`, pageW / 2, instrY + 45, { align: 'center' })
  }

  // --- Footer ---
  doc.setFillColor(245, 245, 245)
  doc.rect(0, pageH - 18, pageW, 18, 'F')

  doc.setFontSize(7)
  doc.setTextColor(160)
  doc.text('SalaMap - salamap.profdia.com.br', pageW / 2, pageH - 10, { align: 'center' })
  doc.setFontSize(6)
  doc.text(url, pageW / 2, pageH - 5, { align: 'center' })

  doc.save(`qr-poster-${serie}-${turma}.pdf`)
}
