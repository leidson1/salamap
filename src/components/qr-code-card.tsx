'use client'

import { useEffect, useRef } from 'react'
import qrcode from 'qrcode-generator'

interface QrCodeCardProps {
  url: string
  size?: number
}

export function QrCodeCard({ url, size = 200 }: QrCodeCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    const qr = qrcode(0, 'M')
    qr.addData(url)
    qr.make()

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const moduleCount = qr.getModuleCount()
    const cellSize = size / moduleCount
    canvas.width = size
    canvas.height = size

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, size, size)

    ctx.fillStyle = '#000000'
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        if (qr.isDark(row, col)) {
          ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize)
        }
      }
    }
  }, [url, size])

  return (
    <canvas
      ref={canvasRef}
      className="rounded-lg border shadow-sm"
      style={{ width: size, height: size }}
    />
  )
}

export function generateQrDataUrl(url: string, size: number = 400): string {
  const qr = qrcode(0, 'M')
  qr.addData(url)
  qr.make()

  const moduleCount = qr.getModuleCount()
  const cellSize = size / moduleCount

  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, size, size)

  ctx.fillStyle = '#000000'
  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      if (qr.isDark(row, col)) {
        ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize)
      }
    }
  }

  return canvas.toDataURL('image/png')
}
