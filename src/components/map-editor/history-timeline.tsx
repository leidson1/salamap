'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Clock, User } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface HistoryEntry {
  id: number
  created_at: string
  linhas: number
  colunas: number
  layout_tipo: string
  resumo: string | null
  profile: { nome: string } | null
}

function timeAgo(dateStr: string) {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffH = Math.floor(diffMin / 60)
  const diffD = Math.floor(diffH / 24)

  if (diffMin < 1) return 'agora'
  if (diffMin < 60) return `${diffMin}min atras`
  if (diffH < 24) return `${diffH}h atras`
  if (diffD < 7) return `${diffD}d atras`
  return date.toLocaleDateString('pt-BR')
}

export function HistoryTimeline({ mapaId }: { mapaId: number }) {
  const supabase = createClient()
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)

  const fetchHistory = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('mapa_historico')
        .select('id, created_at, linhas, colunas, layout_tipo, resumo, profile:profiles(nome)')
        .eq('mapa_id', mapaId)
        .order('created_at', { ascending: false })
        .limit(10)

      if (data) {
        setEntries(data.map((d: Record<string, unknown>) => ({
          ...d,
          profile: Array.isArray(d.profile) ? d.profile[0] : d.profile,
        })) as HistoryEntry[])
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [supabase, mapaId])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  if (loading) {
    return <div className="h-20 animate-pulse rounded bg-muted" />
  }

  if (entries.length === 0) {
    return (
      <p className="text-xs text-muted-foreground text-center py-4">
        Nenhuma alteracao registrada ainda.
      </p>
    )
  }

  return (
    <div className="space-y-1">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className="flex items-start gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-muted/50"
        >
          <Clock className="size-3 mt-0.5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              {entry.profile?.nome && (
                <span className="font-medium text-foreground">
                  {entry.profile.nome}
                </span>
              )}
              <span className="text-muted-foreground">
                {entry.resumo || `alterou o mapa (${entry.layout_tipo}, ${entry.linhas}x${entry.colunas})`}
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground">
              {timeAgo(entry.created_at)}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
