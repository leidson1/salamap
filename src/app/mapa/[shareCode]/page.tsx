'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import Link from 'next/link'
import { DeskStudentPreview } from '@/components/map/desk-student-preview'
import { PublicGrid } from '@/components/map-viewer/public-grid'
import { StudentList } from '@/components/map-viewer/student-list'
import {
  LayoutGrid, Clock, Users, AlertCircle, RefreshCw,
  LogIn, Pencil, Eye, Lock, UserPlus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
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
  const [requestUnavailable, setRequestUnavailable] = useState(false)
  const [lastEditor, setLastEditor] = useState<string | null>(null)
  const [previewAlunoId, setPreviewAlunoId] = useState<number | null>(null)
  const [studentSheetOpen, setStudentSheetOpen] = useState(false)

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

      const md = data as PublicMapData
      const rpcTurmaId = md.mapa.turma_id ?? null

      setMapData(md)
      setMapaId(md.mapa.id)
      setTurmaId(rpcTurmaId)
      setRequestUnavailable(!rpcTurmaId)

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

      // Buscar nome do usuário
      const { data: profile } = await supabase
        .from('profiles')
        .select('nome')
        .eq('id', user.id)
        .single()

      if (profile) setUserName(profile.nome)

      // Verificar permissão
      // Verificar permissões usando turma_id da RPC
      let foundAccess = false
      let turmaOwnerId: string | null = null

      // Verificar se já solicitou acesso para esta turma (tabela pode não existir)
      if (rpcTurmaId) {
        try {
          const { data: existingRequest } = await supabase
            .from('solicitacoes_acesso')
            .select('id, status')
            .eq('turma_id', rpcTurmaId)
            .eq('user_id', user.id)
            .maybeSingle()
          if (existingRequest) setRequestSent(true)
        } catch {}
      }

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
  useEffect(() => {
    if (!editMode) {
      setStudentSheetOpen(false)
    }
  }, [editMode])

  const handleSelectAlunoFromList = useCallback((alunoId: number) => {
    setSelectedAlunoId(alunoId)
    setPreviewAlunoId(null)
    setStudentSheetOpen(false)
  }, [])

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
        setPreviewAlunoId(null)
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
      setPreviewAlunoId(null)
      setSelectedAlunoId(null)
      toast.success(cellAlunoId ? 'Alunos trocados!' : 'Aluno movido!')
    } else if (cellAlunoId) {
      // Selecionar aluno pra mover/trocar
      setSelectedAlunoId(cellAlunoId)
      setPreviewAlunoId(null)
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
    setPreviewAlunoId(null)
    setSelectedAlunoId(null)
    toast.success(toAlunoId ? 'Alunos trocados!' : 'Aluno movido!')
  }, [editMode, mapData, mapaId, supabase])

  // Solicitar acesso
  async function handleRequestAccess() {
    if (!userId) {
      toast.error('Faça login para solicitar acesso.')
      return
    }

    if (!turmaId) {
      toast.error('Este link precisa ser atualizado pelo administrador antes de receber solicitações.')
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
    } catch (error) {
      console.error('[SalaMap] Request access error:', error)
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
          {requestUnavailable && (
            <p className="text-xs text-amber-700">
              Este link de compartilhamento está desatualizado e precisa ser corrigido pelo administrador para aceitar solicitações.
            </p>
          )}
          <div className="flex gap-2 justify-center">
            {requestSent ? (
              <Button disabled variant="outline">
                <Clock className="size-4 mr-1.5" />
                Solicitação enviada
              </Button>
            ) : requestUnavailable ? (
              <Button disabled variant="outline">
                <AlertCircle className="size-4 mr-1.5" />
                Solicitação indisponível
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
  const placedAlunoIds = new Set(
    mapData.mapa.grid.flatMap((row) => row.map((cell) => cell.alunoId).filter((alunoId): alunoId is number => alunoId != null))
  )
  const selectedAluno = selectedAlunoId
    ? mapData.alunos.find((aluno) => Number(aluno.id) === selectedAlunoId) ?? null
    : null
  const previewAluno = previewAlunoId
    ? mapData.alunos.find((aluno) => Number(aluno.id) === previewAlunoId) ?? null
    : null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-white/95 backdrop-blur-sm shadow-sm">
        <div className="mx-auto max-w-3xl px-3 py-2.5 sm:px-4">
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

      <main className={cn(
        'mx-auto max-w-3xl space-y-4 px-3 py-4 sm:px-4',
        editMode && 'pb-32 sm:pb-4'
      )}>
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
              onClick={() => {
                setEditMode(!editMode)
                setSelectedAlunoId(null)
                setPreviewAlunoId(null)
              }}
            >
              <Pencil className="size-3.5 mr-1" />
              {editMode ? 'Editando' : 'Editar'}
            </Button>
          )}
        </div>

        {!editMode && mapData.alunos && mapData.alunos.length > 0 && (
          <div className="sm:hidden">
            <Button
              type="button"
              variant="outline"
              className="w-full justify-between"
              onClick={() => setStudentSheetOpen(true)}
            >
              <span className="flex items-center gap-2">
                <Users className="size-4" />
                Lista de alunos
              </span>
              <Badge variant="outline">{mapData.alunos.length}</Badge>
            </Button>
          </div>
        )}

        {/* Edit instructions */}
        {editMode && (
          <div className="hidden rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 sm:block">
            {selectedAlunoId
              ? '👆 Agora clique na carteira de destino para mover o aluno.'
              : '👆 Clique em um aluno posicionado para selecioná-lo e depois clique na nova carteira.'}
          </div>
        )}

        {/* Map grid — com clique pra edição */}
        {editMode && !selectedAluno && (
          <div className="hidden rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-600 shadow-sm sm:block">
            No celular, tocar no nome da lista costuma ser o jeito mais rÃ¡pido para escolher quem vai mudar de lugar.
          </div>
        )}

        {editMode && selectedAluno && (
          <div className="hidden rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-xs shadow-sm sm:block">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-emerald-800">
                  Movendo {selectedAluno.nome}
                </p>
                <p className="mt-1 text-emerald-700">
                  Toque na nova carteira para mover, ou em outra carteira ocupada para trocar de lugar.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 shrink-0 border-emerald-200 bg-white/90 text-emerald-700"
                onClick={() => {
                  setSelectedAlunoId(null)
                  setPreviewAlunoId(null)
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {!editMode && previewAluno && (
          <DeskStudentPreview
            aluno={previewAluno}
            nameMode={mapData.mapa.room_config?.deskLabels?.nameMode ?? 'apelido_ou_curto'}
            onClear={() => setPreviewAlunoId(null)}
          />
        )}

        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm touch-pan-x">
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
              onDeskPreview={editMode ? undefined : setPreviewAlunoId}
            />
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground sm:hidden">
          Deslize o mapa para os lados para ver a sala inteira.
        </p>

        {/* Student list */}
        {mapData.alunos && mapData.alunos.length > 0 && (
          <div className="hidden sm:block">
            <div className="flex items-center gap-2 mb-2">
              <Users className="size-3.5 text-muted-foreground" />
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Lista de Alunos ({mapData.alunos.length})
              </h2>
            </div>
            <StudentList
              alunos={mapData.alunos}
              interactive={editMode}
              selectedAlunoId={selectedAlunoId}
              selectableIds={placedAlunoIds}
              onSelectAluno={handleSelectAlunoFromList}
            />
          </div>
        )}

        {/* Footer */}
        <div className="text-center pb-6 pt-2">
          <p className="text-[10px] text-muted-foreground">
            {userName && `Logado como ${userName} · `}SalaMap
          </p>
        </div>
      </main>

      {mapData.alunos && mapData.alunos.length > 0 && (
        <Sheet open={studentSheetOpen} onOpenChange={setStudentSheetOpen}>
          <SheetContent
            side="bottom"
            showCloseButton={false}
            className="rounded-t-[28px] border-t bg-white px-0 pb-0 pt-0 shadow-2xl sm:hidden"
          >
            <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-slate-200" />
            <SheetHeader className="pb-3 pt-3">
              <SheetTitle>Lista de alunos</SheetTitle>
              <SheetDescription>
                {editMode
                  ? 'Escolha um aluno ja posicionado e depois toque na carteira de destino.'
                  : 'Consulte rapidamente a turma e os numeros de chamada.'}
              </SheetDescription>
            </SheetHeader>
            <div className="max-h-[70vh] overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
              <StudentList
                alunos={mapData.alunos}
                interactive={editMode}
                selectedAlunoId={selectedAlunoId}
                selectableIds={placedAlunoIds}
                onSelectAluno={handleSelectAlunoFromList}
              />
            </div>
          </SheetContent>
        </Sheet>
      )}

      {editMode && mapData.alunos && mapData.alunos.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:hidden">
          <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white/95 shadow-xl backdrop-blur">
            <div className="flex items-center gap-2 px-3 pt-3">
              <Button
                type="button"
                variant={selectedAluno ? 'default' : 'outline'}
                className="h-10 flex-1 justify-between"
                onClick={() => setStudentSheetOpen(true)}
              >
                <span className="flex items-center gap-2">
                  <Users className="size-4" />
                  {selectedAluno ? 'Trocar aluno' : 'Abrir lista'}
                </span>
                <Badge variant={selectedAluno ? 'secondary' : 'outline'} className="ml-2">
                  {placedAlunoIds.size}
                </Badge>
              </Button>
              {selectedAluno && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-10 shrink-0 px-3 text-muted-foreground"
                  onClick={() => {
                    setSelectedAlunoId(null)
                    setPreviewAlunoId(null)
                  }}
                >
                  Cancelar
                </Button>
              )}
            </div>
            <div className="px-3 pb-3 pt-2 text-[11px] leading-relaxed text-muted-foreground">
              {selectedAluno
                ? `Movendo ${selectedAluno.nome}. Agora toque na nova carteira para concluir.`
                : `${placedAlunoIds.size} aluno(s) ja estao no mapa. Abra a lista para escolher quem vai mudar de lugar.`}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
