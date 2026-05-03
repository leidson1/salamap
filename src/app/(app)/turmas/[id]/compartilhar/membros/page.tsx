'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  ArrowLeft, UserPlus, Mail, Check, Clock, Eye, Pencil, Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import type { Turma, TurmaCompartilhamento } from '@/types/database'

interface MemberRow extends TurmaCompartilhamento {
  profile?: { nome: string } | null
}

export default function MembrosPage() {
  const params = useParams()
  const router = useRouter()
  const turmaId = Number(params.id)
  const supabase = createClient()

  const [turma, setTurma] = useState<Turma | null>(null)
  const [membros, setMembros] = useState<MemberRow[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [papel, setPapel] = useState<'editor' | 'visualizador'>('editor')
  const [sending, setSending] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const { data: turmaData } = await supabase
        .from('sala_turmas').select('*').eq('id', turmaId).single()
      if (turmaData) setTurma(turmaData as Turma)

      const { data: membrosData } = await supabase
        .from('turma_compartilhamentos')
        .select('*, profile:profiles(nome)')
        .eq('turma_id', turmaId)
        .order('created_at', { ascending: false })

      if (membrosData) {
        setMembros(membrosData.map((m: Record<string, unknown>) => ({
          ...m,
          profile: Array.isArray(m.profile) ? m.profile[0] : m.profile,
        })) as MemberRow[])
      }
    } catch {
      toast.error('Erro ao carregar dados.')
    } finally {
      setLoading(false)
    }
  }, [supabase, turmaId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function handleInvite() {
    const trimmedEmail = email.trim().toLowerCase()
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      toast.error('Digite um email valido.')
      return
    }

    // Verificar se já convidou
    if (membros.some((m) => m.email === trimmedEmail)) {
      toast.error('Este email ja foi convidado.')
      return
    }

    setSending(true)
    try {
      const response = await fetch('/api/convidar-membro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, papel, turmaId }),
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Erro ao convidar.')

      if (result.tipo === 'adicionado') {
        toast.success(`${trimmedEmail} adicionado como ${papel}!`)
      } else if (result.tipo === 'ja_membro') {
        toast.info(`${trimmedEmail} ja faz parte deste compartilhamento.`)
      } else {
        toast.success(`Convite criado para ${trimmedEmail}. Compartilhe o link com o professor.`)
      }

      setEmail('')
      fetchData()
    } catch (error) {
      console.error('[SalaMap] Invite member error:', error)
      toast.error('Erro ao convidar.')
    } finally {
      setSending(false)
    }
  }

  async function handleRemove(id: number) {
    if (!window.confirm('Remover este membro?')) return

    try {
      const { error } = await supabase
        .from('turma_compartilhamentos')
        .delete()
        .eq('id', id)
      if (error) throw error
      toast.success('Membro removido.')
      fetchData()
    } catch {
      toast.error('Erro ao remover.')
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-64 w-full animate-pulse rounded-lg bg-muted" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <Button
          variant="ghost" size="sm"
          onClick={() => router.push(`/turmas/${turmaId}/compartilhar`)}
          className="-ml-2 text-muted-foreground mb-1"
        >
          <ArrowLeft className="size-4 mr-1" /> Voltar
        </Button>
        <h1 className="text-xl font-semibold tracking-tight">
          Membros - {turma?.serie} {turma?.turma}
        </h1>
        <p className="text-sm text-muted-foreground">
          Convide professores para ver ou editar esta turma
        </p>
      </div>

      {/* Convidar */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserPlus className="size-4 text-emerald-600" />
            <CardTitle>Convidar Professor</CardTitle>
          </div>
          <CardDescription>
            Se o professor ja tem conta, tera acesso imediato. Senao, o convite fica pendente ate ele se cadastrar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 space-y-1">
              <Label htmlFor="invite-email" className="text-xs">Email</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="professor@escola.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
              />
            </div>
            <div className="w-full sm:w-36 space-y-1">
              <Label className="text-xs">Permissao</Label>
              <Select value={papel} onValueChange={(v) => setPapel(v as 'editor' | 'visualizador')}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="visualizador">Visualizador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={handleInvite} disabled={sending}>
                <Mail className="size-4 mr-1" />
                {sending ? 'Enviando...' : 'Convidar'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de membros */}
      <Card>
        <CardHeader>
          <CardTitle>
            Membros ({membros.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {membros.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhum membro convidado ainda.
            </p>
          ) : (
            <div className="space-y-2">
              {membros.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-lg border px-3 py-2.5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                      <Mail className="size-3.5 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {m.profile?.nome || m.email}
                      </p>
                      {m.profile?.nome && (
                        <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={m.papel === 'editor' ? 'default' : 'outline'} className="text-[10px]">
                      {m.papel === 'editor' ? (
                        <><Pencil className="size-2.5 mr-0.5" /> Editor</>
                      ) : (
                        <><Eye className="size-2.5 mr-0.5" /> Visualizador</>
                      )}
                    </Badge>
                    <Badge
                      variant={m.status === 'aceito' ? 'secondary' : 'outline'}
                      className="text-[10px]"
                    >
                      {m.status === 'aceito' ? (
                        <><Check className="size-2.5 mr-0.5" /> Ativo</>
                      ) : (
                        <><Clock className="size-2.5 mr-0.5" /> Pendente</>
                      )}
                    </Badge>
                    <Button
                      variant="ghost" size="icon-sm"
                      onClick={() => handleRemove(m.id)}
                    >
                      <Trash2 className="size-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
