'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/components/providers/auth-provider'
import { getOrders, updateKitchenStatus, updateOrderItemStatus } from '@/app/actions/orders'
import { getActiveAttendance, clockIn, clockOut } from '@/app/actions/attendance'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardFooter, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { usePlanGuard } from '@/hooks/usePlanGuard'
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
  Clock,
  LogOut,
  Building,
  Check,
  Flame,
  ChefHat,
  Loader2,
  AlertTriangle,
  RefreshCw
} from 'lucide-react'
import { toast } from 'sonner'

interface OrderDetailType {
  id: string
  menu_item_id: string
  quantity: number
  price_at_time: number
  status: 'pending' | 'ready'
  notes?: string | null
  menu_items: {
    name: string
    category: string
  }
}

interface OrderType {
  id: string
  business_id: string
  table_id: string
  status: 'pending' | 'preparing' | 'ready' | 'paid' | 'cancelled'
  total: number
  created_at: string
  tables?: {
    table_number: number
  } | null
  order_details: OrderDetailType[]
  profiles?: {
    full_name: string
  } | null
}

interface AttendanceType {
  id: string
  profile_id: string
  business_id: string
  date: string
  clock_in: string
  clock_out: string | null
  total_hours: number | null
}

export default function KitchenDisplay() {
  const { profile, signOut } = useAuth()
  const queryClient = useQueryClient()
  const supabase = createClient()
  const router = useRouter()
  const { hasAccess } = usePlanGuard('pro')
  const [, setTimeTracker] = useState(0)

  // Attendance states
  const [activeAttendance, setActiveAttendance] = useState<AttendanceType | null>(null)
  const [isClocking, setIsClocking] = useState(false)

  // Fetch active shift on mount
  useEffect(() => {
    async function loadAttendance() {
      if (profile && (profile.role === 'waiter' || profile.role === 'cashier' || profile.role === 'cook')) {
        const active = await getActiveAttendance()
        setActiveAttendance(active)
      }
    }
    loadAttendance()
  }, [profile])

  const handleClockIn = async () => {
    setIsClocking(true)
    try {
      const active = await clockIn()
      setActiveAttendance(active)
      toast.success('Entrada de turno registrada correctamente.')
    } catch (err) {
      toast.error((err as Error).message || 'Error al registrar entrada')
    } finally {
      setIsClocking(false)
    }
  }

  const handleClockOut = async () => {
    setIsClocking(true)
    try {
      const closed = await clockOut()
      setActiveAttendance(null)
      toast.success(`Turno finalizado. Horas trabajadas: ${closed.total_hours} hrs.`)
    } catch (err) {
      toast.error((err as Error).message || 'Error al registrar salida')
    } finally {
      setIsClocking(false)
    }
  }

  // Force re-renders every 30 seconds to update the "elapsed minutes" timer
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeTracker((t) => t + 1)
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  // Realtime subscription setup
  useEffect(() => {
    const channel = supabase
      .channel('kds-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        queryClient.invalidateQueries({ queryKey: ['kds-orders'] })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_details' }, () => {
        queryClient.invalidateQueries({ queryKey: ['kds-orders'] })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, queryClient])

  // Query to fetch pending and preparing orders
  const { data: orders = [], isLoading, isError, error, refetch } = useQuery<OrderType[], Error>({
    queryKey: ['kds-orders'],
    queryFn: () => getOrders(['pending', 'preparing']) as Promise<OrderType[]>,
  })

  // Mutations
  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: 'pending' | 'preparing' | 'ready' }) =>
      updateKitchenStatus(orderId, status),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['kds-orders'] })
      if (data.status === 'ready') {
        toast.success(`Pedido para Mesa ${data.table_id ? 'Mesa' : ''} completado y listo para despacho!`)
      } else {
        toast.info('Estado del pedido actualizado')
      }
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Error al actualizar el estado')
    }
  })

  const updateItemMutation = useMutation({
    mutationFn: ({ detailId, status }: { detailId: string; status: 'pending' | 'ready' }) =>
      updateOrderItemStatus(detailId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kds-orders'] })
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Error al actualizar plato')
    }
  })

  // Handlers
  const handleOrderStatusChange = (orderId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'pending' ? 'preparing' : 'ready'
    updateStatusMutation.mutate({ orderId, status: nextStatus })
  }

  const handleItemCheck = (detailId: string, currentStatus: 'pending' | 'ready') => {
    const nextStatus = currentStatus === 'pending' ? 'ready' : 'pending'
    updateItemMutation.mutate({ detailId, status: nextStatus })
  }

  // Calculate elapsed time in minutes
  const getMinutesElapsed = (createdAtStr: string) => {
    const elapsedMs = new Date().getTime() - new Date(createdAtStr).getTime()
    return Math.floor(elapsedMs / 60000)
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-[#F8F8F9] text-zinc-900 font-[family-name:var(--font-inter)] select-none">
        {/* Left Sidebar */}
        <Sidebar className="border-r-0 bg-[#0F0F0F] text-zinc-400">
          <SidebarHeader className="border-b border-zinc-800 p-5">
            <div className="flex items-center space-x-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-black">
                <ChefHat className="h-5 w-5" />
              </div>
              <span className="font-bold tracking-tight text-base text-white font-[family-name:var(--font-sora)]">GastroLedger</span>
            </div>
          </SidebarHeader>

          <SidebarContent className="p-4 flex flex-col justify-between h-full">
            <div className="space-y-6">
              <div>
                <p className="px-3 text-[10px] font-semibold tracking-[0.15em] uppercase text-zinc-600 mb-2">
                  Navegación Cocina
                </p>
                <SidebarMenu className="space-y-1">
                  <SidebarMenuItem>
                    <SidebarMenuButton isActive={true} className="flex items-center space-x-3 h-9 px-3 rounded-md text-sm bg-amber-500/10 text-amber-400 font-medium border-l-2 border-amber-500 rounded-l-none cursor-pointer">
                      <ChefHat className="h-4 w-4 shrink-0 text-amber-400" />
                      <span>Pantalla Cocina</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  {profile?.role === 'admin' && (
                    <SidebarMenuItem>
                      <SidebarMenuButton 
                        onClick={() => router.push('/dashboard')}
                        className="flex items-center space-x-3 h-9 px-3 rounded-md text-sm bg-transparent text-zinc-500 hover:bg-white/5 hover:text-zinc-200 cursor-pointer"
                      >
                        <Building className="h-4 w-4 shrink-0 text-zinc-600" />
                        <span>Volver al Dashboard</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                </SidebarMenu>
              </div>

              {/* Attendance Shift Control */}
              <div className="px-3 py-4 bg-zinc-900/50 border border-zinc-800/80 rounded-xl space-y-3">
                <p className="text-[10px] font-bold tracking-[0.1em] uppercase text-zinc-500">
                  Control de Turno
                </p>
                {!hasAccess ? (
                  <div className="text-xs text-zinc-555 space-y-1 p-2.5 bg-zinc-950/40 rounded border border-zinc-850">
                    <span className="font-bold block text-zinc-400">Control de Asistencia</span>
                    <p className="text-[10px] text-zinc-500 mt-1 leading-normal">Actualiza a Pro para controlar horas de personal.</p>
                  </div>
                ) : activeAttendance ? (
                  <div className="space-y-2">
                    <div className="text-xs text-zinc-400 space-y-0.5">
                      <span className="block text-[10px] uppercase font-bold text-emerald-500">Turno Activo</span>
                      <span>Entrada: {new Date(activeAttendance.clock_in).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <Button
                      onClick={handleClockOut}
                      disabled={isClocking}
                      className="w-full bg-red-650 hover:bg-red-700 text-white font-bold text-xs h-9 cursor-pointer"
                    >
                      {isClocking ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                      SALIR DE TURNO
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[10px] text-zinc-500 font-medium">No estás en turno actualmente.</p>
                    <Button
                      onClick={handleClockIn}
                      disabled={isClocking}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-black font-extrabold text-xs h-9 cursor-pointer"
                    >
                      {isClocking ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                      ENTRAR A TURNO
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </SidebarContent>

          <SidebarFooter className="border-t border-zinc-800 p-4">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 text-xs font-bold shrink-0">
                  {profile?.full_name ? profile.full_name.split(' ').filter(Boolean).map((n) => n[0]).join('').toUpperCase().slice(0, 2) : 'U'}
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-sm font-medium text-zinc-200 truncate max-w-[110px]">
                    {profile?.full_name}
                  </span>
                  <span className="text-xs text-zinc-500 uppercase tracking-wider text-[9px] font-bold">
                    Cocinero
                  </span>
                </div>
              </div>
              <button
                onClick={() => signOut()}
                className="rounded-md p-1.5 text-zinc-650 hover:bg-red-500/10 hover:text-red-400 transition-all cursor-pointer"
                title="Cerrar sesión"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </SidebarFooter>
        </Sidebar>

        {/* Main Workspace Area */}
        <div className="flex flex-col flex-1 w-full min-w-0">
          {/* Kitchen Header */}
          <header className="flex h-16 shrink-0 items-center justify-between border-b border-zinc-100 bg-white px-6">
            <div className="flex items-center space-x-3">
              <SidebarTrigger className="text-zinc-500 hover:text-zinc-900 cursor-pointer" />
              <div className="w-px h-4 bg-zinc-200"></div>
              <div className="flex items-center space-x-2 text-zinc-800">
                <Building className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-semibold text-zinc-800 font-[family-name:var(--font-inter)]">
                  La Parrilla del Sol (Kitchen KDS)
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => refetch()}
                className="h-8 w-8 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 cursor-pointer"
                title="Refrescar comanda"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </header>

      {/* Kitchen Main Body */}
      <div className="flex-1 overflow-y-auto p-6 bg-zinc-50">
        <div className="flex items-center justify-between mb-6 shrink-0">
          <h2 className="text-xl font-bold text-zinc-800 flex items-center space-x-2 font-[family-name:var(--font-sora)]">
            <Flame className="h-5 w-5 text-orange-500 animate-pulse" />
            <span>Cola de Pedidos Activos</span>
          </h2>
          <span className="rounded-full bg-white border border-zinc-200 px-3 py-1 text-xs text-zinc-600 font-bold">
            {orders.length} pedidos en preparación
          </span>
        </div>

        {isLoading ? (
          <div className="flex h-[50vh] items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
          </div>
        ) : isError ? (
          <div className="max-w-md mx-auto rounded-lg bg-red-50 p-6 text-center text-sm text-red-750 border border-red-200 space-y-3">
            <AlertTriangle className="h-8 w-8 text-red-500 mx-auto" />
            <p className="font-bold">Error de sincronización con la cocina</p>
            <p className="text-xs text-zinc-500">{error.message}</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[55vh] text-center text-zinc-400 animate-in fade-in duration-300">
            <Check className="h-16 w-16 text-emerald-655 bg-emerald-50 p-4 rounded-full mb-4 border border-emerald-100" />
            <h3 className="font-black text-zinc-800 text-lg font-[family-name:var(--font-sora)]">¡Cocina al Día!</h3>
            <p className="text-xs text-zinc-500 max-w-xs mt-1">
              No hay comandas pendientes de preparación en este momento. Buen trabajo.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 animate-in fade-in duration-500">
            {orders.map((ord) => {
              const minutesElapsed = getMinutesElapsed(ord.created_at)
              const isPreparing = ord.status === 'preparing'
              const allItemsReady = ord.order_details.every(item => item.status === 'ready')

              return (
                <Card
                  key={ord.id}
                  className={`border-zinc-200 bg-white relative overflow-hidden transition-all flex flex-col justify-between ${
                    isPreparing 
                      ? 'ring-2 ring-amber-500/20 border-amber-500/30 shadow-md shadow-amber-500/5' 
                      : 'shadow-sm opacity-95 hover:opacity-100'
                  }`}
                >
                  {/* Status indicator bar */}
                  <div className={`h-1.5 w-full transition-colors ${
                    isPreparing ? 'bg-amber-500' : 'bg-zinc-300'
                  }`} />

                  <div>
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-black text-zinc-900 font-[family-name:var(--font-sora)]">
                          {ord.tables ? `Mesa ${ord.tables.table_number}` : 'Llevar / Delivery'}
                        </span>
                        <div className={`flex items-center text-xs font-bold px-2 py-0.5 rounded border ${
                          minutesElapsed >= 15 
                            ? 'text-red-700 bg-red-50 border-red-200 animate-pulse'
                            : minutesElapsed >= 10
                            ? 'text-amber-700 bg-amber-50 border-amber-200'
                            : 'text-zinc-600 bg-zinc-100 border-zinc-200'
                        }`}>
                          <Clock className="h-3 w-3 mr-1" />
                          <span>{minutesElapsed} min</span>
                        </div>
                      </div>
                      <CardDescription className="text-zinc-400 text-[10px] font-bold mt-1">
                        ID: {ord.id.substring(0, 8).toUpperCase()} • {new Date(ord.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                      </CardDescription>
                    </CardHeader>

                    {/* Order Details list with checkboxes */}
                    <CardContent className="p-4 py-2">
                      <ul className="space-y-3.5">
                        {ord.order_details.map((detail) => {
                          const isItemReady = detail.status === 'ready'
                          return (
                            <li
                              key={detail.id}
                              onClick={() => handleItemCheck(detail.id, detail.status)}
                              className="group flex flex-col cursor-pointer pb-2.5 border-b border-zinc-100 last:border-0 last:pb-0"
                            >
                              <div className="flex flex-col space-y-1 w-full">
                                <div className="flex items-start justify-between">
                                  <div className="flex items-center space-x-2.5 flex-1 pr-2">
                                    <button
                                      type="button"
                                      className={`h-4.5 w-4.5 rounded flex items-center justify-center border transition-all shrink-0 ${
                                        isItemReady
                                          ? 'bg-emerald-500 border-emerald-500 text-black'
                                          : 'border-zinc-300 bg-white group-hover:border-zinc-450'
                                      }`}
                                    >
                                      {isItemReady && <Check className="h-3 w-3 stroke-[3]" />}
                                    </button>
                                    <span className={`text-sm font-semibold transition-all ${
                                      isItemReady 
                                        ? 'text-zinc-400 line-through' 
                                        : 'text-zinc-800 group-hover:text-zinc-950'
                                    }`}>
                                      {detail.menu_items?.name}
                                    </span>
                                  </div>
                                  <span className={`rounded px-2.5 py-0.5 text-xs font-bold transition-all border ${
                                    isItemReady
                                      ? 'bg-zinc-50 text-zinc-400 border-zinc-100'
                                      : 'bg-zinc-100 text-zinc-800 border-zinc-200'
                                  }`}>
                                    x{detail.quantity}
                                  </span>
                                </div>
                                {detail.notes && (
                                  <div className="text-[11px] font-bold pl-7 text-[var(--warn)]">
                                    ⚠ {detail.notes}
                                  </div>
                                )}
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                    </CardContent>
                  </div>

                  {/* Dispatch / Start buttons */}
                  <CardFooter className="p-4 border-t border-zinc-100 mt-4 bg-zinc-50/10">
                    <Button
                      onClick={() => handleOrderStatusChange(ord.id, ord.status)}
                      disabled={updateStatusMutation.isPending || updateItemMutation.isPending}
                      className={`w-full font-bold text-xs ${
                        !isPreparing
                          ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 hover:text-zinc-950 border border-zinc-200 shadow-sm'
                          : allItemsReady
                          ? 'bg-emerald-500 text-black hover:bg-emerald-600 font-extrabold shadow-sm'
                          : 'bg-amber-500 text-black hover:bg-amber-600 font-semibold shadow-sm'
                      }`}
                    >
                      {updateStatusMutation.isPending ? (
                        <Loader2 className="h-4.5 w-4.5 animate-spin" />
                      ) : !isPreparing ? (
                        'Empezar Preparación'
                      ) : allItemsReady ? (
                        'Despachar Pedido (Listo)'
                      ) : (
                        'Marcar Todo Listo'
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
   </div>
  </SidebarProvider>
 )
}
