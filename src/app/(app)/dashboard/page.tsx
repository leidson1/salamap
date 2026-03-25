'use client'


import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import Link from 'next/link'
import {
  Users, GraduationCap, LayoutGrid, Share2,
  Plus, ArrowRight, Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
interface Stats {
  turmas: number
  alunos: number
  mapas: number
  compartilhados: number
}

interface RecentMap {
  id: number
  turma_id: number
  nome: string
  updated_at: string
  turma: { serie: string; turma: string; turno: string }
}

export default function DashboardPage() {
  const supabase = createClient()
  const [stats, setStats] = useState<Stats>({ turmas: 0, alunos: 0, mapas: 0, compartilhados: 0 })
  const [recentMaps, setRecentMaps] = useState<RecentMap[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [turmasRes, alunosRes, mapasRes, sharesRes] = await Promise.all([
        supabase.from('sala_turmas').select('id', { count: 'exact' }).eq('user_id', user.id).eq('ativo', true),
        supabase.from('sala_alunos').select('id', { count: 'exact' }).eq('user_id', user.id).eq('ativo', true),
        supabase.from('mapas').select('id', { count: 'exact' }).eq('user_id', user.id),
        supabase.from('mapa_compartilhamentos').select('id', { count: 'exact' }).eq('user_id', user.id).eq('ativo', true),
      ])

      setStats({
        turmas: turmasRes.count ?? 0,
        alunos: alunosRes.count ?? 0,
        mapas: mapasRes.count ?? 0,
        compartilhados: sharesRes.count ?? 0,
      })

      const { data: maps } = await supabase
        .from('mapas')
        .select('id, turma_id, nome, updated_at, turma:sala_turmas(serie, turma, turno)')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(5)

      if (maps) {
        setRecentMaps(maps.map((m: Record<string, unknown>) => ({
          ...m,
          turma: Array.isArray(m.turma) ? m.turma[0] : m.turma,
        })) as RecentMap[])
      }
    } catch {
      toast.error('Erro ao carregar dashboard.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const statCards = [
    { label: 'Turmas', value: stats.turmas, icon: Users, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Alunos', value: stats.alunos, icon: GraduationCap, color: 'bg-violet-50 text-violet-600' },
    { label: 'Mapas Criados', value: stats.mapas, icon: LayoutGrid, color: 'bg-blue-50 text-blue-600' },
    { label: 'Compartilhados', value: stats.compartilhados, icon: Share2, color: 'bg-amber-50 text-amber-600' },
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Visao geral dos seus mapas de sala
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.label}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.color}`}>
                  <Icon className="size-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{card.value}</p>
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Recent maps */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg">Mapas Recentes</CardTitle>
          <Button variant="ghost" size="sm" render={<Link href="/turmas" />}>
            Ver todas turmas
            <ArrowRight className="size-3.5 ml-1" />
          </Button>
        </CardHeader>
        <CardContent>
          {recentMaps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <LayoutGrid className="size-10 text-muted-foreground/50" />
              <p className="mt-3 text-sm text-muted-foreground">
                Nenhum mapa criado ainda.
              </p>
              <Button className="mt-4" render={<Link href="/turmas" />}>
                <Plus className="size-4 mr-1" />
                Criar primeira turma
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {recentMaps.map((map) => (
                <Link
                  key={map.id}
                  href={`/turmas/${map.turma_id}/mapa`}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100">
                      <LayoutGrid className="size-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {map.turma?.serie} {map.turma?.turma}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {map.turma?.turno}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="size-3" />
                      {new Date(map.updated_at).toLocaleDateString('pt-BR')}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      Editar
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
