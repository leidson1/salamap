'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Eraser, RotateCcw, Save, Check, Loader2, AlertCircle, Printer, FileText } from 'lucide-react'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface ToolbarProps {
  linhas: number
  colunas: number
  layoutTipo: string
  saveStatus: 'idle' | 'saving' | 'saved' | 'error'
  onLinhasChange: (val: number) => void
  onColunasChange: (val: number) => void
  onLayoutChange: (val: string) => void
  onClear: () => void
  onReset: () => void
  onSave: () => void
  onPrintMap?: () => void
  onPrintList?: () => void
}

export function Toolbar({
  linhas, colunas, layoutTipo, saveStatus,
  onLinhasChange, onColunasChange, onLayoutChange,
  onClear, onReset, onSave, onPrintMap, onPrintList,
}: ToolbarProps) {
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-white p-3">
      <div className="space-y-1">
        <Label className="text-xs">Linhas</Label>
        <Input
          type="number"
          min={1}
          max={12}
          value={linhas}
          onChange={(e) => onLinhasChange(Math.max(1, Math.min(12, parseInt(e.target.value) || 1)))}
          className="w-20 h-8 text-sm"
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Colunas</Label>
        <Input
          type="number"
          min={1}
          max={12}
          value={colunas}
          onChange={(e) => onColunasChange(Math.max(1, Math.min(12, parseInt(e.target.value) || 1)))}
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
            <SelectItem value="tradicional">Tradicional</SelectItem>
            <SelectItem value="u">Formato U</SelectItem>
            <SelectItem value="grupos">Grupos</SelectItem>
          </SelectContent>
        </Select>
      </div>

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
                  Imprimir Mapa (PDF)
                </DropdownMenuItem>
              )}
              {onPrintList && (
                <DropdownMenuItem onClick={onPrintList}>
                  <FileText className="size-4" />
                  Imprimir Lista (PDF)
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <Button variant="outline" size="sm" onClick={onClear} title="Limpar alunos do mapa">
          <Eraser className="size-3.5 mr-1" />
          Limpar
        </Button>
        <Button variant="outline" size="sm" onClick={onReset} title="Resetar layout">
          <RotateCcw className="size-3.5 mr-1" />
          Resetar
        </Button>
        <Button size="sm" onClick={onSave}>
          {saveStatus === 'saving' ? (
            <>
              <Loader2 className="size-3.5 mr-1 animate-spin" />
              Salvando...
            </>
          ) : saveStatus === 'saved' ? (
            <>
              <Check className="size-3.5 mr-1" />
              Salvo!
            </>
          ) : saveStatus === 'error' ? (
            <>
              <AlertCircle className="size-3.5 mr-1" />
              Erro
            </>
          ) : (
            <>
              <Save className="size-3.5 mr-1" />
              Salvar
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
