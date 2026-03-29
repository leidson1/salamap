'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { LAYOUT_OPTIONS, getLayoutGenerator } from '@/lib/map/presets'
import { cn } from '@/lib/utils'
import type { Grid } from '@/types/database'
import { Armchair, LayoutGrid, MousePointer2, Sparkles, Trash2, RotateCw, Ruler } from 'lucide-react'

interface FurnitureStudioPanelProps {
  linhas: number
  colunas: number
  currentLayout: string
  currentTool: FurnitureTool
  grid: Grid
  composerConfig: FurnitureComposerConfig
  selectedBlockId?: string | null
  onApplyLayout: (layout: string) => void
  onToolChange: (tool: FurnitureTool) => void
  onComposerConfigChange: (config: FurnitureComposerConfig) => void
  onResizeBlock: (action: FurnitureResizeAction) => void
  onRotateBlock: () => void
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
  currentLayout,
  currentTool,
  grid,
  composerConfig,
  selectedBlockId,
  onApplyLayout,
  onToolChange,
  onComposerConfigChange,
  onResizeBlock,
  onRotateBlock,
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
  const depthLocked = normalizedComposer.kind !== 'grupo'

  return (
    <div className="w-full lg:w-[380px] lg:shrink-0 lg:sticky lg:top-4 lg:self-start">
      <div className="space-y-4 lg:max-h-[calc(100vh-120px)] lg:overflow-y-auto lg:pr-1">
        <Card className="border-amber-200/80 bg-gradient-to-br from-amber-50 via-white to-white">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-amber-600" />
              <CardTitle>Studio de Carteiras</CardTitle>
            </div>
            <CardDescription>
              Organize a sala por pecas, nao por celulas. Monte, selecione e ajuste com menos atrito.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{linhas} linhas</Badge>
              <Badge variant="outline">{colunas} colunas</Badge>
              <Badge variant="secondary">{activeSeats} lugares ativos</Badge>
              <Badge variant="outline">{activeBlocks} pecas</Badge>
            </div>
            <p className="text-xs leading-5 text-muted-foreground">
              Comece por um layout base ou va direto para o compositor e refine no canvas.
            </p>
          </CardContent>
        </Card>

        <Card className={cn(selectedBlock && 'border-amber-300 bg-amber-50/40')}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MousePointer2 className="size-4 text-amber-700" />
              <CardTitle>Peca Selecionada</CardTitle>
            </div>
            <CardDescription>
              {selectedBlock
                ? 'Use o inspetor para ajustar a peca inteira como um objeto unico.'
                : 'No modo mover, clique em uma peca do canvas para abrir o inspetor.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedBlock ? (
              <>
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-amber-600 text-white hover:bg-amber-600">{selectedBlock.label}</Badge>
                  <Badge variant="outline">{selectedBlock.seats} lugares</Badge>
                  <Badge variant="outline">{selectedBlock.width}x{selectedBlock.height}</Badge>
                  <Badge variant="outline">{selectedBlock.occupiedSeats} ocupados</Badge>
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
                    <RotateCw className="mr-2 size-4" /> Girar
                  </Button>
                  <Button variant="outline" size="sm" onClick={onSplitBlock} disabled={!canSplit}>
                    Separar
                  </Button>
                  <Button variant="outline" size="sm" onClick={onClearSelection}>
                    Limpar foco
                  </Button>
                  <Button variant="destructive" size="sm" onClick={onDeleteBlock}>
                    <Trash2 className="mr-2 size-4" /> Remover
                  </Button>
                </div>
              </>
            ) : (
              <div className="rounded-lg border border-dashed border-amber-300/70 bg-white/70 px-3 py-4 text-sm text-muted-foreground">
                Selecione um bloco de mobiliario para girar, separar em lugares individuais ou remover.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <Tabs defaultValue="ferramentas" className="gap-3">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="ferramentas">Ferramentas</TabsTrigger>
                <TabsTrigger value="compositor">Compositor</TabsTrigger>
                <TabsTrigger value="layouts">Layouts</TabsTrigger>
              </TabsList>

              <TabsContent value="ferramentas" className="space-y-3">
                <div className="rounded-xl border bg-white p-3">
                  <div className="mb-3">
                    <p className="text-sm font-medium text-foreground">Ferramenta ativa</p>
                    <p className="text-xs text-muted-foreground">
                      Troque rapido entre mover, editar bloqueios e inserir mobiliario.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {FURNITURE_TOOLS.map((tool) => (
                      <button
                        key={tool.value}
                        type="button"
                        onClick={() => onToolChange(tool.value)}
                        className={cn(
                          'rounded-lg border px-3 py-2 text-left transition-colors',
                          currentTool === tool.value
                            ? 'border-amber-400 bg-amber-50 text-amber-700'
                            : 'border-border bg-background hover:bg-muted'
                        )}
                      >
                        <span className="block text-sm font-medium">{tool.label}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {tool.description}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="compositor" className="space-y-3">
                <div className={cn(
                  'rounded-xl border bg-white p-3',
                  currentTool === 'custom-block' && 'border-amber-300 bg-amber-50/30'
                )}>
                  <div className="mb-3 flex items-center gap-2">
                    <Ruler className="size-4 text-amber-700" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Compositor de Pecas</p>
                      <p className="text-xs text-muted-foreground">
                        Monte fileiras grandes, grupos e bancadas sem depender de presets fixos.
                      </p>
                    </div>
                  </div>

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

                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="composer-width" className="text-xs">Largura</Label>
                      <Input
                        id="composer-width"
                        type="number"
                        min={1}
                        max={8}
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

                  <div className="mt-3 space-y-2 rounded-lg border bg-white/80 p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">Preview da peca</p>
                        <p className="text-xs text-muted-foreground">
                          {normalizedComposer.width * normalizedComposer.height} lugares previstos
                        </p>
                      </div>
                      <Button
                        variant={currentTool === 'custom-block' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => onToolChange('custom-block')}
                      >
                        {currentTool === 'custom-block' ? 'Compositor ativo' : 'Usar no canvas'}
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
                </div>
              </TabsContent>

              <TabsContent value="layouts" className="space-y-3">
                {LAYOUT_OPTIONS.map((layout) => {
                  const previewGrid = getLayoutGenerator(layout.value)(linhas, colunas)
                  const seatCount = countDeskSeats(previewGrid)
                  const active = currentLayout === layout.value

                  return (
                    <Card
                      key={layout.value}
                      className={cn(
                        'transition-all',
                        active && 'ring-2 ring-amber-300'
                      )}
                    >
                      <CardHeader>
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              'rounded-lg p-2',
                              active ? 'bg-amber-100 text-amber-700' : 'bg-muted text-muted-foreground'
                            )}>
                              {layout.value === 'grupos'
                                ? <LayoutGrid className="size-4" />
                                : <Armchair className="size-4" />}
                            </div>
                            <div>
                              <CardTitle>{layout.label}</CardTitle>
                              <CardDescription>{layout.description}</CardDescription>
                            </div>
                          </div>
                          <Badge variant={active ? 'default' : 'outline'}>
                            {seatCount} lugares
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="flex items-center justify-between gap-3">
                        <div className="grid grid-cols-6 gap-1">
                          {previewGrid.slice(0, Math.min(4, previewGrid.length)).flatMap((row, rowIndex) =>
                            row.slice(0, Math.min(6, row.length)).map((cell, colIndex) => (
                              <div
                                key={`${layout.value}-${rowIndex}-${colIndex}`}
                                className={cn(
                                  'h-3 w-3 rounded-[4px] border',
                                  cell.tipo === 'carteira'
                                    ? 'border-amber-300 bg-amber-100'
                                    : cell.tipo === 'bloqueado'
                                      ? 'border-stone-300 bg-stone-200'
                                      : 'border-dashed border-stone-200 bg-transparent'
                                )}
                              />
                            ))
                          )}
                        </div>

                        <Button
                          variant={active ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => onApplyLayout(layout.value)}
                        >
                          {active ? 'Ativo' : 'Aplicar'}
                        </Button>
                      </CardContent>
                    </Card>
                  )
                })}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
