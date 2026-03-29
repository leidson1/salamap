'use client'


import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import Link from 'next/link'
import {
  Plus, Pencil, Trash2, MoreVertical, Users, GraduationCap,
  LayoutGrid, Share2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
interface TurmaRow {
  id: number
  serie: string
  turma: string
  turno: string
  ativo: boolean
  user_id: string
  alunos: { count: number }[]
  mapas: { id: number }[]
}

const TURNOS = ['Manha', 'Tarde', 'Integral', 'Noite'] as const

export default function TurmasPage() {
  const supabase = createClient()
  const [turmas, setTurmas] = useState<TurmaRow[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingTurma, setEditingTurma] = useState<TurmaRow | null>(null)
  const [deletingTurma, setDeletingTurma] = useState<TurmaRow | null>(null)
  const [serie, setSerie] = useState('')
  const [turma, setTurma] = useState('')
  const [turno, setTurno] = useState<string>('Manha')
  const [saving, setSaving] = useState(false)

  const fetchTurmas = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('sala_turmas')
        .select('*, sala_alunos(count), mapas(id)')
        .eq('user_id', user.id)
        .eq('ativo', true)
        .order('serie')
        .order('turma')

      if (error) throw error
      setTurmas((data as TurmaRow[]) || [])
    } catch {
      toast.error('Erro ao carregar turmas.')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchTurmas()
  }, [fetchTurmas])

  function getAlunosCount(t: TurmaRow): number {
    return t.alunos?.[0]?.count ?? 0
  }

  function hasMap(t: TurmaRow): boolean {
    return (t.mapas?.length ?? 0) > 0
  }

  function openAddDialog() {
    setEditingTurma(null)
    setSerie('')
    setTurma('')
    setTurno('Manha')
    setDialogOpen(true)
  }

  function openEditDialog(t: TurmaRow) {
    setEditingTurma(t)
    setSerie(t.serie)
    setTurma(t.turma)
    setTurno(t.turno)
    setDialogOpen(true)
  }

  function openDeleteDialog(t: TurmaRow) {
    setDeletingTurma(t)
    setDeleteDialogOpen(true)
  }

  async function handleSave() {
    if (!serie.trim() || !turma.trim()) {
      toast.error('Serie e turma sao obrigatorios.')
      return
    }

    setSaving(true)
    try {
      if (editingTurma) {
        const { error } = await supabase
          .from('sala_turmas')
          .update({ serie: serie.trim(), turma: turma.trim(), turno })
          .eq('id', editingTurma.id)

        if (error) throw error
        toast.success('Turma atualizada com sucesso.')
      } else {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Usuario nao autenticado.')

        const { error } = await supabase
          .from('sala_turmas')
          .insert({ serie: serie.trim(), turma: turma.trim(), turno, user_id: user.id })

        if (error) throw error
        toast.success('Turma criada com sucesso.')
      }

      setDialogOpen(false)
      setSerie('')
      setTurma('')
      setTurno('Manha')
      setEditingTurma(null)
      fetchTurmas()
    } catch {
      toast.error('Erro ao salvar turma.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deletingTurma) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('sala_turmas')
        .update({ ativo: false })
        .eq('id', deletingTurma.id)

      if (error) throw error
      toast.success('Turma excluida com sucesso.')
      setDeleteDialogOpen(false)
      setDeletingTurma(null)
      fetchTurmas()
    } catch {
      toast.error('Erro ao excluir turma.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">Turmas</h1>
            {!loading && (
              <Badge variant="secondary">{turmas.length}</Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Organize suas turmas por serie e turno
          </p>
        </div>
        <Button onClick={openAddDialog}>
          <Plus className="size-4" data-icon="inline-start" />
          Nova Turma
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : turmas.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <GraduationCap className="size-10 text-muted-foreground" />
          <p className="mt-4 text-sm text-muted-foreground">
            Nenhuma turma cadastrada.
          </p>
          <Button onClick={openAddDialog} variant="outline" className="mt-4">
            <Plus className="size-4" data-icon="inline-start" />
            Adicionar turma
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Serie</TableHead>
                <TableHead>Turma</TableHead>
                <TableHead>Turno</TableHead>
                <TableHead>Alunos</TableHead>
                <TableHead>Mapa</TableHead>
                <TableHead className="w-[70px]">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {turmas.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.serie}</TableCell>
                  <TableCell>{t.turma}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{t.turno}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{getAlunosCount(t)}</Badge>
                  </TableCell>
                  <TableCell>
                    {hasMap(t) ? (
                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                        Criado
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        Pendente
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={<Button variant="ghost" size="icon-sm" />}
                      >
                        <MoreVertical className="size-4" />
                        <span className="sr-only">Acoes</span>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          render={<Link href={`/turmas/${t.id}/alunos`} />}
                        >
                          <Users className="size-4" />
                          Ver Alunos
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          render={<Link href={`/turmas/${t.id}/mapa`} />}
                        >
                          <LayoutGrid className="size-4" />
                          Editar Mapa
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          render={<Link href={`/turmas/${t.id}/compartilhar`} />}
                        >
                          <Share2 className="size-4" />
                          Compartilhar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => openEditDialog(t)}>
                          <Pencil className="size-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => openDeleteDialog(t)}
                        >
                          <Trash2 className="size-4" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTurma ? 'Editar Turma' : 'Nova Turma'}
            </DialogTitle>
            <DialogDescription>
              {editingTurma
                ? 'Altere os dados da turma.'
                : 'Preencha os dados da nova turma.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="serie">Serie</Label>
              <Input
                id="serie"
                value={serie}
                onChange={(e) => setSerie(e.target.value)}
                placeholder="Ex: 1o Ano"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="turma">Turma</Label>
              <Input
                id="turma"
                value={turma}
                onChange={(e) => setTurma(e.target.value)}
                placeholder="Ex: A"
              />
            </div>
            <div className="space-y-2">
              <Label>Turno</Label>
              <Select value={turno} onValueChange={(val) => { if (val) setTurno(val) }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o turno" />
                </SelectTrigger>
                <SelectContent>
                  {TURNOS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusao</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir a turma{' '}
              <strong>
                {deletingTurma?.serie} {deletingTurma?.turma}
              </strong>
              ? Esta acao pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={saving}
            >
              {saving ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
