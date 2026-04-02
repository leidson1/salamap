'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import Link from 'next/link'
import { PublicGrid } from '@/components/map-viewer/public-grid'
import { StudentList } from '@/components/map-viewer/student-list'
import {
  LayoutGrid, Clock, Users, AlertCircle, RefreshCw,
  LogIn, Pencil, Eye, Lock, UserPlus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { PublicMapData, Grid } from '@/types/database'

function timeAgo(dateStr: string) {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffH = Math.floor(diffMin / 60)
  const diffD = Math.floor(diffH / 24)
  if (diffMin < 1) return 'agora mesmo'
  if (diffMin < 60) return `há ${diffMin}min`
  if (diffH < 24) return `há ${diffH}h`
  if (diffD < 7) return `há ${diffD} dia${diffD > 1 ? 's' : ''}`
  return date.toLocaleDateString('pt-BR')
}

type AccessLevel = 'none' | 'viewer' | 'editor'

export default function SharedMapPage() {
  const params = useParams()
  const router = useRouter()
  const shareCode = params.shareCode as string
  const supabase = createClient()

  const [mapData, setMapData] = useState<PublicMapData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userName, setUserName] = useState('')
  const [accessLevel, setAccessLevel] = useState<AccessLevel>('none')
  const [editMode, setEditMode] = useState(false)
  const [selectedAlunoId, setSelectedAlunoId] = useState<number | null>(null)
  const [mapaId, setMapaId] = useState<number | null>(null)
  const [turmaId, setTurmaId] = useState<number | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [requestSent, setRequestSent] = useState(false)
  const [lastEditor, setLastEditor] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      // Carregar mapa público
      const { data, error: rpcError } = await supabase.rpc('get_mapa_publico', {
        p_share_code: shareCode,
      })

      if (rpcError || !data) {
        setError(true)
        setLoading(false)
        return
      }

      setMapData(data as PublicMapData)
      setMapaId((data as PublicMapData).mapa.id)
      // turma_id vem da RPC
      if ((data as PublicMapData).mapa.turma_id) {
        setTurmaId((data as PublicMapData).mapa.turma_id!)
      }

      // Verificar se está logado
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setIsLoggedIn(false)
        setAccessLevel('none')
        setLoading(false)
        return
      }

      setIsLoggedIn(true)
      setUserId(user.id)

      // Verificar se já solicitou acesso (tabela pode não existir)
      try {
        const { data: existingRequest } = await supabase
          .from('solicitacoes_acesso')
          .select('id, status')
          .eq('user_id', user.id)
          .maybeSingle()
        if (existingRequest) setRequestSent(true)
      } catch {}

      // Buscar nome do usuário
      const { data: profile } = await supabase
        .from('profiles')
        .select('nome')
        .eq('id', user.id)
        .single()

      if (profile) setUserName(profile.nome)

      // Verificar permissão
      const md = data as PublicMapData

      // Verificar permissões usando turma_id da RPC
      const rpcTurmaId = md.mapa.turma_id
      let foundAccess = false
      let turmaOwnerId: string | null = null

      // 1. Dono da turma → editor
      if (rpcTurmaId) {
        try {
          const { data: turmaOwner } = await supabase
            .from('sala_turmas').select('user_id').eq('id', rpcTurmaId).maybeSingle()
          if (turmaOwner) {
            turmaOwnerId = turmaOwner.user_id as string
            if (turmaOwner.user_id === user.id) {
              setAccessLevel('editor')
              foundAccess = true
            }
          }
        } catch {}
      }

      // 2. Compartilhamento direto (turma_compartilhamentos)
      if (!foundAccess && rpcTurmaId) {
        try {
          const { data: shareCheck } = await supabase
            .from('turma_compartilhamentos').select('papel')
            .eq('turma_id', rpcTurmaId).eq('user_id', user.id).eq('status', 'aceito')
            .maybeSingle()
          if (shareCheck) {
            setAccessLevel(shareCheck.papel === 'editor' ? 'editor' : 'viewer')
            foundAccess = true
          }
        } catch {}
      }

      // 3. Membro da MESMA escola que o dono da turma
      if (!foundAccess && turmaOwnerId) {
        try {
          // Buscar escolas do dono da turma
          const { data: ownerMemberships } = await supabase
            .from('escola_membros').select('escola_id').eq('user_id', turmaOwnerId)

          if (ownerMemberships && ownerMemberships.length > 0) {
            const ownerEscolaIds = ownerMemberships.map((m: Record<string, unknown>) => m.escola_id)

            // Verificar se EU sou membro de alguma dessas escolas
            const { data: myMemberships } = await supabase
              .from('escola_membros').select('escola_id, papel')
              .eq('user_id', user.id)
              .in('escola_id', ownerEscolaIds)

            if (myMemberships && myMemberships.length > 0) {
              const bestRole = myMemberships.some((m: Record<string, unknown>) => m.papel === 'coordenador') ? 'editor' : 'viewer'
              setAccessLevel(bestRole)
              foundAccess = true
            }
          }
        } catch {}
      }

      if (!foundAccess) setAccessLevel('none')
    } catch (err) {
      console.error('[SalaMap] Shared map error:', err)
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [supabase, shareCode])

  useEffect(() => { fetchData() }, [fetchData])

  // Edição: trocar aluno de mesa (com swap)
  const handleCellClick = useCallback(async (rIdx: number, cIdx: number) => {
    if (!editMode || !mapData || !mapaId) return

    const cell = mapData.mapa.grid[rIdx]?.[cIdx]
    if (!cell || cell.tipo === 'bloqueado') return

    const cellAlunoId = cell.alunoId ? Number(cell.alunoId) : null

    if (selectedAlunoId) {
      if (selectedAlunoId === cellAlunoId) {
        // Clicou no mesmo → desselecionar
        setSelectedAlunoId(null)
        return
      }

      // Fazer swap ou mover
      const newGrid: Grid = mapData.mapa.grid.map(r => r.map(c => ({ ...c })))

      // Encontrar posição atual do aluno selecionado
      let sourceRow = -1, sourceCol = -1
      for (let r = 0; r < newGrid.length; r++) {
        for (let c = 0; c < (newGrid[r]?.length ?? 0); c++) {
          if (newGrid[r][c].alunoId && Number(newGrid[r][c].alunoId) === selectedAlunoId) {
            sourceRow = r
            sourceCol = c
            break
          }
        }
        if (sourceRow >= 0) break
      }

      // SWAP: se destino tem aluno, coloca ele na origem
      if (cellAlunoId && sourceRow >= 0) {
        newGrid[sourceRow][sourceCol].alunoId = cellAlunoId
      } else if (sourceRow >= 0) {
        newGrid[sourceRow][sourceCol].alunoId = null
      }

      // Colocar aluno selecionado no destino
      newGrid[rIdx][cIdx].alunoId = selectedAlunoId

      // Salvar no banco
      const { error } = await supabase
        .from('mapas')
        .update({ grid: JSON.parse(JSON.stringify(newGrid)) })
        .eq('id', mapaId)

      if (error) {
        toast.error('Erro ao salvar alteração.')
        console.error('[SalaMap] Edit error:', error.message)
        return
      }

      setMapData({
        ...mapData,
        mapa: { ...mapData.mapa, grid: newGrid, updated_at: new Date().toISOString() }
      })
      setSelectedAlunoId(null)
      toast.success(cellAlunoId ? 'Alunos trocados!' : 'Aluno movido!')
    } else if (cellAlunoId) {
      // Selecionar aluno pra mover/trocar
      setSelectedAlunoId(cellAlunoId)
    }
  }, [editMode, mapData, mapaId, selectedAlunoId, supabase])

  // Drag & drop: swap de alunos entre mesas
  const handleSwapStudents = useCallback(async (fromRow: number, fromCol: number, toRow: number, toCol: number) => {
    if (!editMode || !mapData || !mapaId) return

    const newGrid: Grid = mapData.mapa.grid.map(r => r.map(c => ({ ...c })))
    const fromCell = newGrid[fromRow]?.[fromCol]
    const toCell = newGrid[toRow]?.[toCol]

    if (!fromCell || !toCell) return
    if (fromCell.tipo === 'bloqueado' || toCell.tipo === 'bloqueado') return

    // Swap alunoIds
    const fromAlunoId = fromCell.alunoId
    const toAlunoId = toCell.alunoId
    newGrid[fromRow][fromCol].alunoId = toAlunoId
    newGrid[toRow][toCol].alunoId = fromAlunoId

    // Salvar
    const { error } = await supabase
      .from('mapas')
      .update({ grid: JSON.parse(JSON.stringify(newGrid)) })
      .eq('id', mapaId)

    if (error) {
      toast.error('Erro ao salvar alteração.')
      return
    }

    setMapData({
      ...mapData,
      mapa: { ...mapData.mapa, grid: newGrid, updated_at: new Date().toISOString() }
    })
    setSelectedAlunoId(null)
    toast.success(toAlunoId ? 'Alunos trocados!' : 'Aluno movido!')
  }, [editMode, mapData, mapaId, supabase])

  // Solicitar acesso
  async function handleRequestAccess() {
    if (!userId || !turmaId) {
      toast.error('Erro ao solicitar acesso.')
      return
    }
    try {
      const { error } = await supabase.from('solicitacoes_acesso').insert({
        turma_id: turmaId,
        user_id: userId,
      })
      if (error) {
        if (error.message.includes('duplicate') || error.message.includes('unique')) {
          toast.info('Você já solicitou acesso. Aguarde a aprovação.')
        } else {
          throw error
        }
      } else {
        toast.success('Solicitação enviada! O coordenador será notificado.')
      }
      setRequestSent(true)
    } catch {
      toast.error('Erro ao solicitar acesso.')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent mx-auto" />
          <p className="mt-3 text-sm text-muted-foreground">Carregando mapa...</p>
        </div>
      </div>
    )
  }

  if (error || !mapData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center max-w-xs">
          <AlertCircle className="size-12 text-muted-foreground mx-auto" />
          <h1 className="mt-4 text-xl font-semibold">Mapa não encontrado</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Este link pode estar expirado ou desativado.
          </p>
        </div>
      </div>
    )
  }

  // Não logado → pedir login
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center max-w-sm space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100">
            <Lock className="size-8 text-emerald-600" />
          </div>
          <h1 className="text-xl font-bold">
            {mapData.turma.serie} {mapData.turma.turma}
          </h1>
          <p className="text-sm text-muted-foreground">
            Prof. {mapData.professor.nome} · {mapData.turma.turno}
          </p>
          <p className="text-sm text-muted-foreground">
            Faça login para visualizar e editar o mapa de sala.
          </p>
          <div className="flex gap-2 justify-center">
            <Button render={<Link href={`/login?redirect=/mapa/${shareCode}`} />}>
              <LogIn className="size-4 mr-1.5" />
              Entrar
            </Button>
            <Button variant="outline" render={<Link href={`/signup?redirect=/mapa/${shareCode}`} />}>
              Criar conta
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            SalaMap · Mapa de sala interativo
          </p>
        </div>
      </div>
    )
  }

  // Logado mas sem permissão
  if (accessLevel === 'none') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center max-w-sm space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100">
            <Lock className="size-8 text-amber-600" />
          </div>
          <h1 className="text-xl font-bold">
            {mapData.turma.serie} {mapData.turma.turma}
          </h1>
          <p className="text-sm text-muted-foreground">
            Olá, {userName}! Você ainda não tem acesso a este mapa.
          </p>
          <p className="text-xs text-muted-foreground">
            Peça ao coordenador para convidá-lo ou entre na equipe da escola.
          </p>
          <div className="flex gap-2 justify-center">
            {requestSent ? (
              <Button disabled variant="outline">
                <Clock className="size-4 mr-1.5" />
                Solicitação enviada
              </Button>
            ) : (
              <Button onClick={handleRequestAccess}>
                <UserPlus className="size-4 mr-1.5" />
                Solicitar acesso
              </Button>
            )}
            <Button variant="outline" render={<Link href="/dashboard" />}>
              Ir para o Início
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Logado com permissão — mostrar mapa
  const alunoMap = new Map(
    (mapData.alunos || []).map((a) => [Number(a.id), a])
  )
  const updatedAt = mapData.mapa.updated_at
  const updatedAtFormatted = updatedAt ? new Date(updatedAt).toLocaleString('pt-BR') : null
  const updatedAtRelative = updatedAt ? timeAgo(updatedAt) : null
  const placedCount = mapData.mapa.grid.reduce(
    (sum, row) => sum + row.filter((c) => c.alunoId != null).length, 0
  )
  const totalAlunos = mapData.alunos?.length ?? 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
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
            <div className="flex items-center gap-2">
              {updatedAtRelative && (
                <div className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-medium text-emerald-700">
                  <RefreshCw className="size-2.5" />
                  {updatedAtRelative}
                </div>
              )}
              <Badge variant="outline" className="text-[10px]">
                {accessLevel === 'editor' ? (
                  <><Pencil className="size-2.5 mr-0.5" /> Editor</>
                ) : (
                  <><Eye className="size-2.5 mr-0.5" /> Visualizador</>
                )}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-4 space-y-4">
        {/* Stats + Edit toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="size-3" />
              <span>{placedCount}/{totalAlunos} alunos</span>
            </div>
            {updatedAtFormatted && (
              <div className="flex items-center gap-1">
                <Clock className="size-3" />
                <span>{updatedAtFormatted}</span>
              </div>
            )}
          </div>
          {accessLevel === 'editor' && (
            <Button
              variant={editMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setEditMode(!editMode); setSelectedAlunoId(null) }}
            >
              <Pencil className="size-3.5 mr-1" />
              {editMode ? 'Editando' : 'Editar'}
            </Button>
          )}
        </div>

        {/* Edit instructions */}
        {editMode && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            {selectedAlunoId
              ? '👆 Agora clique na carteira de destino para mover o aluno.'
              : '👆 Clique em um aluno posicionado para selecioná-lo e depois clique na nova carteira.'}
          </div>
        )}

        {/* Map grid — com clique pra edição */}
        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
          <div className="p-2 sm:p-3">
            <PublicGrid
              grid={mapData.mapa.grid}
              colunas={mapData.mapa.colunas}
              alunoMap={alunoMap}
              roomConfig={mapData.mapa.room_config}
              editable={editMode}
              selectedAlunoId={selectedAlunoId}
              onCellClick={editMode ? handleCellClick : undefined}
              onSwapStudents={editMode ? handleSwapStudents : undefined}
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
            {userName && `Logado como ${userName} · `}SalaMap
          </p>
        </div>
      </main>
    </div>
  )
}
