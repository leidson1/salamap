import { createBrowserClient } from '@supabase/ssr'
import { getSupabaseConfigHelpText, getSupabaseResolvedConfig } from '@/lib/supabase/config'

let client: ReturnType<typeof createBrowserClient> | null = null
let warnedAboutSupabaseConfig = false

export function createClient() {
  if (client) return client

  const { isConfigured, resolvedUrl, resolvedAnonKey } = getSupabaseResolvedConfig()

  if (!isConfigured && !warnedAboutSupabaseConfig) {
    console.warn(getSupabaseConfigHelpText())
    warnedAboutSupabaseConfig = true
  }

  client = createBrowserClient(resolvedUrl, resolvedAnonKey)
  return client
}
