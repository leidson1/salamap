import Link from 'next/link'
import {
  LayoutGrid, GripVertical, QrCode, Printer,
  Smartphone, Shield, ArrowRight, Users,
} from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <LayoutGrid className="size-6 text-emerald-600" />
            <span className="text-xl font-bold tracking-tight">SalaMap</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors px-3 py-2"
            >
              Entrar
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
            >
              Comecar gratis
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-900 text-white">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:py-28 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 mb-6">
            <Shield className="size-3.5 text-emerald-400" />
            <span className="text-xs font-medium text-emerald-300">100% Gratuito</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
            Organize sua sala de aula
            <br />
            <span className="text-emerald-400">de forma visual</span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-emerald-100/80 max-w-2xl mx-auto">
            Crie mapas de sala com drag & drop e compartilhe com outros
            professores via QR Code. Simples, rapido e gratuito.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-6 py-3 text-lg font-medium text-white hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20"
            >
              Criar conta gratis
              <ArrowRight className="size-5" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-6 py-3 text-lg font-medium text-white hover:bg-white/5 transition-colors"
            >
              Ja tenho conta
            </Link>
          </div>
        </div>

        {/* Decorative grid pattern */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />
      </section>

      {/* How it works */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-center tracking-tight">
            Como funciona
          </h2>
          <p className="mt-3 text-center text-muted-foreground max-w-xl mx-auto">
            Em 3 passos simples voce organiza sua sala e compartilha com toda a equipe
          </p>

          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {[
              {
                step: '1',
                title: 'Cadastre a turma',
                description: 'Adicione suas turmas e a lista de alunos. Voce pode importar a lista de uma so vez.',
                icon: Users,
              },
              {
                step: '2',
                title: 'Monte o mapa',
                description: 'Arraste os alunos para as carteiras no editor visual. Escolha entre layouts diferentes.',
                icon: GripVertical,
              },
              {
                step: '3',
                title: 'Compartilhe via QR',
                description: 'Gere um QR Code e cole na porta da sala. Qualquer professor escaneia e ve o mapa.',
                icon: QrCode,
              },
            ].map((item) => {
              const Icon = item.icon
              return (
                <div key={item.step} className="text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100">
                    <Icon className="size-6 text-emerald-600" />
                  </div>
                  <div className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                    {item.step}
                  </div>
                  <h3 className="mt-3 text-lg font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 sm:py-20 bg-gray-50">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-center tracking-tight">
            Tudo que voce precisa
          </h2>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: GripVertical,
                title: 'Drag & Drop',
                description: 'Arraste e solte alunos nas carteiras. Troque de lugar com um gesto.',
              },
              {
                icon: QrCode,
                title: 'QR Code',
                description: 'Gere QR Codes para cada turma. Cole na porta da sala.',
              },
              {
                icon: Smartphone,
                title: 'Mobile',
                description: 'Visualize mapas no celular. Otimizado para telas pequenas.',
              },
              {
                icon: Printer,
                title: 'Imprimir PDF',
                description: 'Imprima mapas, listas de alunos e posters com QR Code.',
              },
              {
                icon: Shield,
                title: '100% Gratuito',
                description: 'Sem limites, sem planos pagos. Gratis para sempre.',
              },
              {
                icon: LayoutGrid,
                title: 'Layouts',
                description: 'Fileiras, duplas, corredor central, formato U ou ilhas. Escolha o que funciona melhor.',
              },
            ].map((feature) => {
              const Icon = feature.icon
              return (
                <div key={feature.title} className="rounded-xl border bg-white p-5 hover:shadow-md transition-shadow">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                    <Icon className="size-5 text-emerald-600" />
                  </div>
                  <h3 className="mt-3 font-semibold">{feature.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{feature.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-20 bg-emerald-600 text-white text-center">
        <div className="mx-auto max-w-2xl px-4">
          <h2 className="text-3xl sm:text-4xl font-bold">
            Comece a organizar suas salas agora
          </h2>
          <p className="mt-4 text-emerald-100 text-lg">
            Crie sua conta em segundos e monte seu primeiro mapa de sala.
          </p>
          <Link
            href="/signup"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-lg font-medium text-emerald-700 hover:bg-emerald-50 transition-colors shadow-lg"
          >
            Criar conta gratis
            <ArrowRight className="size-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white py-8">
        <div className="mx-auto max-w-6xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <LayoutGrid className="size-5 text-emerald-600" />
            <span className="font-bold">SalaMap</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Feito com carinho para professores - salamap.profdia.com.br
          </p>
        </div>
      </footer>
    </div>
  )
}
