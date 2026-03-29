'use client'

import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LAYOUT_OPTIONS } from '@/lib/map/presets'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Eraser, RotateCcw, Save, Check, Loader2, AlertCircle,
  Printer, FileText, Users, Move, DoorOpen,
} from 'lucide-react'

interface ToolbarProps {
  linhas: number
  colunas: number
  layoutTipo: string
  saveStatus: 'idle' | 'saving' | 'saved' | 'error'
  mode: 'alunos' | 'mobiliar' | 'sala'
  onLinhasChange: (val: number) => void
  onColunasChange: (val: number) => void
  onLayoutChange: (val: string) => void
  onClear: () => void
  onReset: () => void
  onSave: () => void
  onModeChange: (mode: 'alunos' | 'mobiliar' | 'sala') => void
  onPrintMap?: () => void
  onPrintList?: () => void
}

function clampDimension(value: number) {
  return Math.max(1, Math.min(12, value))
}

export function Toolbar({
  linhas, colunas, layoutTipo, saveStatus, mode,
  onLinhasChange, onColunasChange, onLayoutChange,
  onClear, onReset, onSave, onModeChange,
  onPrintMap, onPrintList,
}: ToolbarProps) {
  const [linhasInput, setLinhasInput] = useState(String(linhas))
  const [colunasInput, setColunasInput] = useState(String(colunas))

  useEffect(() => {
    setLinhasInput(String(linhas))
  }, [linhas])

  useEffect(() => {
    setColunasInput(String(colunas))
  }, [colunas])

  const helperText = mode === 'alunos'
    ? 'Selecione um aluno e clique em uma carteira para posicionar.'
    : mode === 'mobiliar'
      ? 'Use ferramentas para inserir blocos ou arraste blocos inteiros com Mover.'
      : 'Arraste elementos no canvas ou ajuste tudo pelo painel lateral.'

  const clearLabel = mode === 'alunos' ? 'Limpar Alunos' : mode === 'mobiliar' ? 'Limpar Carteiras' : 'Limpar'
  const resetLabel = 'Resetar Layout'

  const commitLinhasChange = () => {
    const parsed = Number.parseInt(linhasInput, 10)
    const nextValue = Number.isNaN(parsed) ? linhas : clampDimension(parsed)
    setLinhasInput(String(nextValue))
    if (nextValue !== linhas) {
      onLinhasChange(nextValue)
    }
  }

  const commitColunasChange = () => {
    const parsed = Number.parseInt(colunasInput, 10)
    const nextValue = Number.isNaN(parsed) ? colunas : clampDimension(parsed)
    setColunasInput(String(nextValue))
    if (nextValue !== colunas) {
      onColunasChange(nextValue)
    }
  }

  return (
    <div className="space-y-2">
      {/* Mode toggle */}
      <div className="flex items-center gap-1 rounded-lg border bg-white p-1">
        <button
          onClick={() => onModeChange('alunos')}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            mode === 'alunos'
              ? 'bg-emerald-100 text-emerald-700'
              : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          <Users className="size-3.5" />
          Alunos
        </button>
        <button
          onClick={() => onModeChange('mobiliar')}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            mode === 'mobiliar'
              ? 'bg-amber-100 text-amber-700'
              : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          <Move className="size-3.5" />
          Carteiras
        </button>
        <button
          onClick={() => onModeChange('sala')}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            mode === 'sala'
              ? 'bg-sky-100 text-sky-700'
              : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          <DoorOpen className="size-3.5" />
          Sala
        </button>
        <span className="ml-2 hidden text-[10px] text-muted-foreground sm:inline">
          {helperText}
        </span>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-white p-3">
        {mode === 'mobiliar' && (
          <>
            <div className="space-y-1">
              <Label className="text-xs">Linhas</Label>
              <Input
                type="number"
                min={1}
                max={12}
                value={linhasInput}
                onChange={(e) => setLinhasInput(e.target.value)}
                onBlur={commitLinhasChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur()
                  }
                }}
                className="w-20 h-8 text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Colunas</Label>
              <Input
                type="number"
                min={1}
                max={12}
                value={colunasInput}
                onChange={(e) => setColunasInput(e.target.value)}
                onBlur={commitColunasChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur()
                  }
                }}
                className="w-20 h-8 text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Layout</Label>
              <Select value={layoutTipo} onValueChange={(val) => { if (val) onLayoutChange(val) }}>
                <SelectTrigger className="w-36 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LAYOUT_OPTIONS.map((layout) => (
                    <SelectItem key={layout.value} value={layout.value}>
                      {layout.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        <div className="flex gap-1.5 ml-auto">
          {(onPrintMap || onPrintList) && (
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
                <Printer className="size-3.5 mr-1" />
                Imprimir
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onPrintMap && (
                  <DropdownMenuItem onClick={onPrintMap}>
                    <FileText className="size-4" />
                    Mapa (PDF)
                  </DropdownMenuItem>
                )}
                {onPrintList && (
                  <DropdownMenuItem onClick={onPrintList}>
                    <FileText className="size-4" />
                    Lista (PDF)
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button variant="outline" size="sm" onClick={onClear} title={clearLabel}>
            <Eraser className="size-3.5 mr-1" />
            {clearLabel}
          </Button>
          <Button variant="outline" size="sm" onClick={onReset} title={resetLabel}>
            <RotateCcw className="size-3.5 mr-1" />
            {resetLabel}
          </Button>
          <Button size="sm" onClick={onSave}>
            {saveStatus === 'saving' ? (
              <><Loader2 className="size-3.5 mr-1 animate-spin" />Salvando...</>
            ) : saveStatus === 'saved' ? (
              <><Check className="size-3.5 mr-1" />Salvo!</>
            ) : saveStatus === 'error' ? (
              <><AlertCircle className="size-3.5 mr-1" />Erro</>
            ) : (
              <><Save className="size-3.5 mr-1" />Salvar</>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
