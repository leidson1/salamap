'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getSupabaseConfigHelpText, getSupabaseConfigStatus } from '@/lib/supabase/config'
import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/header'
import { EscolaContext } from '@/lib/escola-context'
import type { Profile, Escola } from '@/types/database'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const supabaseConfig = getSupabaseConfigStatus()
  const supabase = createClient()

  const [user, setUser] = useState<Pick<Profile, 'nome' | 'email'> | null>(null)
  const [escola, setEscola] = useState<Escola | null>(null)
  const [escolaChecked, setEscolaChecked] = useState(false)
  const [loading, setLoading] = useState(true)

  const refreshEscola = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return

    // Buscar escola onde sou criador
    const { data: myEscola } = await supabase
      .from('escolas')
      .select('*')
      .eq('criado_por', authUser.id)
      .single()

    if (myEscola) {
      setEscola(myEscola as Escola)
      setEscolaChecked(true)
      return
    }

    // Buscar escola onde sou membro
    const { data: membership } = await supabase
      .from('escola_membros')
      .select('escola:escolas(*)')
      .eq('user_id', authUser.id)
      .single()

    if (membership) {
      const escolaData = Array.isArray(membership.escola) ? membership.escola[0] : membership.escola
      if (escolaData) {
        setEscola(escolaData as Escola)
        setEscolaChecked(true)
        return
      }
    }

    setEscola(null)
    setEscolaChecked(true)
  }, [supabase])

  useEffect(() => {
    async function loadUser() {
      if (!supabaseConfig.isConfigured) {
        setLoading(false)
        return
      }

      const { data: { user: authUser } } = await supabase.auth.getUser()

      if (!authUser) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('nome, email')
        .eq('id', authUser.id)
        .single()

      if (profile) {
        setUser({ nome: profile.nome, email: profile.email })
      } else {
        setUser({ nome: '', email: authUser.email ?? '' })
      }

      // Carregar escola (pode falhar se tabela nao existe)
      try {
        await refreshEscola()
      } catch {
        setEscolaChecked(true)
      }

      setLoading(false)
    }

    loadUser()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <div className="hidden w-64 flex-col border-r bg-white p-4 lg:flex">
          <div className="mb-8 h-8 w-32 animate-pulse rounded-md bg-muted" />
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-9 animate-pulse rounded-md bg-muted" />
            ))}
          </div>
          <div className="mt-auto h-10 animate-pulse rounded-md bg-muted" />
        </div>
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex h-14 items-center justify-between border-b bg-white px-4 sm:px-6">
            <div className="h-6 w-40 animate-pulse rounded bg-muted" />
            <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
          </div>
          <div className="flex-1 p-4 sm:p-6 lg:p-8">
            <div className="space-y-4">
              <div className="h-8 w-48 animate-pulse rounded bg-muted" />
              <div className="h-4 w-72 animate-pulse rounded bg-muted" />
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!supabaseConfig.isConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-xl rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-950 shadow-sm">
          <h1 className="text-lg font-semibold">Supabase nao configurado</h1>
          <p className="mt-2 text-sm leading-6 text-amber-900">
            {getSupabaseConfigHelpText()}
          </p>
          <p className="mt-3 text-sm text-amber-800">
            Atualize o arquivo <code>.env.local</code> e reinicie o servidor de desenvolvimento.
          </p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <EscolaContext value={{ escola, refreshEscola }}>
      <div className="flex h-screen bg-gray-50">
        <Sidebar user={user} currentPath={pathname} escola={escola} />

        <div className="flex flex-1 flex-col overflow-hidden lg:pl-0">
          <Header user={user} currentPath={pathname} />

          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </EscolaContext>
  )
}
