'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import Link from 'next/link'
import {
  Users, GraduationCap, LayoutGrid, Share2,
  Plus, Clock, MapPin, QrCode, Pencil, Eye,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

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

      // Vincular convites pendentes
      await supabase.rpc('vincular_convites_pendentes').catch(() => {})

      // Buscar turmas com alunos e mapas (com compartilhamentos)
      const { data: turmasData } = await supabase
        .from('sala_turmas')
        .select('id, serie, turma, turno, sala_alunos(count), mapas(id, updated_at, mapa_compartilhamentos(id, ativo))')
        .eq('user_id', user.id)
        .eq('ativo', true)
        .order('serie')
        .order('turma')

      if (turmasData) {
        setTurmas(turmasData.map((t: Record<string, unknown>) => {
          const alunos = t.sala_alunos as Array<{ count: number }> | undefined
          const mapas = t.mapas as Array<{ id: number; updated_at: string; mapa_compartilhamentos: Array<{ id: number; ativo: boolean }> }> | undefined
          const mapa = mapas?.[0] ?? null
          const shares = mapa?.mapa_compartilhamentos ?? []

          return {
            id: t.id as number,
            serie: t.serie as string,
            turma: t.turma as string,
            turno: t.turno as string,
            alunoCount: alunos?.[0]?.count ?? 0,
            mapa: mapa ? { id: mapa.id, updated_at: mapa.updated_at } : null,
            shared: shares.length > 0,
            shareActive: shares.some(s => s.ativo),
          }
        }))
      }

      // Buscar turmas compartilhadas comigo
      const { data: shared } = await supabase
        .from('turma_compartilhamentos')
        .select('id, turma_id, papel, turma:sala_turmas(serie, turma, turno), owner:profiles!convidado_por(nome)')
        .eq('user_id', user.id)
        .eq('status', 'aceito')

      if (shared) {
        setSharedTurmas(shared.map((s: Record<string, unknown>) => ({
          ...s,
          turma: Array.isArray(s.turma) ? s.turma[0] : s.turma,
          owner: Array.isArray(s.owner) ? s.owner[0] : s.owner,
        })) as SharedTurma[])
      }
    } catch {
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
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Visao geral das suas turmas e mapas
          </p>
        </div>
        <Button render={<Link href="/turmas" />}>
          <Plus className="size-4" data-icon="inline-start" />
          Nova Turma
        </Button>
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
