'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  countFurnitureBlocks,
  DEFAULT_FURNITURE_COMPOSER_CONFIG,
  FURNITURE_COMPOSER_PRESETS,
  FURNITURE_TOOLS,
  getFurnitureBlockDetails,
  normalizeFurnitureComposerConfig,
  type FurnitureComposerConfig,
  type FurnitureResizeAction,
  type FurnitureTool,
} from '@/lib/map/furniture-tools'
import { cn } from '@/lib/utils'
import type { Grid } from '@/types/database'
import { GripVertical, MousePointer2, Sparkles, Trash2, RotateCw, Ruler, Move, Eraser, Ban, Footprints } from 'lucide-react'

const TOOL_ICONS: Partial<Record<FurnitureTool, React.ReactNode>> = {
  move: <Move className="size-4" />,
  'custom-block': <Ruler className="size-4" />,
  apagar: <Eraser className="size-4" />,
  corredor: <Footprints className="size-4" />,
  bloqueio: <Ban className="size-4" />,
}

interface FurnitureStudioPanelProps {
  linhas: number
  colunas: number
  currentTool: FurnitureTool
  grid: Grid
  composerConfig: FurnitureComposerConfig
  selectedBlockId?: string | null
  onToolChange: (tool: FurnitureTool) => void
  onComposerConfigChange: (config: FurnitureComposerConfig) => void
  onResizeBlock: (action: FurnitureResizeAction) => void
  onRotateBlock: () => void
  onRotateChairs: () => void
  onSplitBlock: () => void
  onDeleteBlock: () => void
  onClearSelection: () => void
}

function countDeskSeats(grid: Grid) {
  return grid.reduce((sum, row) =>
    sum + row.filter((cell) => cell.tipo === 'carteira').length
  , 0)
}

export function FurnitureStudioPanel({
  linhas,
  colunas,
  currentTool,
  grid,
  composerConfig,
  selectedBlockId,
  onToolChange,
  onComposerConfigChange,
  onResizeBlock,
  onRotateBlock,
  onRotateChairs,
  onSplitBlock,
  onDeleteBlock,
  onClearSelection,
}: FurnitureStudioPanelProps) {
  const activeSeats = countDeskSeats(grid)
  const activeBlocks = countFurnitureBlocks(grid)
  const selectedBlock = getFurnitureBlockDetails(grid, selectedBlockId)
  const canRotate = !!selectedBlock && selectedBlock.width !== selectedBlock.height
  const canSplit = !!selectedBlock && selectedBlock.seats > 1
  const canGrowWidth = !!selectedBlock && selectedBlock.maxCol < colunas - 1
  const canGrowDepth = !!selectedBlock && selectedBlock.maxRow < linhas - 1
  const canShrinkWidth = !!selectedBlock && selectedBlock.width > 1
  const canShrinkDepth = !!selectedBlock && selectedBlock.height > 1
  const normalizedComposer = normalizeFurnitureComposerConfig(composerConfig)
  const isIndividual = normalizedComposer.kind === 'individual'
  const depthLocked = normalizedComposer.kind !== 'grupo'

  return (
    <div className="w-full lg:w-[380px] lg:shrink-0 lg:sticky lg:top-4 lg:self-start">
      <div className="space-y-4 lg:max-h-[calc(100vh-120px)] lg:overflow-y-auto lg:pr-1">
        {/* Header + metrics */}
        <Card className="border-amber-200/80 bg-gradient-to-br from-amber-50 via-white to-white">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-amber-600" />
              <CardTitle>Carteiras</CardTitle>
            </div>
            <CardDescription>
              Monte blocos, ajuste tamanho e organize o mobiliario da sala.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{linhas}x{colunas} grid</Badge>
              <Badge variant="secondary">{activeSeats} lugares</Badge>
              <Badge variant="outline">{activeBlocks} blocos</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Ferramentas — inline, sem tabs */}
        <Card>
          <CardContent className="p-3 space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Ferramenta</p>
            <div className="flex flex-wrap gap-1.5">
              {FURNITURE_TOOLS.map((tool) => (
                <button
                  key={tool.value}
                  type="button"
                  title={tool.description}
                  onClick={() => onToolChange(tool.value)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                    currentTool === tool.value
                      ? 'border-amber-400 bg-amber-50 text-amber-700'
                      : 'border-border bg-background hover:bg-muted'
                  )}
                >
                  {TOOL_ICONS[tool.value]}
                  {tool.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Criar Bloco — sempre visivel quando tool = custom-block ou acessivel */}
        <Card className={cn(
          currentTool === 'custom-block' && 'border-amber-300 bg-amber-50/30'
        )}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Ruler className="size-4 text-amber-700" />
              <CardTitle>Criar Bloco</CardTitle>
            </div>
            <CardDescription>
              Escolha o formato, ajuste o tamanho e clique no canvas para posicionar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {FURNITURE_COMPOSER_PRESETS.map((preset) => {
                const active = normalizedComposer.kind === preset.value
                return (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => {
                      onComposerConfigChange(normalizeFurnitureComposerConfig({
                        kind: preset.value,
                        width: preset.defaultWidth,
                        height: preset.defaultHeight,
                      }))
                      onToolChange('custom-block')
                    }}
                    className={cn(
                      'rounded-lg border px-2 py-2 text-left transition-colors',
                      active
                        ? 'border-amber-400 bg-amber-100 text-amber-800'
                        : 'border-border bg-background hover:bg-muted'
                    )}
                  >
                    <span className="block text-sm font-medium">{preset.label}</span>
                    <span className="mt-1 block text-[11px] leading-4 text-muted-foreground">
                      {preset.description}
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="composer-width" className="text-xs">Largura</Label>
                <Input
                  id="composer-width"
                  type="number"
                  min={1}
                  max={8}
                  disabled={isIndividual}
                  value={normalizedComposer.width}
                  onChange={(event) => onComposerConfigChange(normalizeFurnitureComposerConfig({
                    ...normalizedComposer,
                    width: parseInt(event.target.value, 10) || DEFAULT_FURNITURE_COMPOSER_CONFIG.width,
                  }))}
                  className="h-8"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="composer-height" className="text-xs">Profundidade</Label>
                <Input
                  id="composer-height"
                  type="number"
                  min={1}
                  max={4}
                  disabled={depthLocked}
                  value={normalizedComposer.height}
                  onChange={(event) => onComposerConfigChange(normalizeFurnitureComposerConfig({
                    ...normalizedComposer,
                    height: parseInt(event.target.value, 10) || DEFAULT_FURNITURE_COMPOSER_CONFIG.height,
                  }))}
                  className="h-8"
                />
              </div>
            </div>

            <div className="space-y-2 rounded-lg border bg-white/80 p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {normalizedComposer.width * normalizedComposer.height} lugares
                </p>
                <Button
                  variant={currentTool === 'custom-block' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onToolChange('custom-block')}
                >
                  {currentTool === 'custom-block' ? 'Ativo' : 'Usar no canvas'}
                </Button>
              </div>
              <div
                className="grid gap-1"
                style={{
                  gridTemplateColumns: `repeat(${normalizedComposer.width}, minmax(0, 1fr))`,
                }}
              >
                {Array.from({ length: normalizedComposer.width * normalizedComposer.height }).map((_, index) => (
                  <div
                    key={`composer-preview-${index}`}
                    className="h-5 rounded-[4px] border border-amber-300 bg-amber-100"
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bloco Selecionado */}
        <Card className={cn(selectedBlock && 'border-amber-300 bg-amber-50/40')}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MousePointer2 className="size-4 text-amber-700" />
              <CardTitle>Bloco Selecionado</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedBlock ? (
              <>
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-amber-600 text-white hover:bg-amber-600">{selectedBlock.label}</Badge>
                  <Badge variant="outline">{selectedBlock.seats} lugares</Badge>
                  <Badge variant="outline">{selectedBlock.width}x{selectedBlock.height}</Badge>
                  {selectedBlock.occupiedSeats > 0 && (
                    <Badge variant="outline">{selectedBlock.occupiedSeats} com aluno</Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" onClick={() => onResizeBlock('grow-width')} disabled={!canGrowWidth}>
                    + largura
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => onResizeBlock('grow-depth')} disabled={!canGrowDepth}>
                    + profundidade
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => onResizeBlock('shrink-width')} disabled={!canShrinkWidth}>
                    - largura
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => onResizeBlock('shrink-depth')} disabled={!canShrinkDepth}>
                    - profundidade
                  </Button>
                  <Button variant="outline" size="sm" onClick={onRotateBlock} disabled={!canRotate}>
                    <RotateCw className="mr-1.5 size-3.5" /> Girar Bloco
                  </Button>
                  <Button variant="outline" size="sm" onClick={onRotateChairs}>
                    <RotateCw className="mr-1.5 size-3.5" /> Girar Cadeiras
                  </Button>
                  <Button variant="outline" size="sm" onClick={onSplitBlock} disabled={!canSplit}>
                    <GripVertical className="mr-1.5 size-3.5" /> Separar
                  </Button>
                  <Button variant="outline" size="sm" onClick={onClearSelection}>
                    Desselecionar
                  </Button>
                  <Button variant="destructive" size="sm" onClick={onDeleteBlock}>
                    <Trash2 className="mr-1.5 size-3.5" /> Remover
                  </Button>
                </div>
              </>
            ) : (
              <div className="rounded-lg border border-dashed border-amber-300/70 bg-white/70 px-3 py-4 text-center text-sm text-muted-foreground">
                <MousePointer2 className="mx-auto mb-2 size-5 text-amber-400" />
                Ative <strong>Mover</strong> e clique em um bloco no canvas para editar.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
