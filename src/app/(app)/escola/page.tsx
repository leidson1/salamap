'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import Link from 'next/link'
import {
  Building2, Users, Copy, UserPlus, LayoutGrid,
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
  const { escola: currentEscola, refreshEscola } = useEscola()
  const [escolaDetails, setEscolaDetails] = useState<EscolaWithMembers | null>(null)
  const [allEscolas, setAllEscolas] = useState<EscolaListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [codigoConvite, setCodigoConvite] = useState('')
  const [joining, setJoining] = useState(false)

  const [allTurmas, setAllTurmas] = useState<Array<{
    id: number; serie: string; turma: string; turno: string
    updated_at?: string; owner: { nome: string }; alunos_count: number
  }>>([])

  const fetchData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Buscar TODAS as escolas que participo
      const escolas: EscolaListItem[] = []

      // Escolas que criei
      const { data: myEscolas } = await supabase.from('escolas').select('id, nome, logo_url').eq('criado_por', user.id)
      if (myEscolas) {
        for (const e of myEscolas) {
          escolas.push({ id: e.id, nome: e.nome, logo_url: e.logo_url, role: 'coordenador', isCurrent: currentEscola?.id === e.id })
        }
      }

      // Escolas onde sou membro
      const { data: memberships } = await supabase
        .from('escola_membros')
        .select('papel, escola:escolas(id, nome, logo_url)')
        .eq('user_id', user.id)

      if (memberships) {
        for (const m of memberships) {
          const e = Array.isArray(m.escola) ? m.escola[0] : m.escola
          if (e && !escolas.some(x => x.id === (e as Escola).id)) {
            escolas.push({
              id: (e as Escola).id, nome: (e as Escola).nome,
              logo_url: (e as Escola).logo_url, role: m.papel as string,
              isCurrent: currentEscola?.id === (e as Escola).id
            })
          }
        }
      }

      setAllEscolas(escolas)

      // Detalhes da escola atual
      if (currentEscola) {
        const { data: membros } = await supabase
          .from('escola_membros')
          .select('*, profile:profiles(nome, email)')
          .eq('escola_id', currentEscola.id)

        const isCreator = currentEscola.criado_por === user.id
        const myMembership = (membros || []).find((m: Record<string, unknown>) => m.user_id === user.id)

        setEscolaDetails({
          ...currentEscola,
          membros: (membros || []).map((m: Record<string, unknown>) => ({
            ...m,
            profile: Array.isArray(m.profile) ? m.profile[0] : m.profile,
          })),
          myRole: isCreator ? 'coordenador' : ((myMembership as Record<string, unknown>)?.papel as string || 'professor') as 'coordenador' | 'professor',
        } as EscolaWithMembers)

        // Turmas da escola
        const memberIds = (membros || []).map((m: Record<string, unknown>) => m.user_id).filter(Boolean)
        const allUserIds = [...new Set([user.id, ...memberIds])]

        const { data: turmasData } = await supabase
          .from('sala_turmas')
          .select('id, serie, turma, turno, user_id, sala_alunos(count), mapas(updated_at)')
          .in('user_id', allUserIds)
          .eq('ativo', true)
          .order('serie')

        if (turmasData) {
          const { data: profiles } = await supabase.from('profiles').select('id, nome').in('id', allUserIds)
          const profileMap = new Map((profiles || []).map((p: Record<string, unknown>) => [p.id, p.nome]))
          setAllTurmas(turmasData.map((t: Record<string, unknown>) => ({
            id: t.id as number, serie: t.serie as string, turma: t.turma as string, turno: t.turno as string,
            owner: { nome: (profileMap.get(t.user_id) || 'Desconhecido') as string },
            alunos_count: (Array.isArray(t.sala_alunos) && t.sala_alunos[0]?.count) || 0,
            updated_at: Array.isArray(t.mapas) && t.mapas[0] ? (t.mapas[0] as Record<string, unknown>).updated_at as string : undefined,
          })))
        }
      }
    } catch (err) {
      console.error('[SalaMap] Escola page error:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase, currentEscola])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleJoinWithCode() {
    if (!codigoConvite.trim()) { toast.error('Digite o código.'); return }
    setJoining(true)
    try {
      const { data, error } = await supabase.rpc('entrar_escola', { p_codigo: codigoConvite.trim() })
      if (error) throw error
      if (!data) { toast.error('Código inválido.'); setJoining(false); return }
      toast.success('Você entrou na equipe!')
      setCodigoConvite('')
      await refreshEscola()
      fetchData()
    } catch { toast.error('Erro ao entrar.') }
    finally { setJoining(false) }
  }

  async function handleSwitchEscola(escolaId: number) {
    // Para trocar a escola ativa, precisamos atualizar o contexto
    // O contexto busca a primeira escola (criador ou membro)
    // Por enquanto, recarregar a pagina funciona
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
    } catch { toast.error('Erro ao enviar logo.') }
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
      toast.success('Código copiado!')
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
        <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gerencie sua escola, equipe e convites
        </p>
      </div>

      {/* Entrar em outra equipe — sempre visivel */}
      <Card className="border-amber-200/50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <UserPlus className="size-4 text-amber-600" />
            <CardTitle className="text-sm">Entrar em outra equipe</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Recebeu um código de convite? Cole aqui para participar de outra escola.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              value={codigoConvite}
              onChange={(e) => setCodigoConvite(e.target.value)}
              placeholder="Código de convite"
              className="h-9 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleJoinWithCode()}
            />
            <Button size="sm" onClick={handleJoinWithCode} disabled={joining}>
              {joining ? '...' : 'Entrar'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Minhas equipes */}
      {allEscolas.length > 1 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="size-4 text-muted-foreground" />
              <CardTitle className="text-sm">Minhas Equipes ({allEscolas.length})</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Você participa de {allEscolas.length} equipe{allEscolas.length > 1 ? 's' : ''}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {allEscolas.map((e) => (
                <div key={e.id}
                  className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                    e.isCurrent ? 'border-emerald-300 bg-emerald-50/50' : 'hover:bg-muted/30'
                  }`}
                >
                  {e.logo_url ? (
                    <img src={e.logo_url} alt="" className="h-9 w-9 rounded-lg object-cover border" />
                  ) : (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Building2 className="size-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{e.nome}</p>
                    <Badge variant="outline" className="text-[10px]">
                      {e.role === 'coordenador' ? (
                        <><Crown className="size-2.5 mr-0.5" /> Coordenador</>
                      ) : (
                        <><GraduationCap className="size-2.5 mr-0.5" /> Professor</>
                      )}
                    </Badge>
                  </div>
                  {e.isCurrent ? (
                    <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">
                      <Check className="size-2.5 mr-0.5" /> Ativa
                    </Badge>
                  ) : (
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleSwitchEscola(e.id)}>
                      Alternar
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Configurações da escola atual */}
      {currentEscola && escolaDetails && (
        <>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Perfil da Escola</CardTitle>
              <CardDescription className="text-xs">Nome e logo que aparecem nos PDFs e QR Codes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                {currentEscola.logo_url ? (
                  <img src={currentEscola.logo_url} alt="" className="h-16 w-16 rounded-xl object-cover border" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-muted">
                    <ImageIcon className="size-6 text-muted-foreground" />
                  </div>
                )}
                <label className="cursor-pointer">
                  <Button variant="outline" size="sm" className="pointer-events-none">
                    <Upload className="size-3 mr-1" />
                    {currentEscola.logo_url ? 'Trocar Logo' : 'Enviar Logo'}
                  </Button>
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                </label>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Nome</Label>
                <Input
                  defaultValue={currentEscola.nome}
                  onBlur={(e) => { if (e.target.value !== currentEscola.nome) handleNomeUpdate(e.target.value) }}
                  onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Código de convite */}
          <Card className="border-emerald-200/70">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Código de Convite</CardTitle>
              <CardDescription className="text-xs">Compartilhe com professores para entrarem na sua equipe</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-muted px-3 py-2 text-sm font-mono">
                  {currentEscola.codigo_convite}
                </code>
                <Button variant="outline" size="sm" onClick={handleCopyCode}>
                  <Copy className="size-3.5 mr-1" /> Copiar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Membros */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Membros ({escolaDetails.membros.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {escolaDetails.membros.map((m) => (
                  <div key={m.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
                        <GraduationCap className="size-3.5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{m.profile?.nome}</p>
                        <p className="text-xs text-muted-foreground">{m.profile?.email}</p>
                      </div>
                    </div>
                    <Badge variant={m.papel === 'coordenador' ? 'default' : 'outline'} className="text-[10px]">
                      {m.papel === 'coordenador' ? (
                        <><Crown className="size-2.5 mr-0.5" /> Coordenador</>
                      ) : (
                        <><GraduationCap className="size-2.5 mr-0.5" /> Professor</>
                      )}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Turmas da escola */}
          {allTurmas.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Turmas da Escola ({allTurmas.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {allTurmas.map((t) => (
                    <Link key={t.id} href={`/turmas/${t.id}/mapa`}
                      className="flex items-center justify-between rounded-lg border px-3 py-2 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                          <LayoutGrid className="size-3.5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{t.serie} {t.turma}</p>
                          <p className="text-xs text-muted-foreground">{t.owner.nome} · {t.turno}</p>
                        </div>
                      </div>
                      {t.updated_at && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <Clock className="size-2.5" />
                          {new Date(t.updated_at).toLocaleDateString('pt-BR')}
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
