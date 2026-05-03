'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { DESK_NAME_MODE_LABELS, displayName } from '@/lib/map/utils'
import { Search, UserRound, Plus, X, Pencil, WandSparkles } from 'lucide-react'
import type { Aluno, DeskLabelConfig, DeskNameMode } from '@/types/database'

interface StudentSidebarProps {
  alunos: Aluno[]
  placedIds: number[]
  displayConfig: DeskLabelConfig
  selectedStudentId?: number | null
  onSelectStudent?: (alunoId: number | null) => void
  onAddStudent?: (nome: string) => Promise<void>
  onUpdateApelido?: (alunoId: number, apelido: string) => Promise<void>
  onDisplayConfigChange?: (config: DeskLabelConfig) => void
  onAutoFill?: () => void
}

export function StudentSidebar({
  alunos,
  placedIds,
  displayConfig,
  selectedStudentId,
  onSelectStudent,
  onAddStudent,
  onUpdateApelido,
  onDisplayConfigChange,
  onAutoFill,
}: StudentSidebarProps) {
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [editingApelidoId, setEditingApelidoId] = useState<number | null>(null)
  const [apelidoInput, setApelidoInput] = useState('')

  const unplacedAlunos = alunos
    .filter((a) => !placedIds.includes(a.id))
    .filter((a) =>
      search
        ? a.nome.toLowerCase().includes(search.toLowerCase()) ||
          a.numero?.toString().includes(search)
        : true
    )

  const placedAlunos = alunos.filter((a) => placedIds.includes(a.id))
  const placedCount = placedAlunos.length

  async function handleAdd() {
    if (!newName.trim() || !onAddStudent) return
    setAdding(true)
    try {
      await onAddStudent(newName.trim())
      setNewName('')
      setShowAdd(false)
    } catch { /* handled by parent */ }
    finally { setAdding(false) }
  }

  async function handleSaveApelido(alunoId: number) {
    if (!onUpdateApelido) return
    await onUpdateApelido(alunoId, apelidoInput.trim())
    setEditingApelidoId(null)
    setApelidoInput('')
  }

  function startEditApelido(aluno: Aluno) {
    setEditingApelidoId(aluno.id)
    setApelidoInput(aluno.apelido || '')
  }

  function handleNameModeChange(nameMode: DeskNameMode) {
    onDisplayConfigChange?.({ ...displayConfig, nameMode })
  }

  function handleToggleNumbers(showNumber: boolean) {
    onDisplayConfigChange?.({ ...displayConfig, showNumber })
  }

  return (
    <div className="flex flex-col rounded-xl border bg-white w-full lg:w-80 lg:shrink-0 lg:sticky lg:top-4 lg:self-start">
      <div className="border-b p-3">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">Lista de Alunos</h3>
            <p className="text-xs text-muted-foreground">
              Clique pra selecionar, depois clique na carteira.
            </p>
          </div>
          <Badge variant="outline">
            {placedCount}/{alunos.length}
          </Badge>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar aluno..."
              className="pl-8 h-8 text-sm"
            />
          </div>
          {onAddStudent && (
            <Button
              variant={showAdd ? 'default' : 'outline'}
              size="sm"
              className="h-8 shrink-0"
              onClick={() => setShowAdd(!showAdd)}
            >
              {showAdd ? <X className="size-3.5" /> : <Plus className="size-3.5" />}
            </Button>
          )}
        </div>

        {showAdd && onAddStudent && (
          <div className="mt-2 flex gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nome do aluno"
              className="h-8 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              autoFocus
            />
            <Button size="sm" className="h-8 shrink-0" onClick={handleAdd} disabled={adding || !newName.trim()}>
              {adding ? '...' : 'Adicionar'}
            </Button>
          </div>
        )}

        {selectedStudentId && (
          <p className="mt-2 text-xs text-emerald-600 font-medium">
            Clique em uma carteira para posicionar
          </p>
        )}

        <div className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50/40 p-3 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-foreground">Preenchimento e etiquetas</p>
              <p className="text-[11px] text-muted-foreground">
                Escolha como os nomes aparecem nas carteiras e preencha o mapa automaticamente.
              </p>
            </div>
            {onAutoFill && (
              <Button size="sm" className="h-8 shrink-0" onClick={onAutoFill}>
                <WandSparkles className="size-3.5 mr-1" />
                Auto
              </Button>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px]">Formato do nome na carteira</Label>
            <Select value={displayConfig.nameMode} onValueChange={(value) => handleNameModeChange(value as DeskNameMode)}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DESK_NAME_MODE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-md bg-white/80 px-2.5 py-2">
            <div>
              <p className="text-[11px] font-medium">Mostrar número na carteira</p>
              <p className="text-[10px] text-muted-foreground">Exibe ou oculta o número de chamada na mesa.</p>
            </div>
            <Switch
              checked={displayConfig.showNumber}
              onCheckedChange={handleToggleNumbers}
              aria-label="Mostrar numero na carteira"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1 max-h-[calc(100vh-320px)] lg:max-h-[calc(100vh-220px)]">
        {/* Alunos não posicionados */}
        {unplacedAlunos.length === 0 && placedAlunos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <UserRound className="size-8 text-muted-foreground/50" />
            <p className="mt-2 text-xs text-muted-foreground">
              {alunos.length === 0
                ? 'Nenhum aluno cadastrado'
                : search
                  ? 'Nenhum resultado'
                  : 'Todos posicionados!'}
            </p>
            {alunos.length === 0 && onAddStudent && (
              <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowAdd(true)}>
                <Plus className="size-3.5 mr-1" /> Adicionar aluno
              </Button>
            )}
          </div>
        ) : (
          <>
            {unplacedAlunos.length > 0 && (
              <div className="space-y-1.5">
                {unplacedAlunos.map((aluno) => (
                  <div
                    key={aluno.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', String(aluno.id))
                      e.dataTransfer.effectAllowed = 'move'
                      onSelectStudent?.(aluno.id)
                    }}
                    onClick={() => onSelectStudent?.(selectedStudentId === aluno.id ? null : aluno.id)}
                    className={cn(
                      'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-grab active:cursor-grabbing transition-all select-none',
                      selectedStudentId === aluno.id
                        ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-300 shadow-md'
                        : 'bg-white hover:shadow-md hover:border-emerald-300'
                    )}
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                      {aluno.numero ?? '?'}
                    </span>
                    <span className="truncate font-medium">{aluno.nome}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Alunos posicionados — com opção de apelido */}
            {placedAlunos.length > 0 && (
              <div className="mt-3 space-y-1">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide px-1 mb-1">
                  Posicionados ({placedAlunos.length})
                </p>
                {placedAlunos.map((aluno) => (
                  <div
                    key={aluno.id}
                    className="flex items-center gap-2 rounded-lg border border-emerald-200/60 bg-emerald-50/30 px-2.5 py-1.5 text-sm"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-200 text-[10px] font-bold text-emerald-700">
                      {aluno.numero ?? '?'}
                    </span>
                    <div className="flex-1 min-w-0">
                      {editingApelidoId === aluno.id ? (
                        <Input
                          value={apelidoInput}
                          onChange={(e) => setApelidoInput(e.target.value)}
                          placeholder={displayName(aluno, undefined, displayConfig.nameMode)}
                          className="h-6 text-xs px-1.5"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveApelido(aluno.id)
                            if (e.key === 'Escape') setEditingApelidoId(null)
                          }}
                          onBlur={() => handleSaveApelido(aluno.id)}
                        />
                      ) : (
                        <span className="text-xs truncate block">
                          {displayName(aluno, undefined, displayConfig.nameMode)}
                          {aluno.apelido && (
                            <span className="text-[10px] text-muted-foreground ml-1">({aluno.nome.split(' ')[0]})</span>
                          )}
                        </span>
                      )}
                    </div>
                    {onUpdateApelido && editingApelidoId !== aluno.id && (
                      <button
                        onClick={() => startEditApelido(aluno)}
                        className="shrink-0 text-muted-foreground hover:text-emerald-600 transition-colors"
                        title="Editar apelido na carteira"
                      >
                        <Pencil className="size-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
