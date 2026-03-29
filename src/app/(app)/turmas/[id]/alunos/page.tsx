'use client'


import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import Link from 'next/link'
import {
  Plus, Pencil, Trash2, MoreVertical, ArrowLeft, Upload,
  UserRound, LayoutGrid,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
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
import type { Turma, Aluno } from '@/types/database'

export default function AlunosPage() {
  const params = useParams()
  const router = useRouter()
  const turmaId = Number(params.id)
  const supabase = createClient()

  const [turma, setTurma] = useState<Turma | null>(null)
  const [alunos, setAlunos] = useState<Aluno[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingAluno, setEditingAluno] = useState<Aluno | null>(null)
  const [deletingAluno, setDeletingAluno] = useState<Aluno | null>(null)
  const [nome, setNome] = useState('')
  const [numero, setNumero] = useState('')
  const [importText, setImportText] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [turmaRes, alunosRes] = await Promise.all([
        supabase.from('sala_turmas').select('*').eq('id', turmaId).single(),
        supabase
          .from('sala_alunos')
          .select('*')
          .eq('turma_id', turmaId)
          .eq('ativo', true)
          .order('numero', { nullsFirst: false })
          .order('nome'),
      ])

      if (turmaRes.error) throw turmaRes.error
      setTurma(turmaRes.data as Turma)
      setAlunos((alunosRes.data as Aluno[]) || [])
    } catch {
      toast.error('Erro ao carregar dados.')
    } finally {
      setLoading(false)
    }
  }, [supabase, turmaId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  function openAddDialog() {
    setEditingAluno(null)
    setNome('')
    setNumero('')
    setDialogOpen(true)
  }

  function openEditDialog(a: Aluno) {
    setEditingAluno(a)
    setNome(a.nome)
    setNumero(a.numero?.toString() ?? '')
    setDialogOpen(true)
  }

  function openDeleteDialog(a: Aluno) {
    setDeletingAluno(a)
    setDeleteDialogOpen(true)
  }

  async function handleSave() {
    if (!nome.trim()) {
      toast.error('Nome e obrigatorio.')
      return
    }

    setSaving(true)
    try {
      const num = numero.trim() ? parseInt(numero.trim()) : null

      if (editingAluno) {
        const { error } = await supabase
          .from('sala_alunos')
          .update({ nome: nome.trim(), numero: num })
          .eq('id', editingAluno.id)

        if (error) throw error
        toast.success('Aluno atualizado com sucesso.')
      } else {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Usuario nao autenticado.')

        const { error } = await supabase
          .from('sala_alunos')
          .insert({
            nome: nome.trim(),
            numero: num,
            turma_id: turmaId,
            user_id: user.id,

          })

        if (error) throw error
        toast.success('Aluno adicionado com sucesso.')
      }

      setDialogOpen(false)
      setNome('')
      setNumero('')
      setEditingAluno(null)
      fetchData()
    } catch {
      toast.error('Erro ao salvar aluno.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deletingAluno) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('sala_alunos')
        .update({ ativo: false })
        .eq('id', deletingAluno.id)

      if (error) throw error
      toast.success('Aluno removido com sucesso.')
      setDeleteDialogOpen(false)
      setDeletingAluno(null)
      fetchData()
    } catch {
      toast.error('Erro ao remover aluno.')
    } finally {
      setSaving(false)
    }
  }

  async function handleImport() {
    if (!importText.trim()) {
      toast.error('Cole a lista de alunos.')
      return
    }

    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuario nao autenticado.')

      const lines = importText
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0)

      const records = lines.map((line, idx) => {
        // Try to extract number from start: "1 - Joao" or "1. Joao" or "1 Joao"
        const match = line.match(/^(\d+)\s*[.\-)\s]\s*(.+)/)
        if (match) {
          return {
            nome: match[2].trim(),
            numero: parseInt(match[1]),
            turma_id: turmaId,
            user_id: user.id,

          }
        }
        return {
          nome: line,
          numero: idx + 1,
          turma_id: turmaId,
          user_id: user.id,
        }
      })

      const { error } = await supabase.from('sala_alunos').insert(records)
      if (error) throw error

      toast.success(`${records.length} alunos importados com sucesso!`)
      setImportDialogOpen(false)
      setImportText('')
      fetchData()
    } catch {
      toast.error('Erro ao importar alunos.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-4 w-72 animate-pulse rounded bg-muted" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/turmas')}
          className="mb-2 -ml-2 text-muted-foreground"
        >
          <ArrowLeft className="size-4 mr-1" />
          Voltar para turmas
        </Button>

        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">
                Alunos - {turma?.serie} {turma?.turma}
              </h1>
              <Badge variant="secondary">{alunos.length}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Gerencie os alunos desta turma
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
              <Upload className="size-4" data-icon="inline-start" />
              Importar
            </Button>
            <Button onClick={openAddDialog}>
              <Plus className="size-4" data-icon="inline-start" />
              Novo Aluno
            </Button>
          </div>
        </div>
      </div>

      {alunos.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <UserRound className="size-10 text-muted-foreground" />
          <p className="mt-4 text-sm text-muted-foreground">
            Nenhum aluno cadastrado nesta turma.
          </p>
          <div className="mt-4 flex gap-2">
            <Button onClick={() => setImportDialogOpen(true)} variant="outline">
              <Upload className="size-4" data-icon="inline-start" />
              Importar lista
            </Button>
            <Button onClick={openAddDialog}>
              <Plus className="size-4" data-icon="inline-start" />
              Adicionar aluno
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex justify-end">
            <Button
              variant="outline"
              render={<Link href={`/turmas/${turmaId}/mapa`} />}
            >
              <LayoutGrid className="size-4 mr-1" />
              Montar Mapa de Sala
            </Button>
          </div>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">N.o</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead className="w-[70px]">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alunos.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <Badge variant="outline">{a.numero ?? '-'}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{a.nome}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={<Button variant="ghost" size="icon-sm" />}
                        >
                          <MoreVertical className="size-4" />
                          <span className="sr-only">Acoes</span>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(a)}>
                            <Pencil className="size-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => openDeleteDialog(a)}
                          >
                            <Trash2 className="size-4" />
                            Remover
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingAluno ? 'Editar Aluno' : 'Novo Aluno'}
            </DialogTitle>
            <DialogDescription>
              {editingAluno
                ? 'Altere os dados do aluno.'
                : 'Preencha os dados do novo aluno.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome completo do aluno"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="numero">Numero (chamada)</Label>
              <Input
                id="numero"
                type="number"
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                placeholder="Ex: 1"
                min={1}
              />
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

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importar Alunos</DialogTitle>
            <DialogDescription>
              Cole a lista de alunos abaixo. Cada linha sera um aluno.
              Formatos aceitos: &quot;1 - Joao Silva&quot;, &quot;1. Joao Silva&quot; ou apenas &quot;Joao Silva&quot;.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={`1 - Joao Silva\n2 - Maria Santos\n3 - Pedro Oliveira`}
              rows={10}
              className="font-mono text-sm"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleImport} disabled={saving}>
              {saving ? 'Importando...' : 'Importar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar remocao</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover o aluno{' '}
              <strong>{deletingAluno?.nome}</strong>?
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
              {saving ? 'Removendo...' : 'Remover'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
