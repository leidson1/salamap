'use client'

import { createContext, useContext, useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Escola } from '@/types/database'

interface EscolaMembership {
  escola: Escola
  papel: 'coordenador' | 'professor'
}

interface EscolaContextType {
  escola: Escola | null
  papel: 'coordenador' | 'professor' | null
  memberships: EscolaMembership[]
  switchEscola: (escolaId: number) => void
  refreshEscola: () => Promise<void>
}

export const EscolaContext = createContext<EscolaContextType>({
  escola: null,
  papel: null,
  memberships: [],
  switchEscola: () => {},
  refreshEscola: async () => {},
})

export function useEscola() {
  return useContext(EscolaContext)
}

export function useIsDono() {
  const { escola, papel } = useEscola()
  const supabase = createClient()
  const [isDono, setIsDono] = useState(false)

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser()
      setIsDono(!!escola && !!user && escola.criado_por === user.id)
    }
    check()
  }, [escola, supabase])

  return isDono || papel === 'coordenador'
}

export function EscolaProvider({ children, userId }: { children: React.ReactNode; userId: string }) {
  const supabase = createClient()
  const [escola, setEscola] = useState<Escola | null>(null)
  const [papel, setPapel] = useState<'coordenador' | 'professor' | null>(null)
  const [memberships, setMemberships] = useState<EscolaMembership[]>([])
  const [loaded, setLoaded] = useState(false)

  const loadMemberships = useCallback(async () => {
    const allMemberships: EscolaMembership[] = []

    // Escolas que criei
    const { data: myEscolas } = await supabase
      .from('escolas')
      .select('*')
      .eq('criado_por', userId)

    if (myEscolas) {
      for (const e of myEscolas) {
        allMemberships.push({ escola: e as Escola, papel: 'coordenador' })
      }
    }

    // Escolas onde sou membro
    const { data: memberEscolas } = await supabase
      .from('escola_membros')
      .select('papel, escola:escolas(*)')
      .eq('user_id', userId)

    if (memberEscolas) {
      for (const m of memberEscolas) {
        const e = Array.isArray(m.escola) ? m.escola[0] : m.escola
        if (e && !allMemberships.some(x => x.escola.id === (e as Escola).id)) {
          allMemberships.push({
            escola: e as Escola,
            papel: (m.papel as 'coordenador' | 'professor') || 'professor',
          })
        }
      }
    }

    setMemberships(allMemberships)
    return allMemberships
  }, [supabase, userId])

  const refreshEscola = useCallback(async () => {
    const all = await loadMemberships()

    // Restaurar última escola usada do localStorage
    const savedId = typeof window !== 'undefined'
      ? localStorage.getItem('salamap_escola_id')
      : null

    const saved = savedId ? all.find(m => m.escola.id === Number(savedId)) : null

    if (saved) {
      setEscola(saved.escola)
      setPapel(saved.papel)
    } else if (all.length > 0) {
      // Priorizar escola que criei
      const owned = all.find(m => m.escola.criado_por === userId)
      const chosen = owned || all[0]
      setEscola(chosen.escola)
      setPapel(chosen.papel)
      if (typeof window !== 'undefined') {
        localStorage.setItem('salamap_escola_id', String(chosen.escola.id))
      }
    }

    setLoaded(true)
  }, [loadMemberships, userId])

  const switchEscola = useCallback((escolaId: number) => {
    const found = memberships.find(m => m.escola.id === escolaId)
    if (found) {
      setEscola(found.escola)
      setPapel(found.papel)
      if (typeof window !== 'undefined') {
        localStorage.setItem('salamap_escola_id', String(escolaId))
      }
    }
  }, [memberships])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshEscola()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [refreshEscola])

  if (!loaded) {
    return null // Layout mostra loading
  }

  return (
    <EscolaContext value={{ escola, papel, memberships, switchEscola, refreshEscola }}>
      {children}
    </EscolaContext>
  )
}
