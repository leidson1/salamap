'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import Link from 'next/link'
import {
  Users, GraduationCap, LayoutGrid, Share2,
  Plus, Clock, MapPin, QrCode, Pencil, Eye,
  FileDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Grid, RoomConfig } from '@/types/database'

interface TurmaWithDetails {
  id: number
  serie: string
  turma: string
  turno: string
  alunoCount: number
  mapa?: {
    id: number
    updated_at: string
  } | null
  shared: boolean
  shareActive: boolean
}

interface SharedTurma {
  id: number
  turma_id: number
  papel: string
  turma: { serie: string; turma: string; turno: string }
  owner: { nome: string }
}

function timeAgo(dateStr: string) {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffH = Math.floor(diffMin / 60)
  const diffD = Math.floor(diffH / 24)

  if (diffMin < 1) return 'agora'
  if (diffMin < 60) return `${diffMin}min`
  if (diffH < 24) return `${diffH}h`
  if (diffD < 30) return `${diffD}d`
  return date.toLocaleDateString('pt-BR')
}

export default function DashboardPage() {
  const supabase = createClient()
  const [turmas, setTurmas] = useState<TurmaWithDetails[]>([])
  const [sharedTurmas, setSharedTurmas] = useState<SharedTurma[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Query principal: turmas com alunos e mapas (tabelas que sempre existem)
      const { data: turmasData, error: turmasError } = await supabase
        .from('sala_turmas')
        .select('id, serie, turma, turno, sala_alunos(count), mapas(id, updated_at)')
        .eq('user_id', user.id)
        .eq('ativo', true)
        .order('serie')
        .order('turma')

      if (turmasError) {
        console.error('[SalaMap] Dashboard error:', turmasError.message)
        toast.error('Erro ao carregar dashboard.')
        return
      }

      if (turmasData) {
        // Buscar compartilhamentos separadamente (pode não existir)
        let shareMap = new Map<number, boolean>()
        const mapaIds = turmasData
          .map((t: Record<string, unknown>) => {
            // mapas pode ser objeto (relacao 1:1) ou array
            const raw = t.mapas
            const mapa = Array.isArray(raw) ? raw[0] : raw
            return mapa ? (mapa as { id: number }).id : null
          })
          .filter((id: number | null): id is number => id !== null)

        if (mapaIds.length > 0) {
          const { data: sharesData } = await supabase
            .from('mapa_compartilhamentos')
            .select('mapa_id, ativo')
            .in('mapa_id', mapaIds)
            .eq('ativo', true)

          if (sharesData) {
            for (const s of sharesData) {
              shareMap.set(s.mapa_id as number, true)
            }
          }
        }

        setTurmas(turmasData.map((t: Record<string, unknown>) => {
          const alunos = t.sala_alunos as Array<{ count: number }> | undefined
          const rawMapas = t.mapas
          const mapa = (Array.isArray(rawMapas) ? rawMapas[0] : rawMapas) as { id: number; updated_at: string } | null

          return {
            id: t.id as number,
            serie: t.serie as string,
            turma: t.turma as string,
            turno: t.turno as string,
            alunoCount: alunos?.[0]?.count ?? 0,
            mapa: mapa ? { id: mapa.id, updated_at: mapa.updated_at } : null,
            shared: mapa ? shareMap.has(mapa.id) : false,
            shareActive: mapa ? shareMap.has(mapa.id) : false,
          }
        }))
      }

      // Buscar turmas compartilhadas comigo (tabela pode não existir)
      const { data: shared } = await supabase
        .from('turma_compartilhamentos')
        .select('id, turma_id, papel, turma:sala_turmas(serie, turma, turno), owner:profiles!convidado_por(nome)')
        .eq('user_id', user.id)
        .eq('status', 'aceito')

      if (shared && Array.isArray(shared)) {
        setSharedTurmas(shared.map((s: Record<string, unknown>) => ({
          ...s,
          turma: Array.isArray(s.turma) ? s.turma[0] : s.turma,
          owner: Array.isArray(s.owner) ? s.owner[0] : s.owner,
        })) as SharedTurma[])
      }
    } catch (err) {
      console.error('[SalaMap] Dashboard catch:', err)
      toast.error('Erro ao carregar dashboard.')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const totalAlunos = turmas.reduce((s, t) => s + t.alunoCount, 0)
  const totalMapas = turmas.filter(t => t.mapa).length
  const totalShared = turmas.filter(t => t.shareActive).length

  const handleDownloadAllMaps = useCallback(async () => {
    const turmasWithMaps = turmas.filter(t => t.mapa)
    if (turmasWithMaps.length === 0) {
      toast.error('Nenhum mapa criado ainda.')
      return
    }

    toast.info('Gerando PDF de todos os mapas...')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Buscar dados completos de cada mapa
    const turmaDataList = await Promise.all(turmasWithMaps.map(async (t) => {
      const [mapaRes, alunosRes] = await Promise.all([
        supabase.from('mapas').select('*').eq('turma_id', t.id).single(),
        supabase.from('sala_alunos').select('id, nome, numero').eq('turma_id', t.id).eq('ativo', true),
      ])
      if (!mapaRes.data) return null
      const m = mapaRes.data
      return {
        serie: t.serie, turma: t.turma, turno: t.turno,
        grid: m.grid, linhas: m.linhas, colunas: m.colunas,
        roomConfig: m.room_config,
        alunoMap: new Map((alunosRes.data || []).map((a: { id: number; nome: string; numero: number | null }) => [Number(a.id), a])),
      }
    }))

    const validTurmas = turmaDataList.filter(Boolean) as Array<{
      serie: string; turma: string; turno: string; grid: Grid; linhas: number; colunas: number
      roomConfig: RoomConfig | null; alunoMap: Map<number, { nome: string; numero: number | null }>
    }>

    // Buscar nome/logo da escola
    let escolaNome: string | undefined
    let escolaLogoUrl: string | undefined
    const { data: escolaData } = await supabase.from('escolas').select('nome, logo_url').eq('criado_por', user.id).single()
    if (escolaData) {
      escolaNome = escolaData.nome
      escolaLogoUrl = escolaData.logo_url || undefined
    }

    const { generateAllMapsPdf } = await import('@/lib/pdf/compile-generator')
    generateAllMapsPdf({ turmas: validTurmas, escolaNome, escolaLogoUrl })
  }, [turmas, supabase])

  const handleDownloadAllLists = useCallback(async () => {
    if (turmas.length === 0) return

    toast.info('Gerando PDF de todas as listas...')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const turmaDataList = await Promise.all(turmas.map(async (t) => {
      const { data: alunosData } = await supabase
        .from('sala_alunos')
        .select('id, nome, numero')
        .eq('turma_id', t.id)
        .eq('ativo', true)

      return {
        serie: t.serie, turma: t.turma, turno: t.turno,
        grid: [] as Grid, linhas: 0, colunas: 0,
        alunoMap: new Map<number, { nome: string; numero: number | null }>((alunosData || []).map((a: { id: number; nome: string; numero: number | null }) => [Number(a.id), a])),
      }
    }))

    let escolaNome: string | undefined
    let escolaLogoUrl: string | undefined
    const { data: escolaData } = await supabase.from('escolas').select('nome, logo_url').eq('criado_por', user.id).single()
    if (escolaData) {
      escolaNome = escolaData.nome
      escolaLogoUrl = escolaData.logo_url || undefined
    }

    const { generateAllStudentListsPdf } = await import('@/lib/pdf/compile-generator')
    generateAllStudentListsPdf({ turmas: turmaDataList, escolaNome, escolaLogoUrl })
  }, [turmas, supabase])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inicio</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Visao geral das suas turmas e mapas
          </p>
        </div>
        <div className="flex items-center gap-2">
          {turmas.length > 0 && (
            <>
              <Button variant="outline" size="sm" onClick={handleDownloadAllMaps}>
                <FileDown className="size-3.5 mr-1" />
                Todos os Mapas
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadAllLists}>
                <FileDown className="size-3.5 mr-1" />
                Todas as Listas
              </Button>
            </>
          )}
          <Button render={<Link href="/turmas" />}>
            <Plus className="size-4" data-icon="inline-start" />
            Nova Turma
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <Users className="size-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{turmas.length}</p>
              <p className="text-xs text-muted-foreground">Turmas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
              <GraduationCap className="size-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalAlunos}</p>
              <p className="text-xs text-muted-foreground">Alunos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <LayoutGrid className="size-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalMapas}</p>
              <p className="text-xs text-muted-foreground">Mapas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <QrCode className="size-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalShared}</p>
              <p className="text-xs text-muted-foreground">QR Codes ativos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Minhas Turmas — todas com ações rápidas */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Minhas Turmas</CardTitle>
        </CardHeader>
        <CardContent>
          {turmas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10">
              <LayoutGrid className="size-10 text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">
                Nenhuma turma cadastrada ainda.
              </p>
              <Button className="mt-4" render={<Link href="/turmas" />}>
                <Plus className="size-4 mr-1" />
                Criar primeira turma
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {turmas.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-3 rounded-lg border px-3 py-2.5 hover:bg-muted/30 transition-colors"
                >
                  {/* Info */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100">
                    <LayoutGrid className="size-4 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {t.serie} {t.turma}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-[10px] text-muted-foreground">{t.turno}</span>
                      <span className="text-[10px] text-muted-foreground">·</span>
                      <span className="text-[10px] text-muted-foreground">{t.alunoCount} alunos</span>
                      {t.mapa && (
                        <>
                          <span className="text-[10px] text-muted-foreground">·</span>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <Clock className="size-2.5" />
                            {timeAgo(t.mapa.updated_at)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Status badges */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {t.mapa ? (
                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[10px]">
                        <MapPin className="size-2.5 mr-0.5" /> Mapa
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">
                        Sem mapa
                      </Badge>
                    )}
                    {t.shareActive && (
                      <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 text-[10px]">
                        <QrCode className="size-2.5 mr-0.5" /> QR
                      </Badge>
                    )}
                  </div>

                  {/* Quick actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="outline" size="sm" className="h-7 text-xs" render={<Link href={`/turmas/${t.id}/mapa`} />}>
                      <LayoutGrid className="size-3 mr-1" />
                      {t.mapa ? 'Editar' : 'Criar'}
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" render={<Link href={`/turmas/${t.id}/compartilhar`} />}>
                      <Share2 className="size-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Compartilhadas comigo */}
      {sharedTurmas.length > 0 && (
        <Card className="border-amber-200/50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Share2 className="size-4 text-amber-600" />
              <CardTitle className="text-lg">Compartilhadas Comigo</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sharedTurmas.map((s) => (
                <Link
                  key={s.id}
                  href={`/turmas/${s.turma_id}/mapa`}
                  className="flex items-center gap-3 rounded-lg border px-3 py-2.5 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100">
                    <Share2 className="size-4 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {s.turma?.serie} {s.turma?.turma}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Por {s.owner?.nome} · {s.turma?.turno}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {s.papel === 'editor' ? (
                      <><Pencil className="size-2.5 mr-0.5" /> Editor</>
                    ) : (
                      <><Eye className="size-2.5 mr-0.5" /> Visualizador</>
                    )}
                  </Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
