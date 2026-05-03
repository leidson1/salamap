'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  Building2, Copy, UserPlus, LayoutGrid,
  Clock, Crown, GraduationCap, Upload, ImageIcon,
  ArrowRight, Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useEscola } from '@/lib/escola-context'
import type { Escola, EscolaMembro } from '@/types/database'

interface EscolaWithMembers extends Escola {
  membros: Array<EscolaMembro & { profile: { nome: string; email: string } }>
  myRole: 'coordenador' | 'professor'
}

interface EscolaListItem {
  id: number
  nome: string
  logo_url: string | null
  role: string
  isCurrent: boolean
}

export default function EscolaPage() {
  const supabase = createClient()
  const { escola: currentEscola, refreshEscola, switchEscola } = useEscola()
  const [escolaDetails, setEscolaDetails] = useState<EscolaWithMembers | null>(null)
  const [allEscolas, setAllEscolas] = useState<EscolaListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [codigoConvite, setCodigoConvite] = useState('')
  const [joining, setJoining] = useState(false)
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0)

  const [allTurmas, setAllTurmas] = useState<Array<{
    id: number
    serie: string
    turma: string
    turno: string
    updated_at?: string
    owner: { nome: string }
    alunos_count: number
  }>>([])

  const fetchData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const escolas: EscolaListItem[] = []

      const { data: myEscolas } = await supabase
        .from('escolas')
        .select('id, nome, logo_url')
        .eq('criado_por', user.id)

      if (myEscolas) {
        for (const escola of myEscolas) {
          escolas.push({
            id: escola.id,
            nome: escola.nome,
            logo_url: escola.logo_url,
            role: 'coordenador',
            isCurrent: currentEscola?.id === escola.id,
          })
        }
      }

      const { data: memberships } = await supabase
        .from('escola_membros')
        .select('papel, escola:escolas(id, nome, logo_url)')
        .eq('user_id', user.id)

      if (memberships) {
        for (const membership of memberships) {
          const escola = Array.isArray(membership.escola) ? membership.escola[0] : membership.escola
          if (escola && !escolas.some((item) => item.id === (escola as Escola).id)) {
            escolas.push({
              id: (escola as Escola).id,
              nome: (escola as Escola).nome,
              logo_url: (escola as Escola).logo_url,
              role: membership.papel as string,
              isCurrent: currentEscola?.id === (escola as Escola).id,
            })
          }
        }
      }

      setAllEscolas(escolas)

      if (currentEscola) {
        const { data: membros } = await supabase
          .from('escola_membros')
          .select('*, profile:profiles(nome, email)')
          .eq('escola_id', currentEscola.id)

        const isCreator = currentEscola.criado_por === user.id
        const myMembership = (membros || []).find((member: Record<string, unknown>) => member.user_id === user.id)

        setEscolaDetails({
          ...currentEscola,
          membros: (membros || []).map((member: Record<string, unknown>) => ({
            ...member,
            profile: Array.isArray(member.profile) ? member.profile[0] : member.profile,
          })),
          myRole: isCreator
            ? 'coordenador'
            : (((myMembership as Record<string, unknown>)?.papel as string) || 'professor') as 'coordenador' | 'professor',
        } as EscolaWithMembers)

        const memberIds = (membros || []).map((member: Record<string, unknown>) => member.user_id).filter(Boolean)
        const allUserIds = [...new Set([user.id, ...memberIds])]

        const { data: turmasData } = await supabase
          .from('sala_turmas')
          .select('id, serie, turma, turno, user_id, sala_alunos(count), mapas(updated_at)')
          .in('user_id', allUserIds)
          .eq('ativo', true)
          .order('serie')

        if (turmasData) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, nome')
            .in('id', allUserIds)

          const profileMap = new Map((profiles || []).map((profile: Record<string, unknown>) => [profile.id, profile.nome]))

          setAllTurmas(turmasData.map((turma: Record<string, unknown>) => ({
            id: turma.id as number,
            serie: turma.serie as string,
            turma: turma.turma as string,
            turno: turma.turno as string,
            owner: { nome: (profileMap.get(turma.user_id) || 'Desconhecido') as string },
            alunos_count: (Array.isArray(turma.sala_alunos) && turma.sala_alunos[0]?.count) || 0,
            updated_at: Array.isArray(turma.mapas) && turma.mapas[0]
              ? (turma.mapas[0] as Record<string, unknown>).updated_at as string
              : undefined,
          })))
        }
      }

      const { data: requestsData, error: requestsError } = await supabase.rpc('list_minhas_solicitacoes_acesso')
      if (!requestsError && Array.isArray(requestsData)) {
        setPendingRequestsCount(requestsData.length)
      } else {
        const { data: rawRequests } = await supabase
          .from('solicitacoes_acesso')
          .select('id')
          .eq('status', 'pendente')

        setPendingRequestsCount(rawRequests?.length ?? 0)
      }
    } catch (err) {
      console.error('[SalaMap] Escola page error:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase, currentEscola])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function handleJoinWithCode() {
    if (!codigoConvite.trim()) {
      toast.error('Digite o codigo.')
      return
    }

    setJoining(true)
    try {
      const { data, error } = await supabase.rpc('entrar_escola', { p_codigo: codigoConvite.trim() })
      if (error) throw error
      if (!data) {
        toast.error('Codigo invalido.')
        setJoining(false)
        return
      }

      toast.success('Voce entrou na equipe!')
      setCodigoConvite('')
      await refreshEscola()
      fetchData()
    } catch {
      toast.error('Erro ao entrar.')
    } finally {
      setJoining(false)
    }
  }

  async function handleSwitchEscola(escolaId: number) {
    switchEscola(escolaId)
    await refreshEscola()
    window.location.reload()
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !currentEscola) return

    try {
      const ext = file.name.split('.').pop()
      const path = `${currentEscola.id}/logo.${ext}`
      await supabase.storage.from('escola-logos').upload(path, file, { upsert: true })
      const { data: urlData } = supabase.storage.from('escola-logos').getPublicUrl(path)
      await supabase.from('escolas').update({ logo_url: urlData.publicUrl }).eq('id', currentEscola.id)
      await refreshEscola()
      fetchData()
      toast.success('Logo atualizado!')
    } catch {
      toast.error('Erro ao enviar logo.')
    }
  }

  async function handleNomeUpdate(novoNome: string) {
    if (!currentEscola || !novoNome.trim()) return

    await supabase.from('escolas').update({ nome: novoNome.trim() }).eq('id', currentEscola.id)
    await refreshEscola()
    fetchData()
    toast.success('Nome atualizado!')
  }

  function handleCopyCode() {
    if (currentEscola?.codigo_convite) {
      navigator.clipboard.writeText(currentEscola.codigo_convite)
      toast.success('Codigo copiado!')
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configuracoes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gerencie sua escola, equipe e convites
        </p>
      </div>

      <Card className="border-amber-200/50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <UserPlus className="size-4 text-amber-600" />
            <CardTitle className="text-sm">Entrar em outra equipe</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Recebeu um codigo de convite? Cole aqui para participar de outra escola.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              value={codigoConvite}
              onChange={(e) => setCodigoConvite(e.target.value)}
              placeholder="Codigo de convite"
              className="h-9 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleJoinWithCode()}
            />
            <Button size="sm" onClick={handleJoinWithCode} disabled={joining}>
              {joining ? '...' : 'Entrar'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-blue-200/60">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <UserPlus className="size-4 text-blue-600" />
            <CardTitle className="text-sm">Gestao de acessos</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Aprove ou recuse solicitacoes e acompanhe membros das turmas em uma central unica.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">{pendingRequestsCount} solicitacao(oes) pendente(s)</p>
            <p className="text-xs text-muted-foreground">
              Abra a central para ver membros ativos, convites pendentes e pedidos de acesso.
            </p>
          </div>
          <Button render={<Link href="/acessos" />}>
            Abrir central <ArrowRight className="ml-1 size-4" />
          </Button>
        </CardContent>
      </Card>

      {allEscolas.length > 1 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="size-4 text-muted-foreground" />
              <CardTitle className="text-sm">Minhas Equipes ({allEscolas.length})</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Voce participa de {allEscolas.length} equipe{allEscolas.length > 1 ? 's' : ''}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {allEscolas.map((escola) => (
                <div
                  key={escola.id}
                  className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                    escola.isCurrent ? 'border-emerald-300 bg-emerald-50/50' : 'hover:bg-muted/30'
                  }`}
                >
                  {escola.logo_url ? (
                    <img src={escola.logo_url} alt="" className="h-9 w-9 rounded-lg border object-cover" />
                  ) : (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Building2 className="size-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{escola.nome}</p>
                    <Badge variant="outline" className="text-[10px]">
                      {escola.role === 'coordenador' ? (
                        <><Crown className="mr-0.5 size-2.5" /> Coordenador</>
                      ) : (
                        <><GraduationCap className="mr-0.5 size-2.5" /> Professor</>
                      )}
                    </Badge>
                  </div>
                  {escola.isCurrent ? (
                    <Badge className="bg-emerald-100 text-[10px] text-emerald-700">
                      <Check className="mr-0.5 size-2.5" /> Ativa
                    </Badge>
                  ) : (
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleSwitchEscola(escola.id)}>
                      Alternar
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {currentEscola && escolaDetails && (
        <>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Perfil da Escola</CardTitle>
              <CardDescription className="text-xs">
                Nome e logo que aparecem nos PDFs e QR Codes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                {currentEscola.logo_url ? (
                  <img src={currentEscola.logo_url} alt="" className="h-16 w-16 rounded-xl border object-cover" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-muted">
                    <ImageIcon className="size-6 text-muted-foreground" />
                  </div>
                )}
                <label className="cursor-pointer">
                  <Button variant="outline" size="sm" className="pointer-events-none">
                    <Upload className="mr-1 size-3" />
                    {currentEscola.logo_url ? 'Trocar Logo' : 'Enviar Logo'}
                  </Button>
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                </label>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Nome</Label>
                <Input
                  defaultValue={currentEscola.nome}
                  onBlur={(e) => {
                    if (e.target.value !== currentEscola.nome) handleNomeUpdate(e.target.value)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.currentTarget.blur()
                  }}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-emerald-200/70">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Codigo de Convite</CardTitle>
              <CardDescription className="text-xs">
                Compartilhe com professores para entrarem na sua equipe
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-muted px-3 py-2 text-sm font-mono">
                  {currentEscola.codigo_convite}
                </code>
                <Button variant="outline" size="sm" onClick={handleCopyCode}>
                  <Copy className="mr-1 size-3.5" /> Copiar
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Membros ({escolaDetails.membros.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {escolaDetails.membros.map((membro) => (
                  <div key={membro.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
                        <GraduationCap className="size-3.5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{membro.profile?.nome}</p>
                        <p className="text-xs text-muted-foreground">{membro.profile?.email}</p>
                      </div>
                    </div>
                    <Badge variant={membro.papel === 'coordenador' ? 'default' : 'outline'} className="text-[10px]">
                      {membro.papel === 'coordenador' ? (
                        <><Crown className="mr-0.5 size-2.5" /> Coordenador</>
                      ) : (
                        <><GraduationCap className="mr-0.5 size-2.5" /> Professor</>
                      )}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {allTurmas.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Turmas da Escola ({allTurmas.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {allTurmas.map((turma) => (
                    <Link
                      key={turma.id}
                      href={`/turmas/${turma.id}/mapa`}
                      className="flex items-center justify-between rounded-lg border px-3 py-2 transition-colors hover:bg-muted/30"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                          <LayoutGrid className="size-3.5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{turma.serie} {turma.turma}</p>
                          <p className="text-xs text-muted-foreground">{turma.owner.nome} · {turma.turno}</p>
                        </div>
                      </div>
                      {turma.updated_at && (
                        <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                          <Clock className="size-2.5" />
                          {new Date(turma.updated_at).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
