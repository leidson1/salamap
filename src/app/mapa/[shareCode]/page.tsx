import { createClient } from '@/lib/supabase/server'
import { PublicGrid } from '@/components/map-viewer/public-grid'
import { StudentList } from '@/components/map-viewer/student-list'
import { LayoutGrid, Clock, Users, AlertCircle, RefreshCw } from 'lucide-react'
import type { PublicMapData } from '@/types/database'

interface PageProps {
  params: Promise<{ shareCode: string }>
}

function timeAgo(dateStr: string) {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffH = Math.floor(diffMin / 60)
  const diffD = Math.floor(diffH / 24)

  if (diffMin < 1) return 'agora mesmo'
  if (diffMin < 60) return `ha ${diffMin}min`
  if (diffH < 24) return `ha ${diffH}h`
  if (diffD < 7) return `ha ${diffD} dia${diffD > 1 ? 's' : ''}`
  return date.toLocaleDateString('pt-BR')
}

export default async function PublicMapPage({ params }: PageProps) {
  const { shareCode } = await params
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('get_mapa_publico', {
    p_share_code: shareCode,
  })

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center max-w-xs">
          <AlertCircle className="size-12 text-muted-foreground mx-auto" />
          <h1 className="mt-4 text-xl font-semibold">Mapa nao encontrado</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Este link pode estar expirado ou desativado. Peca ao professor um link atualizado.
          </p>
        </div>
      </div>
    )
  }

  const mapData = data as PublicMapData
  const alunoMap = new Map(
    (mapData.alunos || []).map((a) => [a.id, a])
  )

  const updatedAt = mapData.mapa.updated_at
  const updatedAtFormatted = updatedAt
    ? new Date(updatedAt).toLocaleString('pt-BR')
    : null
  const updatedAtRelative = updatedAt ? timeAgo(updatedAt) : null

  const placedCount = mapData.mapa.grid.reduce(
    (sum, row) => sum + row.filter((c) => c.alunoId !== null).length, 0
  )
  const totalAlunos = mapData.alunos?.length ?? 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header — sticky, compact */}
      <header className="sticky top-0 z-10 border-b bg-white/95 backdrop-blur-sm shadow-sm">
        <div className="mx-auto max-w-3xl px-4 py-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-md bg-emerald-100 p-1">
                <LayoutGrid className="size-4 text-emerald-600" />
              </div>
              <div>
                <span className="font-bold text-sm block leading-tight">
                  {mapData.turma.serie} {mapData.turma.turma}
                </span>
                <span className="text-[10px] text-muted-foreground leading-tight">
                  {mapData.turma.turno} · Prof. {mapData.professor.nome}
                </span>
              </div>
            </div>
            {updatedAtRelative && (
              <div className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-medium text-emerald-700">
                <RefreshCw className="size-2.5" />
                {updatedAtRelative}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-4 space-y-4">
        {/* Stats bar */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="size-3" />
            <span>{placedCount}/{totalAlunos} alunos posicionados</span>
          </div>
          {updatedAtFormatted && (
            <div className="flex items-center gap-1 ml-auto">
              <Clock className="size-3" />
              <span>{updatedAtFormatted}</span>
            </div>
          )}
        </div>

        {/* Map grid */}
        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
          <div className="p-2 sm:p-3">
            <PublicGrid
              grid={mapData.mapa.grid}
              colunas={mapData.mapa.colunas}
              alunoMap={alunoMap}
              roomConfig={mapData.mapa.room_config}
            />
          </div>
        </div>

        {/* Student list */}
        {mapData.alunos && mapData.alunos.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Users className="size-3.5 text-muted-foreground" />
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Lista de Alunos ({mapData.alunos.length})
              </h2>
            </div>
            <StudentList alunos={mapData.alunos} />
          </div>
        )}

        {/* Footer */}
        <div className="text-center pb-6 pt-2">
          <p className="text-[10px] text-muted-foreground">
            SalaMap · Mapa sempre atualizado
          </p>
        </div>
      </main>
    </div>
  )
}
