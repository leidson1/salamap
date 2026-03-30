'use client'

import { createContext, useContext } from 'react'
import type { Escola } from '@/types/database'

interface EscolaContextType {
  escola: Escola | null
  refreshEscola: () => Promise<void>
}

export const EscolaContext = createContext<EscolaContextType>({
  escola: null,
  refreshEscola: async () => {},
})

export function useEscola() {
  return useContext(EscolaContext)
}
