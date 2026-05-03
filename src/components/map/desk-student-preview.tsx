'use client'

import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { displayName } from '@/lib/map/utils'
import { cn } from '@/lib/utils'
import type { DeskNameMode } from '@/types/database'

type PreviewStudent = {
  nome: string
  numero?: number | null
  apelido?: string | null
}

interface DeskStudentPreviewProps {
  aluno: PreviewStudent | null
  nameMode: DeskNameMode
  className?: string
  onClear?: () => void
}

export function DeskStudentPreview({
  aluno,
  nameMode,
  className,
  onClear,
}: DeskStudentPreviewProps) {
  if (!aluno) return null

  const fullName = aluno.nome.trim()
  const deskLabel = displayName(aluno, undefined, nameMode)
  const apelido = aluno.apelido?.trim() || null
  const showsAlternateLabel = deskLabel !== fullName

  return (
    <div
      className={cn(
        'rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-white px-3 py-2.5 shadow-sm',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-emerald-200 bg-white/90 text-emerald-700">
              Carteira selecionada
            </Badge>
            {aluno.numero != null && (
              <Badge variant="outline" className="bg-white/90">
                N#{aluno.numero}
              </Badge>
            )}
          </div>

          <p className="mt-2 truncate text-sm font-semibold text-foreground">
            {fullName}
          </p>

          {showsAlternateLabel && (
            <p className="mt-1 text-xs text-muted-foreground">
              Na carteira aparece: <span className="font-medium text-foreground">{deskLabel}</span>
            </p>
          )}

          {apelido && apelido !== fullName && (
            <p className="mt-1 text-xs text-muted-foreground">
              Apelido: <span className="font-medium text-foreground">{apelido}</span>
            </p>
          )}
        </div>

        {onClear && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-muted-foreground"
            onClick={onClear}
            aria-label="Ocultar nome completo"
          >
            <X className="size-3.5" />
          </Button>
        )}
      </div>
    </div>
  )
}
