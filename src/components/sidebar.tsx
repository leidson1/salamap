'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Home,
  Users,
  LogOut,
  LayoutGrid,
  Settings,
} from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { createClient } from '@/lib/supabase/client'
import type { Escola } from '@/types/database'

interface SidebarProps {
  user: {
    nome: string
    email: string
  }
  currentPath: string
  escola?: Escola | null
}

export function SidebarContent({ user, currentPath, escola }: SidebarProps) {
  const router = useRouter()
  const supabase = createClient()

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
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-6">
        {escola?.logo_url ? (
          <img src={escola.logo_url} alt="" className="h-9 w-9 rounded-lg object-cover" />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
            <LayoutGrid className="h-5 w-5 text-white" />
          </div>
        )}
        <div className="min-w-0">
          <span className="text-lg font-bold tracking-tight text-white block truncate">
            {escola?.nome || 'SalaMap'}
          </span>
          {escola && (
            <span className="text-[10px] text-emerald-300 block truncate">SalaMap</span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3">
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

export function Sidebar({ user, currentPath, escola }: SidebarProps) {
  return (
    <aside className="hidden w-64 shrink-0 lg:block">
      <div className="fixed inset-y-0 left-0 z-30 w-64">
        <SidebarContent user={user} currentPath={currentPath} escola={escola} />
      </div>
    </aside>
  )
}
