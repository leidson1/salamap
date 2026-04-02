'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Home, Users, LogOut, LayoutGrid, Settings,
  ChevronDown, Check, Crown, GraduationCap,
} from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { useEscola } from '@/lib/escola-context'
import { cn } from '@/lib/utils'
import { useState } from 'react'

interface SidebarProps {
  user: {
    nome: string
    email: string
  }
  currentPath: string
}

export function SidebarContent({ user, currentPath }: SidebarProps) {
  const router = useRouter()
  const supabase = createClient()
  const { escola, papel, memberships, switchEscola } = useEscola()
  const [switcherOpen, setSwitcherOpen] = useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isActive = (href: string) => {
    if (href === '/dashboard') return currentPath === '/dashboard'
    return currentPath.startsWith(href)
  }

  const navItems = [
    { href: '/dashboard', label: 'Início', icon: Home },
    { href: '/turmas', label: 'Minhas Turmas', icon: Users },
    { href: '/escola', label: 'Configurações', icon: Settings },
  ]

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-emerald-950 via-emerald-900 to-emerald-800">
      {/* Workspace Switcher */}
      <div className="px-3 pt-4 pb-2">
        <button
          onClick={() => setSwitcherOpen(!switcherOpen)}
          className="flex w-full items-center gap-2.5 rounded-lg bg-white/10 px-3 py-2.5 text-left transition-colors hover:bg-white/15"
        >
          {escola?.logo_url ? (
            <img src={escola.logo_url} alt="" className="h-8 w-8 rounded-md object-cover" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white/15">
              <LayoutGrid className="h-4 w-4 text-white" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">
              {escola?.nome || 'SalaMap'}
            </p>
            {papel && (
              <p className="text-[10px] text-emerald-300 truncate">
                {papel === 'coordenador' ? 'Coordenador' : 'Professor'}
              </p>
            )}
          </div>
          <ChevronDown className={cn(
            'size-4 text-emerald-300 transition-transform',
            switcherOpen && 'rotate-180'
          )} />
        </button>

        {/* Dropdown de escolas */}
        {switcherOpen && memberships.length > 1 && (
          <div className="mt-1 rounded-lg bg-white/10 p-1.5 space-y-0.5">
            {memberships.map((m) => {
              const isActive = escola?.id === m.escola.id
              return (
                <button
                  key={m.escola.id}
                  onClick={() => {
                    switchEscola(m.escola.id)
                    setSwitcherOpen(false)
                  }}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors',
                    isActive
                      ? 'bg-white/15 text-white'
                      : 'text-emerald-200 hover:bg-white/10 hover:text-white'
                  )}
                >
                  {m.escola.logo_url ? (
                    <img src={m.escola.logo_url} alt="" className="h-6 w-6 rounded object-cover" />
                  ) : (
                    <div className="flex h-6 w-6 items-center justify-center rounded bg-white/10">
                      <LayoutGrid className="size-3 text-white/70" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{m.escola.nome}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge variant="outline" className="text-[8px] border-white/20 text-emerald-300 px-1 py-0">
                      {m.papel === 'coordenador' ? 'Coord.' : 'Prof.'}
                    </Badge>
                    {isActive && <Check className="size-3 text-emerald-400" />}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 mt-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                active
                  ? 'bg-white/10 font-semibold text-white'
                  : 'text-emerald-200 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {item.label}
            </Link>
          )
        })}

        <Separator className="!my-3 bg-white/10" />
      </nav>

      {/* User info + Logout */}
      <div className="border-t border-white/10 p-4">
        <div className="mb-3">
          <p className="truncate text-sm font-medium text-white">
            {user.nome}
          </p>
          <p className="truncate text-xs text-emerald-300">{user.email}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-emerald-200 transition-colors hover:bg-white/5 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </div>
  )
}

export function Sidebar({ user, currentPath }: SidebarProps) {
  return (
    <aside className="hidden w-64 shrink-0 lg:block">
      <div className="fixed inset-y-0 left-0 z-30 w-64">
        <SidebarContent user={user} currentPath={currentPath} />
      </div>
    </aside>
  )
}
