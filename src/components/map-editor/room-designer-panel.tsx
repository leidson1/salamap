'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import {
  WALL_ELEMENT_TYPE_LABELS,
  WALL_SIDE_LABELS,
  WALL_SIDES,
  TEACHER_DESK_LABELS,
  addWallElement,
  applyRoomPreset,
  removeWallElement,
  updateWallElement,
} from '@/lib/map/room-config'
import type { RoomConfig, WallElement, WallSide } from '@/types/database'
import { DoorOpen, Sparkles, Trash2, UserRound } from 'lucide-react'

interface RoomDesignerPanelProps {
  roomConfig: RoomConfig
  selectedElementId: string | null
  onSelectElement: (elementId: string | null) => void
  onChange: (config: RoomConfig) => void
}

const BOARD_WALL_OPTIONS: Array<RoomConfig['boardWall']> = ['top', 'bottom']
const TEACHER_DESK_OPTIONS: Array<RoomConfig['teacherDesk']> = ['left', 'center', 'right', 'none']

function ToggleGroup<T extends string>({
  value,
  options,
  labels,
  onChange,
  className,
}: {
  value: T
  options: T[]
  labels: Record<T, string>
  onChange: (value: T) => void
  className?: string
}) {
  return (
    <div className={cn('grid grid-cols-2 gap-2', className)}>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={cn(
            'rounded-lg border px-3 py-2 text-left text-sm transition-colors',
            value === option
              ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
              : 'border-border bg-background hover:bg-muted'
          )}
        >
          {labels[option]}
        </button>
      ))}
    </div>
  )
}

function WallQuickActions({
  wall,
  onAddDoor,
  onAddWindow,
}: {
  wall: WallSide
  onAddDoor: () => void
  onAddWindow: () => void
}) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{WALL_SIDE_LABELS[wall]}</p>
          <p className="text-xs text-muted-foreground">
            Adicione aberturas nessa parede.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onAddDoor}>
            <DoorOpen className="size-3.5" />
            Porta
          </Button>
          <Button variant="outline" size="sm" onClick={onAddWindow}>
            Janela
          </Button>
        </div>
      </div>
    </div>
  )
}

function RoomElementButton({
  element,
  active,
  onClick,
}: {
  element: WallElement
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors',
        active
          ? 'border-emerald-400 bg-emerald-50'
          : 'border-border bg-background hover:bg-muted'
      )}
    >
      <div className="flex items-center gap-2">
        <Badge variant={element.type === 'porta' ? 'outline' : 'secondary'}>
          {WALL_ELEMENT_TYPE_LABELS[element.type]}
        </Badge>
        <span className="text-sm font-medium">{WALL_SIDE_LABELS[element.wall]}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-muted-foreground">{element.size === 1 ? 'P' : element.size === 3 ? 'G' : 'M'}</span>
        <span className="text-xs text-muted-foreground">{element.position}%</span>
      </div>
    </button>
  )
}

export function RoomDesignerPanel({
  roomConfig,
  selectedElementId,
  onSelectElement,
  onChange,
}: RoomDesignerPanelProps) {
  const selectedWallElement = roomConfig.wallElements.find((element) => element.id === selectedElementId) ?? null
  const doorCount = roomConfig.wallElements.filter((element) => element.type === 'porta').length
  const windowCount = roomConfig.wallElements.filter((element) => element.type === 'janela').length

  const handleAddElement = (wall: WallSide, type: WallElement['type']) => {
    const nextConfig = addWallElement(roomConfig, type, wall)
    const addedElement = nextConfig.wallElements[nextConfig.wallElements.length - 1]
    onChange(nextConfig)
    onSelectElement(addedElement?.id ?? null)
  }

  const handleWallElementChange = (
    id: string,
    patch: Partial<Pick<WallElement, 'type' | 'wall' | 'position'>>
  ) => {
    onChange(updateWallElement(roomConfig, id, patch))
  }

  const handleApplyPreset = (preset: 'padrao' | 'corredor' | 'laboratorio') => {
    onChange(applyRoomPreset(roomConfig, preset))
    onSelectElement('board')
  }

  const handleRemoveSelected = () => {
    if (!selectedWallElement) return
    onChange(removeWallElement(roomConfig, selectedWallElement.id))
    onSelectElement(null)
  }

  return (
    <div className="w-full lg:w-[380px] lg:shrink-0 lg:sticky lg:top-4 lg:self-start">
      <div className="space-y-4 lg:max-h-[calc(100vh-120px)] lg:overflow-y-auto lg:pr-1">
        <Card className="border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-white to-white">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-emerald-600" />
              <CardTitle>Painel da Sala</CardTitle>
            </div>
            <CardDescription>
              Defina frente da sala, mesa do professor e aberturas com menos cliques e mais previsibilidade.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">Quadro: {roomConfig.boardWall === 'top' ? 'Frente' : 'Fundos'}</Badge>
              <Badge variant="outline">
                Professor: {TEACHER_DESK_LABELS[roomConfig.teacherDesk]}
              </Badge>
              <Badge variant="secondary">{doorCount} portas</Badge>
              <Badge variant="secondary">{windowCount} janelas</Badge>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Button variant="outline" size="sm" onClick={() => handleApplyPreset('padrao')}>
                Padrao
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleApplyPreset('corredor')}>
                Corredor
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleApplyPreset('laboratorio')}>
                Laboratorio
              </Button>
            </div>
          </CardContent>
        </Card>

        {selectedWallElement && (
          <Card className="ring-2 ring-emerald-300">
            <CardHeader>
              <CardTitle>Inspetor do Elemento</CardTitle>
              <CardDescription>
                Ajuste o elemento selecionado com mais precisao.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <ToggleGroup
                  value={selectedWallElement.type}
                  options={['porta', 'janela']}
                  labels={WALL_ELEMENT_TYPE_LABELS}
                  onChange={(type) => handleWallElementChange(selectedWallElement.id, { type })}
                />
              </div>

              <div className="space-y-2">
                <Label>Parede</Label>
                <Select
                  value={selectedWallElement.wall}
                  onValueChange={(wall) => handleWallElementChange(selectedWallElement.id, { wall: wall as WallSide })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WALL_SIDES.map((wall) => (
                      <SelectItem key={wall} value={wall}>
                        {WALL_SIDE_LABELS[wall]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tamanho</Label>
                <ToggleGroup
                  value={String(selectedWallElement.size ?? 2) as '1' | '2' | '3'}
                  options={['1', '2', '3']}
                  labels={{ '1': 'Pequeno', '2': 'Medio', '3': 'Grande' }}
                  onChange={(size) => handleWallElementChange(selectedWallElement.id, { size: Number(size) as 1 | 2 | 3 })}
                  className="grid-cols-3"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="wall-position">Posicao na parede</Label>
                  <span className="text-xs text-muted-foreground">{selectedWallElement.position}%</span>
                </div>
                <input
                  id="wall-position"
                  type="range"
                  min={5}
                  max={95}
                  step={5}
                  value={selectedWallElement.position}
                  onChange={(event) =>
                    handleWallElementChange(selectedWallElement.id, {
                      position: Number(event.target.value),
                    })}
                  className="h-2 w-full cursor-pointer accent-emerald-600"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleWallElementChange(selectedWallElement.id, {
                      position: selectedWallElement.position - 5,
                    })}
                >
                  -5%
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleWallElementChange(selectedWallElement.id, {
                      position: selectedWallElement.position + 5,
                    })}
                >
                  +5%
                </Button>
                <Button variant="destructive" size="sm" onClick={handleRemoveSelected}>
                  <Trash2 className="size-3.5" />
                  Remover
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-3">
            <Tabs defaultValue="essenciais" className="gap-3">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="essenciais">Essenciais</TabsTrigger>
                <TabsTrigger value="aberturas">Aberturas</TabsTrigger>
              </TabsList>

              <TabsContent value="essenciais" className="space-y-3">
                <Card className={cn(selectedElementId === 'board' && 'ring-2 ring-emerald-300')}>
                  <CardHeader>
                    <CardTitle>Quadro</CardTitle>
                    <CardDescription>
                      Defina onde fica a frente da sala e o texto exibido no quadro.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="board-label">Titulo do quadro</Label>
                      <Input
                        id="board-label"
                        value={roomConfig.boardLabel}
                        onFocus={() => onSelectElement('board')}
                        onChange={(event) => onChange({ ...roomConfig, boardLabel: event.target.value })}
                        placeholder="Ex: Quadro"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Posicao</Label>
                      <ToggleGroup
                        value={roomConfig.boardWall}
                        options={BOARD_WALL_OPTIONS}
                        labels={{ top: 'Na frente', bottom: 'Nos fundos' }}
                        onChange={(boardWall) => {
                          onSelectElement('board')
                          onChange({ ...roomConfig, boardWall })
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className={cn(selectedElementId === 'teacher-desk' && 'ring-2 ring-emerald-300')}>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <UserRound className="size-4 text-sky-700" />
                      <CardTitle>Mesa do Professor</CardTitle>
                    </div>
                    <CardDescription>
                      Escolha a posicao da mesa em relacao ao quadro.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ToggleGroup
                      value={roomConfig.teacherDesk}
                      options={TEACHER_DESK_OPTIONS}
                      labels={TEACHER_DESK_LABELS}
                      onChange={(teacherDesk) => {
                        onSelectElement('teacher-desk')
                        onChange({ ...roomConfig, teacherDesk })
                      }}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="aberturas" className="space-y-3">
                <Card>
                  <CardHeader>
                    <CardTitle>Aberturas</CardTitle>
                    <CardDescription>
                      Cada parede tem seus proprios elementos. Adicione e depois ajuste no inspetor.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {WALL_SIDES.map((wall) => (
                      <WallQuickActions
                        key={wall}
                        wall={wall}
                        onAddDoor={() => handleAddElement(wall, 'porta')}
                        onAddWindow={() => handleAddElement(wall, 'janela')}
                      />
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Elementos da Sala</CardTitle>
                    <CardDescription>
                      Selecione uma porta ou janela para ajustar parede, tipo e posicao.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {roomConfig.wallElements.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Nenhum elemento adicionado ainda.
                      </p>
                    ) : (
                      WALL_SIDES.map((wall) => {
                        const elements = roomConfig.wallElements
                          .filter((element) => element.wall === wall)
                          .sort((a, b) => a.position - b.position)

                        if (elements.length === 0) return null

                        return (
                          <div key={wall} className="space-y-2">
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                              {WALL_SIDE_LABELS[wall]}
                            </p>
                            <div className="space-y-2">
                              {elements.map((element) => (
                                <RoomElementButton
                                  key={element.id}
                                  element={element}
                                  active={selectedWallElement?.id === element.id}
                                  onClick={() => onSelectElement(element.id)}
                                />
                              ))}
                            </div>
                          </div>
                        )
                      })
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
