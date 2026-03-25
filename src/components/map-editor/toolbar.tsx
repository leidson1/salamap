'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Eraser, RotateCcw, Save, Check, Loader2, AlertCircle,
  Printer, FileText, Users, Move, Plus, DoorOpen, PanelTop, Square, Ban,
} from 'lucide-react'
import type { CellType } from '@/types/database'

interface ToolbarProps {
  linhas: number
  colunas: number
  layoutTipo: string
  saveStatus: 'idle' | 'saving' | 'saved' | 'error'
  mode: 'alunos' | 'mobiliar'
  onLinhasChange: (val: number) => void
  onColunasChange: (val: number) => void
  onLayoutChange: (val: string) => void
  onClear: () => void
  onReset: () => void
  onSave: () => void
  onModeChange: (mode: 'alunos' | 'mobiliar') => void
  onAddElement?: (tipo: CellType) => void
  onPrintMap?: () => void
  onPrintList?: () => void
}

export function Toolbar({
  linhas, colunas, layoutTipo, saveStatus, mode,
  onLinhasChange, onColunasChange, onLayoutChange,
  onClear, onReset, onSave, onModeChange, onAddElement,
  onPrintMap, onPrintList,
}: ToolbarProps) {
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
          Mobiliar
        </button>
      </div>

      {/* Controls */}
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

        {/* Add element (mobiliar mode) */}
        {mode === 'mobiliar' && onAddElement && (
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
              <Plus className="size-3.5 mr-1" />
              Adicionar
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => onAddElement('porta')}>
                <DoorOpen className="size-4" />
                Porta
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAddElement('quadro')}>
                <PanelTop className="size-4" />
                Quadro
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAddElement('janela')}>
                <Square className="size-4" />
                Janela
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAddElement('bloqueado')}>
                <Ban className="size-4" />
                Obstaculo
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAddElement('professor')}>
                <Users className="size-4" />
                Mesa Professor
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
          <Button variant="outline" size="sm" onClick={onClear} title="Limpar alunos">
            <Eraser className="size-3.5 mr-1" />
            Limpar
          </Button>
          <Button variant="outline" size="sm" onClick={onReset} title="Resetar layout">
            <RotateCcw className="size-3.5 mr-1" />
            Resetar
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
