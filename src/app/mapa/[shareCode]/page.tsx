import { createClient } from '@/lib/supabase/server'
import { PublicGrid } from '@/components/map-viewer/public-grid'
import { StudentList } from '@/components/map-viewer/student-list'
import { LayoutGrid, Clock, Users, AlertCircle } from 'lucide-react'
import type { PublicMapData } from '@/types/database'

interface PageProps {
  params: Promise<{ shareCode: string }>
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
        <div className="text-center">
          <AlertCircle className="size-12 text-muted-foreground mx-auto" />
          <h1 className="mt-4 text-xl font-semibold">Mapa nao encontrado</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Este link pode estar expirado ou desativado.
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
    ? new Date(mapData.mapa.updated_at).toLocaleString('pt-BR')
    : null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-white shadow-sm">
        <div className="mx-auto max-w-3xl px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <LayoutGrid className="size-5 text-emerald-600" />
              <span className="font-bold text-sm">SalaMap</span>
            </div>
            {updatedAt && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="size-3" />
                {updatedAt}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 space-y-6">
        {/* Class info */}
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">
            {mapData.turma.serie} {mapData.turma.turma}
          </h1>
          <div className="mt-1 flex items-center justify-center gap-3 text-sm text-muted-foreground">
            <span>{mapData.turma.turno}</span>
            <span>-</span>
            <span>Prof. {mapData.professor.nome}</span>
          </div>
        </div>

        {/* Map grid */}
        <div className="rounded-lg border bg-white p-3 sm:p-4 overflow-x-auto">
          <PublicGrid
            grid={mapData.mapa.grid}
            colunas={mapData.mapa.colunas}
            alunoMap={alunoMap}
          />
        </div>

        {/* Student list */}
        {mapData.alunos && mapData.alunos.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Users className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">
                Lista de Alunos ({mapData.alunos.length})
              </h2>
            </div>
            <StudentList alunos={mapData.alunos} />
          </div>
        )}

        {/* Footer */}
        <div className="text-center pb-4">
          <p className="text-xs text-muted-foreground">
            Gerado pelo SalaMap - salamap.profdia.com.br
          </p>
        </div>
      </main>
    </div>
  )
}
