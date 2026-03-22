'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import {
  LayoutDashboard,
  Trophy,
  Users,
  Briefcase,
  BookOpen,
  Megaphone,
  HandCoins,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Shield,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Role } from '@prisma/client'
import { CAN } from '@/lib/rbac'
import { useState } from 'react'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  minRole?: Role
  checkPerm?: (role: Role) => boolean
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Command Center', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Tournaments', href: '/dashboard/tournaments', icon: Trophy },
  { label: 'Teams', href: '/dashboard/teams', icon: Users },
  { label: 'WorkPlay & DIBs', href: '/dashboard/workplay', icon: Briefcase },
  { label: 'Knowledge Base', href: '/dashboard/knowledge', icon: BookOpen },
  { label: 'Sponsors', href: '/dashboard/sponsors', icon: HandCoins, checkPerm: CAN.viewSponsors },
  { label: 'Comms', href: '/dashboard/comms', icon: Megaphone },
  { label: 'Admin', href: '/dashboard/admin', icon: Shield, checkPerm: CAN.manageUsers },
]

function canSeeItem(item: NavItem, role: Role): boolean {
  if (item.checkPerm) return item.checkPerm(role)
  return true
}

export function Sidebar() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const role = session?.user?.role ?? 'ATHLETE'

  return (
    <aside
      className={cn(
        'flex flex-col bg-slate-900 border-r border-slate-800 transition-all duration-200 shrink-0',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo + collapse */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-slate-800">
        {!collapsed && (
          <div>
            <div className="text-sm font-bold text-sky-400 leading-none">MID TN VB</div>
            <div className="text-xs text-slate-500 mt-0.5">Ops Dashboard</div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors ml-auto"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Nav links */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {NAV_ITEMS.filter((item) => canSeeItem(item, role as Role)).map((item) => {
          const isActive =
            item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sky-500/15 text-sky-400 border border-sky-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* User + sign out */}
      {session?.user && (
        <div className="border-t border-slate-800 p-3">
          {!collapsed && (
            <div className="px-2 pb-2">
              <div className="text-sm font-medium text-slate-200 truncate">
                {session.user.name}
              </div>
              <div className="text-xs text-slate-500 truncate">{session.user.role}</div>
            </div>
          )}
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            title={collapsed ? 'Sign out' : undefined}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && 'Sign out'}
          </button>
        </div>
      )}
    </aside>
  )
}
