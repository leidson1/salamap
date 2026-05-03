'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  Check, Clock, Eye, Mail, Pencil, Trash2, UserPlus, Users,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface AccessRequestRow {
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

interface AccessShareRow {
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

interface GroupedTurmaAccess {
  turmaId: number
  nome: string
  turno: string
  activeMembers: AccessShareRow[]
  pendingInvites: AccessShareRow[]
}

function formatWhen(dateStr: string) {
  return new Date(dateStr).toLocaleString('pt-BR')
}

export default function AcessosPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [requests, setRequests] = useState<AccessRequestRow[]>([])
  const [shares, setShares] = useState<AccessShareRow[]>([])
  const [actingId, setActingId] = useState<number | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [requestsRes, sharesRes] = await Promise.all([
        supabase.rpc('list_minhas_solicitacoes_acesso'),
        supabase.rpc('list_meus_membros_turma'),
      ])

      if (requestsRes.error) throw requestsRes.error
      if (sharesRes.error) throw sharesRes.error

      setRequests((requestsRes.data as AccessRequestRow[] | null) ?? [])
      setShares((sharesRes.data as AccessShareRow[] | null) ?? [])
    } catch (error) {
      console.error('[SalaMap] Access center load error:', error)
      toast.error('Nao foi possivel carregar a central de acessos.')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

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

  const handleRemoveShare = useCallback(async (shareId: number) => {
    if (!window.confirm('Remover este acesso da turma?')) return

    setActingId(shareId)
    try {
      const { error } = await supabase
        .from('turma_compartilhamentos')
        .delete()
        .eq('id', shareId)

      if (error) throw error

      toast.success('Acesso removido.')
      await fetchData()
    } catch (error) {
      console.error('[SalaMap] Remove share error:', error)
      toast.error('Nao foi possivel remover este acesso.')
    } finally {
      setActingId(null)
    }
  }, [fetchData, supabase])

  const groupedAccess = new Map<number, GroupedTurmaAccess>()
  for (const share of shares) {
    if (!groupedAccess.has(share.turma_id)) {
      groupedAccess.set(share.turma_id, {
        turmaId: share.turma_id,
        nome: `${share.turma_serie} ${share.turma_nome}`,
        turno: share.turma_turno,
        activeMembers: [],
        pendingInvites: [],
      })
    }

    const turmaGroup = groupedAccess.get(share.turma_id)!
    if (share.status === 'aceito') {
      turmaGroup.activeMembers.push(share)
    } else {
      turmaGroup.pendingInvites.push(share)
    }
  }

  const groupedTurmas = Array.from(groupedAccess.values()).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  const activeMembersCount = shares.filter((share) => share.status === 'aceito').length
  const pendingInvitesCount = shares.filter((share) => share.status === 'pendente').length

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="grid gap-3 md:grid-cols-3">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Acessos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gerencie solicitacoes, membros ativos e convites das suas turmas.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
              <UserPlus className="size-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{requests.length}</p>
              <p className="text-xs text-muted-foreground">Solicitacoes pendentes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <Users className="size-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeMembersCount}</p>
              <p className="text-xs text-muted-foreground">Membros ativos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Mail className="size-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingInvitesCount}</p>
              <p className="text-xs text-muted-foreground">Convites pendentes</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="requests" className="gap-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="requests">Solicitacoes</TabsTrigger>
          <TabsTrigger value="members">Membros e convites</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Solicitacoes pendentes</CardTitle>
              <CardDescription>
                Aprovacoes feitas aqui ja liberam o mapa compartilhado para a pessoa.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {requests.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Nenhuma solicitacao pendente no momento.
                </p>
              ) : (
                <div className="space-y-3">
                  {requests.map((request) => (
                    <div key={request.request_id} className="rounded-lg border px-3 py-3">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold">{request.requester_nome}</p>
                          <p className="text-xs text-muted-foreground">
                            {request.requester_email || 'Email nao informado'}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Turma: {request.turma_serie} {request.turma_nome} · {request.turma_turno}
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
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members" className="space-y-4">
          {groupedTurmas.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Nenhum membro ou convite encontrado nas suas turmas.
              </CardContent>
            </Card>
          ) : (
            groupedTurmas.map((turma) => (
              <Card key={turma.turmaId}>
                <CardHeader>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle>{turma.nome}</CardTitle>
                      <CardDescription>{turma.turno}</CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      render={<Link href={`/turmas/${turma.turmaId}/compartilhar/membros`} />}
                    >
                      Abrir turma
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <Users className="size-4 text-emerald-600" />
                      <p className="text-sm font-medium">Membros ativos ({turma.activeMembers.length})</p>
                    </div>
                    {turma.activeMembers.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhum membro ativo nesta turma.</p>
                    ) : (
                      <div className="space-y-2">
                        {turma.activeMembers.map((member) => (
                          <div key={member.share_id} className="flex items-center justify-between rounded-lg border px-3 py-2.5">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{member.member_nome}</p>
                              <p className="truncate text-xs text-muted-foreground">{member.member_email || 'Email nao informado'}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={member.papel === 'editor' ? 'default' : 'outline'} className="text-[10px]">
                                {member.papel === 'editor' ? <><Pencil className="mr-0.5 size-2.5" /> Editor</> : <><Eye className="mr-0.5 size-2.5" /> Visualizador</>}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => handleRemoveShare(member.share_id)}
                                disabled={actingId === member.share_id}
                              >
                                <Trash2 className="size-3.5 text-muted-foreground" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <Clock className="size-4 text-blue-600" />
                      <p className="text-sm font-medium">Convites pendentes ({turma.pendingInvites.length})</p>
                    </div>
                    {turma.pendingInvites.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhum convite pendente nesta turma.</p>
                    ) : (
                      <div className="space-y-2">
                        {turma.pendingInvites.map((invite) => (
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
                                onClick={() => handleRemoveShare(invite.share_id)}
                                disabled={actingId === invite.share_id}
                              >
                                <Trash2 className="size-3.5 text-muted-foreground" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
