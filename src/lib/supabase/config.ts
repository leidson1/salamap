const PLACEHOLDER_SUPABASE_URLS = new Set([
  'https://your-project.supabase.co',
  'https://placeholder.supabase.co',
])

const PLACEHOLDER_SUPABASE_KEYS = new Set([
  'your-supabase-anon-key',
  'placeholder-key',
])

const FALLBACK_SUPABASE_URL = 'https://placeholder.supabase.co'
const FALLBACK_SUPABASE_KEY = 'placeholder-key'

export interface SupabaseConfigStatus {
  url: string
  publicKey: string
  isConfigured: boolean
  issues: string[]
  keySource: 'publishable' | 'anon' | 'missing'
}

function isPlaceholderUrl(url: string) {
  return PLACEHOLDER_SUPABASE_URLS.has(url) || url.includes('your-project.supabase.co')
}

function isPlaceholderKey(key: string) {
  return PLACEHOLDER_SUPABASE_KEYS.has(key) || key.includes('your-supabase-anon-key')
}

export function getSupabaseConfigStatus(): SupabaseConfigStatus {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim()
  const publishableKey = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '').trim()
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim()
  const publicKey = publishableKey || anonKey
  const keySource = publishableKey ? 'publishable' : anonKey ? 'anon' : 'missing'
  const issues: string[] = []

  if (!url) {
    issues.push('NEXT_PUBLIC_SUPABASE_URL ausente')
  } else {
    try {
      const parsed = new URL(url)
      const isLocalHost = ['localhost', '127.0.0.1', '::1'].includes(parsed.hostname)
      const usesAllowedProtocol = parsed.protocol === 'https:' || (parsed.protocol === 'http:' && isLocalHost)

      if (!usesAllowedProtocol) {
        issues.push('NEXT_PUBLIC_SUPABASE_URL deve usar https')
      }
    } catch {
      issues.push('NEXT_PUBLIC_SUPABASE_URL invalida')
    }

    if (isPlaceholderUrl(url)) {
      issues.push('NEXT_PUBLIC_SUPABASE_URL ainda esta com valor de exemplo')
    }
  }

  if (!publicKey) {
    issues.push('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ou NEXT_PUBLIC_SUPABASE_ANON_KEY ausente')
  } else if (isPlaceholderKey(publicKey)) {
    issues.push(
      keySource === 'publishable'
        ? 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ainda esta com valor de exemplo'
        : 'NEXT_PUBLIC_SUPABASE_ANON_KEY ainda esta com valor de exemplo'
    )
  }

  return {
    url,
    publicKey,
    isConfigured: issues.length === 0,
    issues,
    keySource,
  }
}

export function getSupabaseResolvedConfig() {
  const status = getSupabaseConfigStatus()

  return {
    ...status,
    resolvedUrl: status.isConfigured ? status.url : FALLBACK_SUPABASE_URL,
    resolvedAnonKey: status.isConfigured ? status.publicKey : FALLBACK_SUPABASE_KEY,
  }
}

export function getSupabaseConfigHelpText() {
  return 'Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY em .env.local. NEXT_PUBLIC_SUPABASE_ANON_KEY continua aceito por compatibilidade.'
}
