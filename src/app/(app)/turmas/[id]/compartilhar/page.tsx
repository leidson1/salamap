'use client'


import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ArrowLeft, Copy, Download, Printer, Link2, QrCode } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { QrCodeCard, generateQrDataUrl } from '@/components/qr-code-card'
import { generateShareCode } from '@/lib/map/utils'
import type { Turma, Mapa, MapaCompartilhamento } from '@/types/database'

export default function CompartilharPage() {
  const params = useParams()
  const router = useRouter()
  const turmaId = Number(params.id)
  const supabase = createClient()

  const [turma, setTurma] = useState<Turma | null>(null)
  const [mapa, setMapa] = useState<Mapa | null>(null)
  const [share, setShare] = useState<MapaCompartilhamento | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  const appUrl = typeof window !== 'undefined'
    ? window.location.origin
    : process.env.NEXT_PUBLIC_APP_URL || ''

  const shareUrl = share ? `${appUrl}/mapa/${share.share_code}` : ''

  const fetchData = useCallback(async () => {
    try {
      const [turmaRes, mapaRes] = await Promise.all([
        supabase.from('sala_turmas').select('*').eq('id', turmaId).single(),
        supabase.from('mapas').select('*').eq('turma_id', turmaId).single(),
      ])

      if (turmaRes.error) throw turmaRes.error
      setTurma(turmaRes.data as Turma)

      if (mapaRes.data) {
        const m = mapaRes.data as Mapa
        setMapa(m)

        const { data: shareData } = await supabase
          .from('mapa_compartilhamentos')
          .select('*')
          .eq('mapa_id', m.id)
          .single()

        if (shareData) {
          setShare(shareData as MapaCompartilhamento)
        }
      }
    } catch {
      toast.error('Erro ao carregar dados.')
    } finally {
      setLoading(false)
    }
  }, [supabase, turmaId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function handleCreateShare() {
    if (!mapa) return
    setCreating(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuario nao autenticado.')

      const code = generateShareCode()
      const { data, error } = await supabase
        .from('mapa_compartilhamentos')
        .insert({
          mapa_id: mapa.id,
          user_id: user.id,
          share_code: code,
        })
        .select()
        .single()

      if (error) throw error
      setShare(data as MapaCompartilhamento)
      toast.success('Link de compartilhamento criado!')
    } catch {
      toast.error('Erro ao criar link de compartilhamento.')
    } finally {
      setCreating(false)
    }
  }

  async function handleToggleActive(active: boolean) {
    if (!share) return

    try {
      const { error } = await supabase
        .from('mapa_compartilhamentos')
        .update({ ativo: active })
        .eq('id', share.id)

      if (error) throw error
      setShare({ ...share, ativo: active })
      toast.success(active ? 'Compartilhamento ativado!' : 'Compartilhamento desativado.')
    } catch {
      toast.error('Erro ao atualizar compartilhamento.')
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(shareUrl)
    toast.success('Link copiado!')
  }

  function handleDownloadQr() {
    const dataUrl = generateQrDataUrl(shareUrl, 400)
    const link = document.createElement('a')
    link.download = `qr-mapa-${turma?.serie}-${turma?.turma}.png`
    link.href = dataUrl
    link.click()
  }

  function handlePrintPoster() {
    // Import dynamically to avoid SSR issues
    import('@/lib/pdf/qr-poster-generator').then(({ generateQrPoster }) => {
      generateQrPoster({
        url: shareUrl,
        serie: turma?.serie || '',
        turma: turma?.turma || '',
        turno: turma?.turno || '',
        updatedAt: mapa?.updated_at || '',
      })
    })
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-64 w-full animate-pulse rounded-lg bg-muted" />
      </div>
    )
  }

  if (!mapa) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/turmas')}
          className="-ml-2 text-muted-foreground"
        >
          <ArrowLeft className="size-4 mr-1" />
          Voltar
        </Button>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <QrCode className="size-10 text-muted-foreground" />
            <p className="mt-4 text-sm text-muted-foreground">
              Voce precisa criar o mapa de sala antes de compartilhar.
            </p>
            <Button
              className="mt-4"
              onClick={() => router.push(`/turmas/${turmaId}/mapa`)}
            >
              Criar Mapa
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/turmas')}
          className="-ml-2 text-muted-foreground mb-1"
        >
          <ArrowLeft className="size-4 mr-1" />
          Voltar
        </Button>
        <h1 className="text-xl font-semibold tracking-tight">
          Compartilhar - {turma?.serie} {turma?.turma}
        </h1>
        <p className="text-sm text-muted-foreground">
          Gere um QR Code para que outros professores vejam o mapa de sala
        </p>
      </div>

      {!share ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Link2 className="size-10 text-muted-foreground" />
            <p className="mt-4 text-sm text-muted-foreground">
              Crie um link de compartilhamento para gerar o QR Code.
            </p>
            <Button className="mt-4" onClick={handleCreateShare} disabled={creating}>
              {creating ? 'Criando...' : 'Criar Link de Compartilhamento'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* QR Code */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">QR Code</CardTitle>
              <CardDescription>
                Escaneie para ver o mapa de sala atualizado
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <QrCodeCard url={shareUrl} size={220} />

              <div className="flex items-center gap-2">
                <Badge variant={share.ativo ? 'default' : 'secondary'}>
                  {share.ativo ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>

              <div className="flex flex-wrap gap-2 justify-center">
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  <Copy className="size-3.5 mr-1" />
                  Copiar Link
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownloadQr}>
                  <Download className="size-3.5 mr-1" />
                  Baixar QR
                </Button>
                <Button variant="outline" size="sm" onClick={handlePrintPoster}>
                  <Printer className="size-3.5 mr-1" />
                  Poster PDF
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Configuracoes</CardTitle>
              <CardDescription>
                Gerencie o compartilhamento do mapa
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Compartilhamento ativo</Label>
                  <p className="text-xs text-muted-foreground">
                    Quando desativado, o link deixa de funcionar
                  </p>
                </div>
                <Switch
                  checked={share.ativo}
                  onCheckedChange={handleToggleActive}
                />
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Link</Label>
                <div className="mt-1 rounded-lg border bg-muted/50 p-3">
                  <code className="text-xs break-all">{shareUrl}</code>
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Ultima atualizacao do mapa</Label>
                <p className="mt-1 text-sm font-medium">
                  {mapa.updated_at
                    ? new Date(mapa.updated_at).toLocaleString('pt-BR')
                    : 'Nunca'}
                </p>
              </div>

              <div className="pt-2">
                <p className="text-xs text-muted-foreground">
                  Cole o QR Code na porta da sala para que qualquer professor
                  possa escanear e ver o mapa atualizado no celular.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
