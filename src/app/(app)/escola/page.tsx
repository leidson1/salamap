'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import Link from 'next/link'
import {
  Building2, Plus, Users, Copy, UserPlus, LayoutGrid,
  Clock, Crown, GraduationCap, Upload, ImageIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import type { Escola, EscolaMembro } from '@/types/database'

interface EscolaWithMembers extends Escola {
  membros: Array<EscolaMembro & { profile: { nome: string; email: string } }>
}

export default function EscolaPage() {
  const supabase = createClient()
  const [escola, setEscola] = useState<EscolaWithMembers | null>(null)
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [joinOpen, setJoinOpen] = useState(false)
  const [nome, setNome] = useState('')
  const [codigo, setCodigo] = useState('')
  const [saving, setSaving] = useState(false)

  // Stats para coordenador
  const [allTurmas, setAllTurmas] = useState<Array<{
    id: number; serie: string; turma: string; turno: string
    updated_at?: string
    owner: { nome: string }
    alunos_count: number
  }>>([])

  const fetchData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Buscar escola onde sou criador
      const { data: myEscola } = await supabase
        .from('escolas')
        .select('*')
        .eq('criado_por', user.id)
        .single()

      if (myEscola) {
        // Buscar membros
        const { data: membros } = await supabase
          .from('escola_membros')
          .select('*, profile:profiles(nome, email)')
          .eq('escola_id', myEscola.id)

        setEscola({
          ...myEscola,
          membros: (membros || []).map((m: Record<string, unknown>) => ({
            ...m,
            profile: Array.isArray(m.profile) ? m.profile[0] : m.profile,
          })),
        } as EscolaWithMembers)

        // Buscar todas as turmas dos membros (para dashboard coordenacao)
        const memberIds = (membros || []).map((m: Record<string, unknown>) => m.user_id).filter(Boolean)
        const allUserIds = [user.id, ...memberIds]

        const { data: turmasData } = await supabase
          .from('sala_turmas')
          .select('id, serie, turma, turno, user_id, sala_alunos(count), mapas(updated_at)')
          .in('user_id', allUserIds)
          .eq('ativo', true)
          .order('serie')

        if (turmasData) {
          // Buscar nomes dos owners
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, nome')
            .in('id', allUserIds)

          const profileMap = new Map((profiles || []).map((p: Record<string, unknown>) => [p.id, p.nome]))

          setAllTurmas(turmasData.map((t: Record<string, unknown>) => ({
            id: t.id as number,
            serie: t.serie as string,
            turma: t.turma as string,
            turno: t.turno as string,
            owner: { nome: (profileMap.get(t.user_id) || 'Desconhecido') as string },
            alunos_count: (Array.isArray(t.sala_alunos) && t.sala_alunos[0]?.count) || 0,
            updated_at: Array.isArray(t.mapas) && t.mapas[0] ? (t.mapas[0] as Record<string, unknown>).updated_at as string : undefined,
          })))
        }

        setLoading(false)
        return
      }

      // Buscar escola onde sou membro
      const { data: membership } = await supabase
        .from('escola_membros')
        .select('escola:escolas(*)')
        .eq('user_id', user.id)
        .single()

      if (membership) {
        const escolaData = Array.isArray(membership.escola) ? membership.escola[0] : membership.escola
        if (escolaData) {
          const { data: membros } = await supabase
            .from('escola_membros')
            .select('*, profile:profiles(nome, email)')
            .eq('escola_id', (escolaData as Escola).id)

          setEscola({
            ...(escolaData as Escola),
            membros: (membros || []).map((m: Record<string, unknown>) => ({
              ...m,
              profile: Array.isArray(m.profile) ? m.profile[0] : m.profile,
            })),
          } as EscolaWithMembers)
        }
      }
    } catch {
      // No escola yet — that's fine
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function handleCreate() {
    if (!nome.trim()) {
      toast.error('Digite o nome da escola.')
      return
    }
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Nao autenticado.')

      const { data, error } = await supabase
        .from('escolas')
        .insert({ nome: nome.trim(), criado_por: user.id })
        .select()
        .single()

      if (error) throw error

      // Adicionar criador como coordenador
      await supabase.from('escola_membros').insert({
        escola_id: data.id,
        user_id: user.id,
        papel: 'coordenador',
      })

      toast.success('Equipe criada!')
      setCreateOpen(false)
      setNome('')
      fetchData()
    } catch {
      toast.error('Erro ao criar escola.')
    } finally {
      setSaving(false)
    }
  }

  async function handleJoin() {
    if (!codigo.trim()) {
      toast.error('Digite o codigo de convite.')
      return
    }
    setSaving(true)
    try {
      const { data, error } = await supabase.rpc('entrar_escola', {
        p_codigo: codigo.trim(),
      })

      if (error) throw error
      if (!data) {
        toast.error('Codigo invalido.')
        setSaving(false)
        return
      }

      toast.success('Voce entrou na escola!')
      setJoinOpen(false)
      setCodigo('')
      fetchData()
    } catch {
      toast.error('Erro ao entrar na escola.')
    } finally {
      setSaving(false)
    }
  }

  function handleCopyCode() {
    if (escola?.codigo_convite) {
      navigator.clipboard.writeText(escola.codigo_convite)
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

  // Sem escola — mostrar opcoes
  if (!escola) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Equipe</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Crie ou entre em uma equipe para colaborar com outros professores
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="cursor-pointer hover:border-emerald-300 transition-colors" onClick={() => setCreateOpen(true)}>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="rounded-full bg-emerald-100 p-4">
                <Plus className="size-6 text-emerald-600" />
              </div>
              <h3 className="mt-4 font-semibold">Criar Equipe</h3>
              <p className="mt-1 text-sm text-muted-foreground text-center">
                Sou coordenador e quero criar o workspace da equipe
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:border-amber-300 transition-colors" onClick={() => setJoinOpen(true)}>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="rounded-full bg-amber-100 p-4">
                <UserPlus className="size-6 text-amber-600" />
              </div>
              <h3 className="mt-4 font-semibold">Entrar em uma Equipe</h3>
              <p className="mt-1 text-sm text-muted-foreground text-center">
                Tenho um codigo de convite da equipe
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Create Dialog */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Equipe</DialogTitle>
              <DialogDescription>
                Apos criar, voce recebera um codigo para convidar professores.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome da Equipe / Escola</Label>
                <Input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Escola Municipal Dom Pedro II"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={saving}>
                {saving ? 'Criando...' : 'Criar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Join Dialog */}
        <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Entrar em uma Equipe</DialogTitle>
              <DialogDescription>
                Digite o codigo de convite que voce recebeu.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Codigo de Convite</Label>
                <Input
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  placeholder="Ex: a1b2c3d4e5f6"
                  onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setJoinOpen(false)}>Cancelar</Button>
              <Button onClick={handleJoin} disabled={saving}>
                {saving ? 'Entrando...' : 'Entrar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !escola) return

    const ext = file.name.split('.').pop()
    const path = `${escola.id}/logo.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('escola-logos')
      .upload(path, file, { upsert: true })

    if (uploadError) {
      toast.error('Erro ao enviar logo.')
      console.error('[SalaMap] Logo upload error:', uploadError.message)
      return
    }

    const { data: urlData } = supabase.storage
      .from('escola-logos')
      .getPublicUrl(path)

    const logo_url = urlData.publicUrl

    const { error: updateError } = await supabase
      .from('escolas')
      .update({ logo_url })
      .eq('id', escola.id)

    if (updateError) {
      toast.error('Erro ao salvar logo.')
      return
    }

    setEscola({ ...escola, logo_url })
    toast.success('Logo atualizado!')
  }

  async function handleNomeUpdate(novoNome: string) {
    if (!escola || !novoNome.trim()) return

    const { error } = await supabase
      .from('escolas')
      .update({ nome: novoNome.trim() })
      .eq('id', escola.id)

    if (error) {
      toast.error('Erro ao atualizar nome.')
      return
    }

    setEscola({ ...escola, nome: novoNome.trim() })
    toast.success('Nome atualizado!')
  }

  // Tem escola — mostrar dashboard
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        {escola.logo_url ? (
          <img src={escola.logo_url} alt={escola.nome} className="h-12 w-12 rounded-lg object-cover border" />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100">
            <Building2 className="size-6 text-emerald-600" />
          </div>
        )}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{escola.nome}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Equipe · {escola.membros.length} membro{escola.membros.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Perfil da equipe */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Perfil da Equipe</CardTitle>
            <CardDescription>Nome e logo que aparecem nos PDFs e QR Codes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              {escola.logo_url ? (
                <img src={escola.logo_url} alt="" className="h-14 w-14 rounded-lg object-cover border" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-muted">
                  <ImageIcon className="size-5 text-muted-foreground" />
                </div>
              )}
              <div>
                <label className="cursor-pointer">
                  <Button variant="outline" size="sm" className="pointer-events-none">
                    <Upload className="size-3 mr-1" />
                    {escola.logo_url ? 'Trocar Logo' : 'Enviar Logo'}
                  </Button>
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                </label>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Nome</Label>
              <Input
                defaultValue={escola.nome}
                onBlur={(e) => {
                  if (e.target.value !== escola.nome) handleNomeUpdate(e.target.value)
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Codigo de convite */}
        <Card className="border-emerald-200/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Codigo de Convite</CardTitle>
            <CardDescription>Compartilhe com professores da equipe</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded bg-muted px-3 py-2 text-sm font-mono">
                {escola.codigo_convite}
              </code>
              <Button variant="outline" size="icon-sm" onClick={handleCopyCode}>
                <Copy className="size-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-violet-100 p-2 text-violet-600">
              <Users className="size-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{escola.membros.length}</p>
              <p className="text-xs text-muted-foreground">Membros</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-blue-100 p-2 text-blue-600">
              <LayoutGrid className="size-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{allTurmas.length}</p>
              <p className="text-xs text-muted-foreground">Turmas na escola</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Membros */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Membros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {escola.membros.map((m) => (
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

      {/* Todas as turmas (dashboard coordenacao) */}
      {allTurmas.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Building2 className="size-4 text-muted-foreground" />
              <CardTitle className="text-lg">Todas as Turmas</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {allTurmas.map((t) => (
                <Link
                  key={t.id}
                  href={`/turmas/${t.id}/mapa`}
                  className="flex items-center justify-between rounded-lg border px-3 py-2.5 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                      <LayoutGrid className="size-3.5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{t.serie} {t.turma}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.owner.nome} · {t.turno} · {t.alunos_count} alunos
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {t.updated_at && (
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock className="size-2.5" />
                        {new Date(t.updated_at).toLocaleDateString('pt-BR')}
                      </div>
                    )}
                    <Badge variant="outline" className="text-xs">Ver mapa</Badge>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
