'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, HardHat, DollarSign, Clock, Truck, FileText,
  Building2, ChevronLeft, ChevronRight, LogOut, Settings, ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useRole } from '@/lib/hooks/useRole'
import { toast } from 'sonner'
import { useState } from 'react'

const navItems = [
  {
    href: '/',
    label: 'Dashboard',
    icon: LayoutDashboard,
    exact: true,
  },
  {
    href: '/obras',
    label: 'Obras y Zonas',
    icon: HardHat,
  },
  {
    href: '/finanzas',
    label: 'Finanzas',
    icon: DollarSign,
  },
  {
    href: '/rrhh',
    label: 'RRHH',
    icon: Clock,
    children: [
      { href: '/rrhh/fichaje', label: 'Fichaje' },
      { href: '/rrhh/nominas', label: 'Nóminas' },
    ],
  },
  {
    href: '/flota',
    label: 'Flota Vehicular',
    icon: Truck,
  },
  {
    href: '/documentos',
    label: 'Documentos',
    icon: FileText,
  },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { perfil, rol } = useRole()
  const [rrhhOpen, setRrhhOpen] = useState(pathname.startsWith('/rrhh'))

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success('Sesión cerrada')
    router.push('/login')
  }

  function isActive(href: string, exact = false) {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  return (
    <aside
      className={cn(
        'relative flex flex-col h-full border-r border-border/50 transition-all duration-300',
        collapsed ? 'w-16' : 'w-64',
        'glass-strong'
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 p-4 border-b border-border/30 h-16">
        <div
          className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, oklch(0.62 0.22 264), oklch(0.58 0.24 300))',
          }}
        >
          <Building2 className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="font-bold text-sm leading-tight gradient-text">SotoAlsur</p>
            <p className="text-[10px] text-muted-foreground leading-tight">ERP Operacional</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = item.children
            ? isActive(item.href)
            : isActive(item.href, item.exact)

          if (item.children) {
            return (
              <div key={item.href}>
                <button
                  id={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={() => setRrhhOpen(!rrhhOpen)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium',
                    'hover:bg-accent/50 transition-colors duration-150',
                    active ? 'bg-primary/10 text-primary' : 'text-muted-foreground',
                    collapsed && 'justify-center'
                  )}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      <ChevronDown
                        className={cn(
                          'w-3 h-3 transition-transform duration-200',
                          rrhhOpen && 'rotate-180'
                        )}
                      />
                    </>
                  )}
                </button>
                {!collapsed && rrhhOpen && (
                  <div className="ml-7 mt-1 space-y-1">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        id={`nav-${child.label.toLowerCase().replace(/\s+/g, '-')}`}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2 rounded-lg text-sm',
                          'hover:bg-accent/50 transition-colors duration-150',
                          pathname === child.href
                            ? 'text-primary font-medium'
                            : 'text-muted-foreground'
                        )}
                      >
                        <span className="w-1 h-1 rounded-full bg-current opacity-60" />
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              id={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium',
                'hover:bg-accent/50 transition-colors duration-150',
                active
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-muted-foreground',
                collapsed && 'justify-center'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* User + Logout */}
      <div className="p-3 border-t border-border/30 space-y-1">
        {!collapsed && perfil && (
          <div className="px-3 py-2 rounded-xl glass mb-2">
            <p className="text-xs font-medium text-foreground truncate">{perfil.nombre_completo}</p>
            <p className="text-[10px] text-muted-foreground capitalize">
              {perfil.rol === 'PROPIETARIO' ? '👑 Propietario' :
               perfil.rol === 'SECRETARIA' ? '📋 Secretaria' : '👷 Trabajador'}
            </p>
          </div>
        )}
        <button
          id="btn-logout"
          onClick={handleLogout}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm',
            'text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors',
            collapsed && 'justify-center'
          )}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
      </div>

      {/* Collapse Toggle */}
      <button
        id="sidebar-toggle-btn"
        onClick={onToggle}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full border border-border/50
          bg-card flex items-center justify-center shadow-lg
          hover:bg-accent transition-colors duration-150 z-10"
      >
        {collapsed ? (
          <ChevronRight className="w-3 h-3 text-muted-foreground" />
        ) : (
          <ChevronLeft className="w-3 h-3 text-muted-foreground" />
        )}
      </button>
    </aside>
  )
}
