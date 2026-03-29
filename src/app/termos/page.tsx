import Link from 'next/link'
import { ArrowLeft, FileText } from 'lucide-react'

const LAST_UPDATED = '26 de marco de 2026'

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-3xl px-4">
        <Link
          href="/signup"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Voltar
        </Link>

        <div className="mt-6 rounded-2xl border bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-emerald-100 p-3">
              <FileText className="size-5 text-emerald-700" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Termos de Uso e Politica de Privacidade
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Ultima atualizacao: {LAST_UPDATED}
              </p>
            </div>
          </div>

          <div className="mt-8 space-y-6 text-sm leading-6 text-muted-foreground">
            <section className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">1. Uso do sistema</h2>
              <p>
                O SalaMap e uma ferramenta para organizacao de turmas, alunos e mapas de sala.
                O usuario e responsavel pelos dados inseridos e pelo uso adequado do sistema.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">2. Dados armazenados</h2>
              <p>
                O sistema pode armazenar nome do usuario, email, dados de turmas, listas de
                alunos, configuracoes de sala e links de compartilhamento de mapas.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">3. Compartilhamento</h2>
              <p>
                Ao ativar um link publico, o usuario autoriza a exibicao do mapa da turma para
                qualquer pessoa que possua o QR Code ou a URL correspondente.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">4. Responsabilidades</h2>
              <p>
                O usuario deve manter suas credenciais seguras e garantir que o uso do sistema
                esteja de acordo com as regras da instituicao de ensino e com a legislacao
                aplicavel.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">5. Privacidade</h2>
              <p>
                Os dados sao utilizados para operacao do produto, autenticacao, gerenciamento das
                turmas e geracao dos mapas. Links publicos podem ser desativados a qualquer momento
                pela area de compartilhamento.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">6. Atualizacoes</h2>
              <p>
                Estes termos podem ser atualizados para refletir mudancas no sistema ou exigencias
                legais. A data da ultima revisao sera mantida nesta pagina.
              </p>
            </section>
          </div>
        </div>
      </div>
    </main>
  )
}
