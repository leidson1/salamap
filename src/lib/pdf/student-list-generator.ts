import jsPDF from 'jspdf'

interface StudentListPdfOptions {
  serie: string
  turma: string
  turno: string
  alunos: Array<{ nome: string; numero: number | null }>
}

export function generateStudentListPdf(options: StudentListPdfOptions) {
  const { serie, turma, turno, alunos } = options

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()

  // Header
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(`Lista de Alunos - ${serie} ${turma}`, pageW / 2, 20, { align: 'center' })

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Turno: ${turno} | Total: ${alunos.length} alunos`, pageW / 2, 28, { align: 'center' })

  // Table header
  const startX = 20
  let y = 38

  doc.setFillColor(240, 240, 240)
  doc.rect(startX, y - 5, pageW - 40, 8, 'F')
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('N.o', startX + 5, y)
  doc.text('Nome do Aluno', startX + 20, y)
  y += 8

  // Table rows
  const sorted = [...alunos].sort((a, b) => (a.numero ?? 999) - (b.numero ?? 999))

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)

  sorted.forEach((aluno) => {
    if (y > 275) {
      doc.addPage()
      y = 20
    }

    doc.setDrawColor(230, 230, 230)
    doc.line(startX, y + 2, pageW - 20, y + 2)

    doc.text(`${aluno.numero ?? '-'}`, startX + 5, y)
    doc.text(aluno.nome, startX + 20, y)
    y += 7
  })

  // Footer
  doc.setFontSize(7)
  doc.setTextColor(150)
  const pageH = doc.internal.pageSize.getHeight()
  doc.text(`Gerado pelo SalaMap - salamap.profdia.com.br | ${new Date().toLocaleDateString('pt-BR')}`, pageW / 2, pageH - 5, { align: 'center' })

  doc.save(`alunos-${serie}-${turma}.pdf`)
}
