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
import type { Turma } from '@/types/database'

interface MemberRow {
  share_id: number
  turma_id: number
  turma_serie: string
  turma_nome: string
  turma_turno: string
  member_user_id: string | null
  member_nome: string
  member_email: string
  papel: 'editor' | 'visualizador'
  status: 'aceito' | 'pendente'
  created_at: string
}

interface RequestRow {
  request_id: number
  turma_id: number
  turma_serie: string
  turma_nome: string
  turma_turno: string
  requester_id: string
  requester_nome: string
  requester_email: string
  requested_at: string
}

function formatWhen(dateStr: string) {
  return new Date(dateStr).toLocaleString('pt-BR')
}

export default function MembrosPage() {
  const params = useParams()
  const router = useRouter()
  const turmaId = Number(params.id)
  const supabase = createClient()

  const [turma, setTurma] = useState<Turma | null>(null)
  const [membros, setMembros] = useState<MemberRow[]>([])
  const [solicitacoes, setSolicitacoes] = useState<RequestRow[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [papel, setPapel] = useState<'editor' | 'visualizador'>('editor')
  const [sending, setSending] = useState(false)
  const [actingId, setActingId] = useState<number | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const [turmaRes, membrosRes, requestsRes] = await Promise.all([
        supabase.from('sala_turmas').select('*').eq('id', turmaId).single(),
        supabase.rpc('list_meus_membros_turma'),
        supabase.rpc('list_minhas_solicitacoes_acesso'),
      ])

      if (turmaRes.data) setTurma(turmaRes.data as Turma)
      if (turmaRes.error) throw turmaRes.error
      if (membrosRes.error) throw membrosRes.error
      if (requestsRes.error) throw requestsRes.error

      const allMembers = (membrosRes.data as MemberRow[] | null) ?? []
      const allRequests = (requestsRes.data as RequestRow[] | null) ?? []

      setMembros(allMembers.filter((member) => member.turma_id === turmaId))
      setSolicitacoes(allRequests.filter((request) => request.turma_id === turmaId))
    } catch (error) {
      console.error('[SalaMap] Members page load error:', error)
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

    if (membros.some((member) => member.member_email.trim().toLowerCase() === trimmedEmail)) {
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

  const handleApprove = useCallback(async (requestId: number) => {
    setActingId(requestId)
    try {
      const { error } = await supabase.rpc('approve_turma_access_request', {
        p_request_id: requestId,
      })

      if (error) throw error

      toast.success('Acesso aprovado e membro adicionado.')
      await fetchData()
    } catch (error) {
      console.error('[SalaMap] Approve request error:', error)
      toast.error('Nao foi possivel aprovar esta solicitacao.')
    } finally {
      setActingId(null)
    }
  }, [fetchData, supabase])

  const handleReject = useCallback(async (requestId: number) => {
    setActingId(requestId)
    try {
      const { data, error } = await supabase.rpc('reject_turma_access_request', {
        p_request_id: requestId,
      })

      if (error) throw error
      if (!data) {
        toast.error('Solicitacao nao encontrada.')
        return
      }

      toast.success('Solicitacao recusada.')
      await fetchData()
    } catch (error) {
      console.error('[SalaMap] Reject request error:', error)
      toast.error('Nao foi possivel recusar esta solicitacao.')
    } finally {
      setActingId(null)
    }
  }, [fetchData, supabase])

  async function handleRemove(shareId: number) {
    if (!window.confirm('Remover este membro?')) return

    setActingId(shareId)
    try {
      const { error } = await supabase
        .from('turma_compartilhamentos')
        .delete()
        .eq('id', shareId)

      if (error) throw error

      toast.success('Membro removido.')
      fetchData()
    } catch (error) {
      console.error('[SalaMap] Remove member error:', error)
      toast.error('Erro ao remover.')
    } finally {
      setActingId(null)
    }
  }

  const activeMembers = membros.filter((member) => member.status === 'aceito')
  const pendingInvites = membros.filter((member) => member.status === 'pendente')

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
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/turmas/${turmaId}/compartilhar`)}
          className="-ml-2 mb-1 text-muted-foreground"
        >
          <ArrowLeft className="mr-1 size-4" /> Voltar
        </Button>
        <h1 className="text-xl font-semibold tracking-tight">
          Acessos - {turma?.serie} {turma?.turma}
        </h1>
        <p className="text-sm text-muted-foreground">
          Aprove solicitacoes e gerencie quem pode ver ou editar esta turma.
        </p>
      </div>

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
          <div className="flex flex-col gap-3 sm:flex-row">
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
            <div className="w-full space-y-1 sm:w-36">
              <Label className="text-xs">Permissao</Label>
              <Select value={papel} onValueChange={(value) => setPapel(value as 'editor' | 'visualizador')}>
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
                <Mail className="mr-1 size-4" />
                {sending ? 'Enviando...' : 'Convidar'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-orange-200/60">
        <CardHeader>
          <CardTitle>Solicitacoes pendentes ({solicitacoes.length})</CardTitle>
          <CardDescription>
            Pedidos feitos por professores a partir do link compartilhado da turma.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {solicitacoes.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Nenhuma solicitacao pendente para esta turma.
            </p>
          ) : (
            <div className="space-y-2">
              {solicitacoes.map((request) => (
                <div key={request.request_id} className="flex flex-col gap-3 rounded-lg border px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{request.requester_nome}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {request.requester_email || 'Email nao informado'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Pedido em {formatWhen(request.requested_at)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      size="sm"
                      className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => handleApprove(request.request_id)}
                      disabled={actingId === request.request_id}
                    >
                      <Check className="mr-1 size-3" /> Aceitar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => handleReject(request.request_id)}
                      disabled={actingId === request.request_id}
                    >
                      Recusar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Membros ativos ({activeMembers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {activeMembers.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhum membro ativo nesta turma.
            </p>
          ) : (
            <div className="space-y-2">
              {activeMembers.map((member) => (
                <div key={member.share_id} className="flex items-center justify-between rounded-lg border px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{member.member_nome}</p>
                    <p className="truncate text-xs text-muted-foreground">{member.member_email || 'Email nao informado'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={member.papel === 'editor' ? 'default' : 'outline'} className="text-[10px]">
                      {member.papel === 'editor' ? (
                        <><Pencil className="mr-0.5 size-2.5" /> Editor</>
                      ) : (
                        <><Eye className="mr-0.5 size-2.5" /> Visualizador</>
                      )}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleRemove(member.share_id)}
                      disabled={actingId === member.share_id}
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

      <Card>
        <CardHeader>
          <CardTitle>Convites pendentes ({pendingInvites.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {pendingInvites.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhum convite pendente nesta turma.
            </p>
          ) : (
            <div className="space-y-2">
              {pendingInvites.map((invite) => (
                <div key={invite.share_id} className="flex items-center justify-between rounded-lg border px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{invite.member_nome}</p>
                    <p className="truncate text-xs text-muted-foreground">{invite.member_email || 'Email nao informado'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      <Clock className="mr-0.5 size-2.5" /> Pendente
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleRemove(invite.share_id)}
                      disabled={actingId === invite.share_id}
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
