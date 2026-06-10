'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/components/providers/auth-provider'
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  UtensilsCrossed,
  LayoutDashboard,
  Menu,
  ChefHat,
  Users,
  Store,
  Settings,
  LogOut,
  FolderLock,
  History,
  ClipboardList,
  Building,
  Grid,
  BookOpen,
} from 'lucide-react'
import Link from 'next/link'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, profile, isLoading, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login')
    }
  }, [isLoading, user, router])

  if (isLoading || !user || !profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4">
        <div className="flex flex-col items-center space-y-4">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-black shadow-lg shadow-amber-500/20">
              <UtensilsCrossed className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-zinc-900 font-[family-name:var(--font-sora)]">GastroLedger</span>
          </div>

          {/* Shimmer animation loading bar */}
          <div className="h-0.5 w-32 bg-zinc-100 rounded-full overflow-hidden">
            <div className="w-1/2 h-full bg-amber-500 rounded-full animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  // Get user initials
  const initials = profile?.full_name 
    ? profile.full_name.split(' ').filter(Boolean).map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U'

  // Define sidebar links based on role
  const isSuperAdmin = profile.role === 'superadmin'

  const navigationItems = isSuperAdmin
    ? [
        { name: 'Superadmin Panel', href: '/superadmin/dashboard', icon: FolderLock },
        { name: 'Negocios SaaS', href: '/superadmin/dashboard', icon: Store },
      ]
    : [
        { name: 'Panel Principal', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Menú / Carta', href: '/dashboard/menu', icon: Menu },
        { name: 'Recetas', href: '/dashboard/recipes', icon: BookOpen },
        { name: 'Inventario', href: '/dashboard/inventory', icon: ClipboardList },
        { name: 'Distribución Mesas', href: '/dashboard/tables', icon: Grid },
        { name: 'Reportes y Ventas', href: '/dashboard/reports', icon: History },
        { name: 'Personal', href: '/dashboard/staff', icon: Users },
        { name: 'Configuración', href: '#', icon: Settings },
      ]

  // Additional screens for admin convenience
  const auxiliaryItems = !isSuperAdmin
    ? [
        { name: 'Pantalla POS', href: '/pos', icon: UtensilsCrossed },
        { name: 'Pantalla Cocina', href: '/kitchen', icon: ChefHat },
      ]
    : []

  const roleLabels: Record<string, string> = {
    superadmin: 'Superadministrador',
    admin: 'Administrador',
    cashier: 'Cajero',
    waiter: 'Mesero',
    cook: 'Cocinero',
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-[#F8F8F9] text-zinc-900 font-[family-name:var(--font-inter)]">
        {/* Sidebar Component */}
        <Sidebar className="border-r-0 bg-[#0F0F0F] text-zinc-400">
          <SidebarHeader className="border-b border-zinc-800 p-5">
            <Link href="/" className="flex items-center space-x-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-black">
                <UtensilsCrossed className="h-5 w-5" />
              </div>
              <span className="font-bold tracking-tight text-base text-white font-[family-name:var(--font-sora)]">GastroLedger</span>
            </Link>
          </SidebarHeader>

          <SidebarContent className="p-3">
            <div className="space-y-4">
              <div>
                <p className="px-3 text-[10px] font-semibold tracking-[0.15em] uppercase text-zinc-600 mb-2">
                  Navegación
                </p>
                <SidebarMenu className="mt-2 space-y-1">
                  {navigationItems.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href
                    return (
                      <SidebarMenuItem key={item.name} className="relative">
                        <SidebarMenuButton
                          render={<Link href={item.href} />}
                          isActive={isActive}
                          className={`flex items-center space-x-3 h-9 px-3 rounded-md text-sm transition-all ${
                            isActive
                              ? 'bg-amber-500/10 text-amber-400 font-medium border-l-2 border-amber-500 rounded-l-none'
                              : 'bg-transparent text-zinc-500 hover:bg-white/5 hover:text-zinc-200'
                          }`}
                        >
                          <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-amber-400' : 'text-zinc-600'}`} />
                          <span>{item.name}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </div>

              {!isSuperAdmin && auxiliaryItems.length > 0 && (
                <div>
                  <p className="px-3 text-[10px] font-semibold tracking-[0.15em] uppercase text-zinc-600 mb-2">
                    Vistas Operativas
                  </p>
                  <SidebarMenu className="mt-2 space-y-1">
                    {auxiliaryItems.map((item) => {
                      const Icon = item.icon
                      const isActive = pathname === item.href
                      return (
                        <SidebarMenuItem key={item.name} className="relative">
                          <SidebarMenuButton
                            render={<Link href={item.href} />}
                            isActive={isActive}
                            className={`flex items-center space-x-3 h-9 px-3 rounded-md text-sm transition-all ${
                              isActive
                                ? 'bg-amber-500/10 text-amber-400 font-medium border-l-2 border-amber-500 rounded-l-none'
                                : 'bg-transparent text-zinc-500 hover:bg-white/5 hover:text-zinc-200'
                            }`}
                          >
                            <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-amber-400' : 'text-zinc-600'}`} />
                            <span>{item.name}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      )
                    })}
                  </SidebarMenu>
                </div>
              )}
            </div>
          </SidebarContent>

          <SidebarFooter className="border-t border-zinc-800 p-4">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 text-xs font-bold shrink-0">
                  {initials}
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-sm font-medium text-zinc-200 truncate max-w-[110px]">
                    {profile.full_name}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {roleLabels[profile.role]}
                  </span>
                </div>
              </div>
              <button
                onClick={() => signOut()}
                className="rounded-md p-1.5 text-zinc-600 hover:bg-red-500/10 hover:text-red-400 transition-all"
                title="Cerrar sesión"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </SidebarFooter>
        </Sidebar>

        {/* Main Workspace Area */}
        <div className="flex flex-col flex-1 w-full min-w-0">
          {/* Dashboard Header Navbar */}
          <header className="flex h-14 items-center justify-between border-b border-zinc-100 bg-white px-6 sticky top-0 z-30">
            <div className="flex items-center space-x-3">
              <SidebarTrigger className="text-zinc-500 hover:text-zinc-900" />
              <div className="w-px h-4 bg-zinc-200"></div>
              <div className="flex items-center space-x-2 text-zinc-800">
                <Building className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-semibold text-zinc-800 font-[family-name:var(--font-inter)]">
                  {isSuperAdmin ? 'Global Admin Panel' : 'Dashboard Negocio'}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* User Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center space-x-2 rounded-full border border-zinc-100 bg-white p-1 pr-3 hover:bg-zinc-50 transition-all cursor-pointer">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 text-xs font-bold">
                    {initials}
                  </div>
                  <span className="hidden text-sm font-medium text-zinc-700 md:inline-block font-[family-name:var(--font-inter)]">
                    {profile.full_name}
                  </span>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 border-zinc-100 bg-white text-zinc-700 shadow-lg shadow-zinc-200/50">
                  <DropdownMenuLabel className="text-zinc-500 font-normal text-xs">
                    Conectado como
                  </DropdownMenuLabel>
                  <DropdownMenuItem className="font-semibold text-zinc-900 hover:bg-zinc-50">
                    {profile.email}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-zinc-100" />
                  <DropdownMenuItem className="text-zinc-700 hover:bg-zinc-50 focus:bg-zinc-50 focus:text-zinc-900 cursor-pointer">
                    Mi Perfil
                  </DropdownMenuItem>
                  {isSuperAdmin && (
                    <DropdownMenuItem
                      onClick={() => router.push('/superadmin/dashboard')}
                      className="text-zinc-700 hover:bg-zinc-50 focus:bg-zinc-50 focus:text-zinc-900 cursor-pointer"
                    >
                      Panel Superadmin
                    </DropdownMenuItem>
                  )}
                  {!isSuperAdmin && (
                    <DropdownMenuItem className="text-zinc-700 hover:bg-zinc-50 focus:bg-zinc-50 focus:text-zinc-900 cursor-pointer">
                      Datos de Empresa
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator className="bg-zinc-100" />
                  <DropdownMenuItem
                    onClick={() => signOut()}
                    className="text-red-500 hover:bg-red-50 focus:bg-red-50 focus:text-red-600 cursor-pointer"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Cerrar Sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Main Sub-route Content */}
          <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-[#F8F8F9]">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
