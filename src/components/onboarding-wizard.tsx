'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useEscola } from '@/lib/escola-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Building2, ImageIcon, Upload, Users, GraduationCap,
  LayoutGrid, QrCode, FileDown, Share2, ArrowRight,
  Check, ChevronRight, UserPlus, Printer,
} from 'lucide-react'

const TURNOS = ['Manhã', 'Tarde', 'Integral', 'Noite'] as const

interface WizardData {
  escolaNome: string
  escolaId: number | null
  logoUrl: string | null
  turmaId: number | null
  serie: string
  turma: string
  turno: string
  alunosTexto: string
}

const STEPS = [
  { id: 'escola', title: 'Escola ou Projeto', icon: Building2 },
  { id: 'logo', title: 'Logo', icon: ImageIcon },
  { id: 'turma', title: 'Primeira Turma', icon: Users },
  { id: 'alunos', title: 'Alunos', icon: GraduationCap },
  { id: 'pronto', title: 'Pronto!', icon: Check },
]

export function OnboardingWizard() {
  const supabase = createClient()
  const router = useRouter()
  const { refreshEscola } = useEscola()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState<WizardData>({
    escolaNome: '', escolaId: null, logoUrl: null,
    turmaId: null, serie: '', turma: '', turno: 'Manhã',
    alunosTexto: '',
  })

  const currentStep = STEPS[step]

  // --- Step handlers ---

  async function handleCreateEscola() {
    if (!data.escolaNome.trim()) { toast.error('Digite o nome.'); return }
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Não autenticado.')
      const { data: escola, error } = await supabase
        .from('escolas').insert({ nome: data.escolaNome.trim(), criado_por: user.id }).select().single()
      if (error) throw error
      await supabase.from('escola_membros').insert({ escola_id: escola.id, user_id: user.id, papel: 'coordenador' })
      setData(d => ({ ...d, escolaId: escola.id }))
      await refreshEscola()
      setStep(1)
    } catch { toast.error('Erro ao criar.') }
    finally { setSaving(false) }
  }

  async function handleUploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !data.escolaId) return
    setSaving(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${data.escolaId}/logo.${ext}`
      await supabase.storage.from('escola-logos').upload(path, file, { upsert: true })
      const { data: urlData } = supabase.storage.from('escola-logos').getPublicUrl(path)
      await supabase.from('escolas').update({ logo_url: urlData.publicUrl }).eq('id', data.escolaId)
      setData(d => ({ ...d, logoUrl: urlData.publicUrl }))
      await refreshEscola()
      toast.success('Logo adicionado!')
    } catch { toast.error('Erro ao enviar logo.') }
    finally { setSaving(false) }
  }

  async function handleCreateTurma() {
    if (!data.serie.trim() || !data.turma.trim()) { toast.error('Preencha serie e turma.'); return }
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Não autenticado.')
      const { data: turma, error } = await supabase
        .from('sala_turmas').insert({
          serie: data.serie.trim(), turma: data.turma.trim(), turno: data.turno, user_id: user.id,
        }).select().single()
      if (error) throw error
      setData(d => ({ ...d, turmaId: turma.id }))
      setStep(3)
    } catch { toast.error('Erro ao criar turma.') }
    finally { setSaving(false) }
  }

  async function handleImportAlunos() {
    if (!data.alunosTexto.trim() || !data.turmaId) { setStep(4); return }
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Não autenticado.')
      const nomes = data.alunosTexto
        .split('\n')
        .map(n => n.trim())
        .filter(n => n.length > 0)

      const alunos = nomes.map((nome, idx) => ({
        nome, numero: idx + 1, turma_id: data.turmaId!, user_id: user.id,
      }))

      const { error } = await supabase.from('sala_alunos').insert(alunos)
      if (error) throw error
      toast.success(`${alunos.length} alunos adicionados!`)
      setStep(4)
    } catch { toast.error('Erro ao importar alunos.') }
    finally { setSaving(false) }
  }

  function handleFinish(goToMap: boolean) {
    if (goToMap && data.turmaId) {
      router.push(`/turmas/${data.turmaId}/mapa`)
    } else {
      router.push('/dashboard')
    }
  }

  // --- Render ---

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-lg space-y-6">

        {/* Progress bar */}
        <div className="flex items-center justify-center gap-1">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                i < step ? 'bg-emerald-600 text-white'
                : i === step ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-600'
                : 'bg-muted text-muted-foreground'
              }`}>
                {i < step ? <Check className="size-4" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-6 sm:w-10 h-0.5 ${i < step ? 'bg-emerald-600' : 'bg-muted'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}

        {/* STEP 0: Escola */}
        {step === 0 && (
          <Card>
            <CardContent className="pt-6 space-y-5">
              <div className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100">
                  <Building2 className="size-7 text-emerald-600" />
                </div>
                <h2 className="mt-3 text-xl font-bold">Como se chama sua escola ou projeto?</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Pode ser o nome da escola, coordenação ou um projeto pessoal.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={data.escolaNome}
                  onChange={(e) => setData(d => ({ ...d, escolaNome: e.target.value }))}
                  placeholder="Ex: Escola Municipal Dom Pedro II"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateEscola()}
                  autoFocus
                />
              </div>
              <Button onClick={handleCreateEscola} disabled={saving} className="w-full">
                {saving ? 'Criando...' : 'Continuar'}
                <ChevronRight className="size-4 ml-1" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* STEP 1: Logo */}
        {step === 1 && (
          <Card>
            <CardContent className="pt-6 space-y-5">
              <div className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100">
                  <ImageIcon className="size-7 text-violet-600" />
                </div>
                <h2 className="mt-3 text-xl font-bold">Quer adicionar um logo?</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Aparece nos PDFs e na página compartilhada. Você pode fazer depois.
                </p>
              </div>

              <div className="flex flex-col items-center gap-3">
                {data.logoUrl ? (
                  <img src={data.logoUrl} alt="" className="h-20 w-20 rounded-xl object-cover border" />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-muted">
                    <ImageIcon className="size-8 text-muted-foreground" />
                  </div>
                )}
                <label className="cursor-pointer">
                  <Button variant="outline" className="pointer-events-none">
                    <Upload className="size-4 mr-1.5" />
                    {data.logoUrl ? 'Trocar Logo' : 'Escolher Imagem'}
                  </Button>
                  <input type="file" accept="image/*" className="hidden" onChange={handleUploadLogo} />
                </label>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                  Pular
                </Button>
                <Button onClick={() => setStep(2)} className="flex-1" disabled={!data.logoUrl}>
                  Continuar <ChevronRight className="size-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 2: Turma */}
        {step === 2 && (
          <Card>
            <CardContent className="pt-6 space-y-5">
              <div className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100">
                  <Users className="size-7 text-blue-600" />
                </div>
                <h2 className="mt-3 text-xl font-bold">Crie sua primeira turma</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Você pode criar mais turmas depois.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Serie</Label>
                  <Input
                    value={data.serie}
                    onChange={(e) => setData(d => ({ ...d, serie: e.target.value }))}
                    placeholder="Ex: 6o Ano"
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label>Turma</Label>
                  <Input
                    value={data.turma}
                    onChange={(e) => setData(d => ({ ...d, turma: e.target.value }))}
                    placeholder="Ex: A"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Turno</Label>
                <Select value={data.turno} onValueChange={(v) => { if (v) setData(d => ({ ...d, turno: v })) }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TURNOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(4)} className="flex-1">
                  Pular
                </Button>
                <Button onClick={handleCreateTurma} disabled={saving} className="flex-1">
                  {saving ? 'Criando...' : 'Continuar'} <ChevronRight className="size-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 3: Alunos */}
        {step === 3 && (
          <Card>
            <CardContent className="pt-6 space-y-5">
              <div className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100">
                  <GraduationCap className="size-7 text-amber-600" />
                </div>
                <h2 className="mt-3 text-xl font-bold">Adicione os alunos</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Cole a lista de nomes (um por linha). Você pode fazer depois também.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Lista de alunos (um nome por linha)</Label>
                <Textarea
                  value={data.alunosTexto}
                  onChange={(e) => setData(d => ({ ...d, alunosTexto: e.target.value }))}
                  placeholder={"Joao Silva\nMaria Santos\nPedro Oliveira"}
                  rows={6}
                  className="resize-none font-mono text-sm"
                />
                {data.alunosTexto.trim() && (
                  <p className="text-xs text-muted-foreground">
                    {data.alunosTexto.split('\n').filter(n => n.trim()).length} alunos detectados
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(4)} className="flex-1">
                  Pular
                </Button>
                <Button onClick={handleImportAlunos} disabled={saving} className="flex-1">
                  {saving ? 'Importando...' : data.alunosTexto.trim() ? 'Importar e continuar' : 'Continuar'}
                  <ChevronRight className="size-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 4: Pronto! */}
        {step === 4 && (
          <Card>
            <CardContent className="pt-6 space-y-6">
              <div className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100">
                  <Check className="size-7 text-emerald-600" />
                </div>
                <h2 className="mt-3 text-xl font-bold">Tudo pronto!</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {data.escolaNome} está configurada. Veja o que você pode fazer:
                </p>
              </div>

              {/* O que pode fazer */}
              <div className="space-y-3">
                <div className="flex items-start gap-3 rounded-lg border p-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100">
                    <LayoutGrid className="size-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Criar mapa de sala</p>
                    <p className="text-xs text-muted-foreground">
                      Arraste alunos para as carteiras e organize a sala visualmente.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-lg border p-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100">
                    <QrCode className="size-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Compartilhar via QR Code</p>
                    <p className="text-xs text-muted-foreground">
                      Imprima o QR Code e cole na porta da sala. Qualquer professor escaneia e ve o mapa atualizado, sem login.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-lg border p-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100">
                    <Printer className="size-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Imprimir em PDF</p>
                    <p className="text-xs text-muted-foreground">
                      Gere PDFs bonitos dos mapas e listas de alunos, com o logo da sua escola.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-lg border p-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-100">
                    <UserPlus className="size-4 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Convidar sua equipe</p>
                    <p className="text-xs text-muted-foreground">
                      Convide outros professores para verem e editarem os mapas das turmas.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => handleFinish(false)} className="flex-1">
                  Ir para o Início
                </Button>
                {data.turmaId && (
                  <Button onClick={() => handleFinish(true)} className="flex-1">
                    <LayoutGrid className="size-4 mr-1.5" />
                    Criar Mapa
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
