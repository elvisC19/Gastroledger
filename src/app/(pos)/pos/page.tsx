'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/components/providers/auth-provider'
import { getTables } from '@/app/actions/tables'
import { getMenuItems } from '@/app/actions/menu'
import { getOrders, createOrder, completePayment, updateOrderDetailQuantity, updateKitchenStatus } from '@/app/actions/orders'
import { getActiveAttendance, clockIn, clockOut } from '@/app/actions/attendance'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { usePlanGuard } from '@/hooks/usePlanGuard'
import { generateInvoicePDF } from '@/lib/pdf'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  UtensilsCrossed,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  LogOut,
  Building,
  CheckCircle2,
  Search,
  Loader2,
  QrCode,
  Coffee,
  Flame,
  Pencil,
  ChefHat
} from 'lucide-react'
import { toast } from 'sonner'
import QRCode from 'qrcode'

interface MenuItemType {
  id: string
  name: string
  price: number
  category: string
  image_url?: string | null
}

interface CartItem extends MenuItemType {
  quantity: number
  notes?: string | null
}

interface TableType {
  id: string
  table_number: number
  status: 'free' | 'occupied'
}

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

interface CashSessionType {
  id: string
  business_id: string
  user_id: string
  opening_amount: number
  closing_amount: number | null
  status: 'open' | 'closed'
  opened_at: string
  closed_at: string | null
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

export default function PosTerminal() {
  const { user, profile, signOut } = useAuth()
  const queryClient = useQueryClient()
  const supabase = createClient()
  const router = useRouter()

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

  const { hasAccess } = usePlanGuard('pro')
  const [clientName, setClientName] = useState('')
  const [clientNit, setClientNit] = useState('')

  const [checkoutOrder, setCheckoutOrder] = useState<OrderType | null>(null)
  const [checkoutStep, setCheckoutStep] = useState<'payment' | 'billing' | 'success'>('payment')
  const [paymentMethod, setPaymentMethod] = useState<'qr' | 'cash'>('qr')

  // Edit Note States
  const [editingNoteItemId, setEditingNoteItemId] = useState<string | null>(null)
  const [editingNoteText, setEditingNoteText] = useState('')

  // Mobile cart drawer state
  const [showCartMobile, setShowCartMobile] = useState(false)

  // Attendance states
  const [activeAttendance, setActiveAttendance] = useState<AttendanceType | null>(null)
  const [isClocking, setIsClocking] = useState(false)

  // Load active attendance session
  useEffect(() => {
    async function loadAttendance() {
      if (profile && (profile.role === 'waiter' || profile.role === 'cashier' || profile.role === 'cook')) {
        const active = await getActiveAttendance()
        setActiveAttendance(active)
      }
    }
    loadAttendance()
  }, [profile])

  // Cash Session State
  const [activeSession, setActiveSession] = useState<CashSessionType | null>(null)
  const [loadingSession, setLoadingSession] = useState(true)
  const [openingAmountInput, setOpeningAmountInput] = useState('')
  const [isOpeningCaja, setIsOpeningCaja] = useState(false)

  // Closing Session Modal State
  const [isCloseSessionOpen, setIsCloseSessionOpen] = useState(false)
  const [turnSales, setTurnSales] = useState(0)
  const [loadingSales, setLoadingSales] = useState(false)
  const [isClosingCaja, setIsClosingCaja] = useState(false)

  useEffect(() => {
    const checkSession = async () => {
      if (!profile) return
      if (profile.role !== 'cashier') {
        setLoadingSession(false)
        return
      }
      try {
        const { data, error } = await supabase
          .from('cash_sessions')
          .select('*')
          .eq('user_id', user?.id)
          .eq('status', 'open')
          .maybeSingle()

        if (error) throw error
        setActiveSession(data as CashSessionType)
      } catch (err) {
        console.error('Error checking cash session:', err)
        toast.error('Error al verificar sesión de caja')
      } finally {
        setLoadingSession(false)
      }
    }

    if (profile) {
      checkSession()
    }
  }, [profile, user, supabase])

  const handleOpenCaja = async (e: React.FormEvent) => {
    e.preventDefault()
    const amount = parseFloat(openingAmountInput)
    if (isNaN(amount) || amount < 0) {
      toast.error('Por favor ingresa un monto válido')
      return
    }
    if (!profile?.business_id || !user) {
      toast.error('Perfil o negocio no válido')
      return
    }

    setIsOpeningCaja(true)
    try {
      const { data, error } = await supabase
        .from('cash_sessions')
        .insert({
          business_id: profile.business_id,
          user_id: user.id,
          opening_amount: amount,
          status: 'open'
        })
        .select()
        .single()

      if (error) throw error
      setActiveSession(data as CashSessionType)
      toast.success('Caja abierta correctamente')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al abrir la caja'
      toast.error(msg)
    } finally {
      setIsOpeningCaja(false)
    }
  }

  const fetchTurnSales = async () => {
    if (!profile || !profile.business_id || !activeSession) return 0
    const { data, error } = await supabase
      .from('orders')
      .select('total')
      .eq('business_id', profile.business_id)
      .eq('status', 'paid')
      .gte('created_at', activeSession.opened_at)

    if (error) {
      console.error('Error fetching turn sales:', error)
      return 0
    }
    return (data || []).reduce((sum, order) => sum + Number(order.total), 0)
  }

  const handleOpenCloseSessionModal = async () => {
    if (!activeSession || !profile?.business_id) return
    setLoadingSales(true)
    try {
      const sales = await fetchTurnSales()
      setTurnSales(sales)
      setIsCloseSessionOpen(true)
    } catch {
      toast.error('Error al calcular las ventas del turno')
    } finally {
      setLoadingSales(false)
    }
  }

  const handleCloseCaja = async () => {
    if (!activeSession) return
    setIsClosingCaja(true)
    try {
      const closingAmount = Number(activeSession.opening_amount) + turnSales
      const { error } = await supabase
        .from('cash_sessions')
        .update({
          closing_amount: closingAmount,
          status: 'closed',
          closed_at: new Date().toISOString()
        })
        .eq('id', activeSession.id)

      if (error) throw error
      toast.success('Caja cerrada con éxito. Redirigiendo...')
      setIsCloseSessionOpen(false)
      await signOut()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al cerrar la caja'
      toast.error(msg)
    } finally {
      setIsClosingCaja(false)
    }
  }

  // Self-elevation of superadmin role if currently set to 'waiter' in DB
  useEffect(() => {
    if (user?.email === 'superadmin@gastroledger.com' && profile && profile.role !== 'superadmin') {
      console.log('Detectada cuenta superadmin con rol incorrecto, iniciando auto-elevación...')
      supabase
        .from('profiles')
        .update({ role: 'superadmin' })
        .eq('id', user.id)
        .then(({ error }) => {
          if (!error) {
            console.log('Superadmin elevado exitosamente en DB.')
            window.location.href = '/superadmin/dashboard'
          } else {
            console.error('Error elevando superadmin:', error.message)
          }
        })
    }
  }, [user, profile, supabase])

  // Selection states
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [activeCategory, setActiveCategory] = useState<string>('todos')
  const [searchQuery, setSearchQuery] = useState('')

  // Modals state
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState(false)
  
  // Ref for QR code generation
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Realtime subscription setup
  useEffect(() => {
    const channel = supabase
      .channel('pos-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tables' }, () => {
        queryClient.invalidateQueries({ queryKey: ['pos-tables'] })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        queryClient.invalidateQueries({ queryKey: ['pos-orders'] })
        queryClient.invalidateQueries({ queryKey: ['pos-tables'] })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_details' }, () => {
        queryClient.invalidateQueries({ queryKey: ['pos-orders'] })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, queryClient])

  // Queries
  const { data: tables = [], isLoading: loadingTables } = useQuery<TableType[], Error>({
    queryKey: ['pos-tables'],
    queryFn: () => getTables() as Promise<TableType[]>,
  })

  const { data: menuItems = [], isLoading: loadingMenu } = useQuery<MenuItemType[], Error>({
    queryKey: ['pos-menu'],
    queryFn: () => getMenuItems() as Promise<MenuItemType[]>,
  })

  const { data: activeOrders = [] } = useQuery<OrderType[], Error>({
    queryKey: ['pos-orders'],
    queryFn: () => getOrders(['pending', 'preparing', 'ready']) as Promise<OrderType[]>,
  })

  // Mutations
  const createOrderMutation = useMutation({
    mutationFn: createOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos-orders'] })
      queryClient.invalidateQueries({ queryKey: ['pos-tables'] })
      setOrderSuccess(true)
      setCart([])
      toast.success('Pedido enviado a cocina exitosamente')
      setTimeout(() => setOrderSuccess(false), 2000)
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Error al enviar pedido')
    }
  })

  const handleCheckoutCleanup = () => {
    setIsCheckoutOpen(false)
    setSelectedTableId(null)
    setClientName('')
    setClientNit('')
    setCheckoutOrder(null)
    setCheckoutStep('payment')
  }

  const handleGenerateInvoice = () => {
    if (checkoutOrder) {
      generateInvoicePDF(checkoutOrder, clientName, clientNit)
    }
    setCheckoutStep('success')
    toast.success('Pago completado y factura generada con éxito.')
  }

  const handleSkipInvoice = () => {
    setCheckoutStep('success')
    toast.success('Pago completado. Se omitió la facturación.')
  }

  const handleCheckoutOpenChange = (open: boolean) => {
    if (!open) {
      handleCheckoutCleanup()
    } else {
      setIsCheckoutOpen(true)
    }
  }

  const payMutation = useMutation({
    mutationFn: ({ orderId, amount }: { orderId: string; amount: number }) => completePayment(orderId, amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos-orders'] })
      queryClient.invalidateQueries({ queryKey: ['pos-tables'] })
      if (hasAccess) {
        setCheckoutStep('billing')
      } else {
        setCheckoutStep('success')
        toast.success('Pago completado. Mesa liberada e insumos reducidos.')
      }
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Error al procesar el pago')
    }
  })

  const sendToKitchenMutation = useMutation({
    mutationFn: (orderId: string) => updateKitchenStatus(orderId, 'preparing'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos-orders'] })
      queryClient.invalidateQueries({ queryKey: ['pos-tables'] })
      handleCheckoutCleanup()
      toast.success('Pedido enviado a cocina exitosamente')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Error al enviar a cocina')
    }
  })

  const updateDetailQtyMutation = useMutation({
    mutationFn: ({ detailId, change }: { detailId: string; change: number }) => updateOrderDetailQuantity(detailId, change),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos-orders'] })
      queryClient.invalidateQueries({ queryKey: ['pos-tables'] })
      toast.success('Cantidad actualizada en la comanda')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Error al actualizar comanda')
    }
  })

  // Select first table on load if tables are loaded
  useEffect(() => {
    if (tables.length > 0 && !selectedTableId) {
      setSelectedTableId(tables[0].id)
    }
  }, [tables, selectedTableId])

  // Find active order for selected table (if occupied)
  const selectedTable = tables.find(t => t.id === selectedTableId)
  const activeOrderForTable = activeOrders.find(o => o.table_id === selectedTableId)

  // Generate QR code when checkout modal is opened
  useEffect(() => {
    if (isCheckoutOpen && checkoutStep === 'payment' && paymentMethod === 'qr' && canvasRef.current && checkoutOrder) {
      const qrPayload = {
        order_id: checkoutOrder.id,
        amount: Number(checkoutOrder.total),
        business_id: checkoutOrder.business_id,
        app: 'Gastroledger QR Payment',
        created_at: new Date().toISOString()
      }

      QRCode.toCanvas(
        canvasRef.current,
        JSON.stringify(qrPayload),
        {
          width: 180,
          margin: 1,
          color: {
            dark: '#0f172a', // dark slate
            light: '#ffffff'
          }
        },
        (error) => {
          if (error) console.error('Error generating QR Canvas:', error)
        }
      )
    }
  }, [isCheckoutOpen, checkoutStep, paymentMethod, checkoutOrder])

  // Cart operations
  const addToCart = (item: MenuItemType) => {
    if (activeOrderForTable) {
      toast.warning('Esta mesa ya tiene un pedido activo. Debes cobrar el actual para iniciar uno nuevo.')
      return
    }
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id)
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i)
      }
      return [...prev, { ...item, quantity: 1 }]
    })
  }

  const updateQuantity = (id: string, amount: number) => {
    setCart(prev =>
      prev.map(item => {
        if (item.id === id) {
          const newQty = item.quantity + amount
          return newQty > 0 ? { ...item, quantity: newQty } : item
        }
        return item
      }).filter(item => item.quantity > 0)
    )
  }

  const removeItem = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id))
  }

  const handleSendOrder = () => {
    if (!selectedTableId) {
      toast.error('Selecciona una mesa primero')
      return
    }
    if (cart.length === 0) return
    createOrderMutation.mutate({
      table_id: selectedTableId,
      items: cart.map(item => ({
        menu_item_id: item.id,
        quantity: item.quantity,
        price_at_time: item.price,
        notes: item.notes || null
      }))
    })
  }

  const handleCheckout = () => {
    if (!activeOrderForTable) return
    setCheckoutOrder(activeOrderForTable)
    setCheckoutStep('payment')
    setPaymentMethod('qr')
    setIsCheckoutOpen(true)
  }

  const simulateSuccessPayment = () => {
    if (!checkoutOrder) return
    payMutation.mutate({
      orderId: checkoutOrder.id,
      amount: Number(checkoutOrder.total)
    })
  }

  // Categories extraction
  const categoriesList = [
    { id: 'todos', name: 'Todos' },
    { id: 'plato-fondo', name: 'Segundos' },
    { id: 'entradas', name: 'Entradas' },
    { id: 'bebidas', name: 'Bebidas' },
    { id: 'postres', name: 'Postres' },
    { id: 'otros', name: 'Otros' }
  ]

  const categoryLabels: Record<string, string> = {
    'plato-fondo': 'Plato de Fondo',
    'entradas': 'Entrada',
    'bebidas': 'Bebida',
    'postres': 'Postre',
    'otros': 'Otro'
  }

  const filteredMenuItems = menuItems.filter(item => {
    const matchesCategory = activeCategory === 'todos' || item.category === activeCategory
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })
  // Calculations
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)

  if (loadingSession || loadingTables || loadingMenu) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F8F8F9]">
        <div className="text-center space-y-3">
          <Loader2 className="h-10 w-10 animate-spin text-amber-500 mx-auto" />
          <p className="text-sm text-zinc-500">Cargando terminal de ventas...</p>
        </div>
      </div>
    )
  }

  // Cashier check: block if no session opened
  if (profile?.role === 'cashier' && !activeSession) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#F8F8F9] px-4 font-[family-name:var(--font-inter)]">
        <Card className="w-full max-w-md bg-white border border-zinc-100 shadow-sm rounded-2xl overflow-hidden p-8 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-zinc-900 font-[family-name:var(--font-sora)]">Apertura de Caja</h2>
            <p className="text-sm text-zinc-500">
              Ingresa el monto inicial para abrir la caja del turno y comenzar a vender.
            </p>
          </div>
          <form onSubmit={handleOpenCaja} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="openingAmount" className="text-xs font-bold text-zinc-700">Monto Inicial (Bs.)</Label>
              <Input
                id="openingAmount"
                type="number"
                step="0.01"
                min="0"
                placeholder="Ej. 100.00"
                value={openingAmountInput}
                onChange={(e) => setOpeningAmountInput(e.target.value)}
                required
                className="border-zinc-200 focus-visible:ring-amber-500 focus-visible:border-amber-500 text-zinc-900 placeholder-zinc-400 bg-white"
              />
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <Button
                type="submit"
                disabled={isOpeningCaja}
                className="bg-amber-500 text-black hover:bg-amber-600 font-semibold w-full cursor-pointer"
              >
                {isOpeningCaja ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Abriendo caja...
                  </>
                ) : (
                  'Abrir Caja'
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => signOut()}
                className="text-zinc-500 hover:text-zinc-700 cursor-pointer"
              >
                Cerrar Sesión
              </Button>
            </div>
          </form>
        </Card>
      </div>
    )
  }

  const renderCartPanel = (isMobile = false) => {
    return (
      <div className="flex-1 flex flex-col overflow-hidden h-full">
        {isMobile && (
          <div className="p-4 border-b border-zinc-150 flex items-center justify-between bg-zinc-50 shrink-0">
            <div className="flex items-center space-x-2 text-zinc-800">
              <ShoppingCart className="h-5 w-5 text-amber-500" />
              <span className="font-bold text-sm font-[family-name:var(--font-sora)]">
                {activeOrderForTable ? `Comanda Mesa ${selectedTable?.table_number}` : 'Nuevo Pedido'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowCartMobile(false)}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-extrabold text-zinc-600 hover:bg-zinc-50 transition-all cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        )}
        {activeOrderForTable ? (
          // Panel for active occupied table
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-zinc-100 bg-blue-50/20 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Flame className="h-4.5 w-4.5 text-blue-600 animate-pulse" />
                <span className="font-bold text-sm text-blue-650 font-[family-name:var(--font-sora)]">Comanda - Mesa {selectedTable?.table_number}</span>
              </div>
              <span className={`inline-block rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase border ${
                activeOrderForTable.status === 'ready'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : activeOrderForTable.status === 'preparing'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-zinc-100 text-zinc-500 border-zinc-200'
              }`}>
                {activeOrderForTable.status === 'ready'
                  ? 'Listo'
                  : activeOrderForTable.status === 'preparing'
                  ? 'Preparando'
                  : 'Pendiente'}
              </span>
            </div>

            {/* Order details list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {activeOrderForTable.order_details.map((detail) => (
                <div key={detail.id} className="flex flex-col bg-zinc-50/30 border border-zinc-100 p-3 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 pr-2">
                      <h4 className="text-xs font-bold text-zinc-800 line-clamp-1">{detail.menu_items?.name}</h4>
                      <span className="text-[10px] text-zinc-500 font-bold">Bs. {Number(detail.price_at_time).toFixed(2)} c/u</span>
                    </div>
                    <div className="flex items-center space-x-2 shrink-0">
                      <div className="flex items-center border border-zinc-200 rounded-lg bg-white p-0.5">
                        <button
                          onClick={() => updateDetailQtyMutation.mutate({ detailId: detail.id, change: -1 })}
                          disabled={updateDetailQtyMutation.isPending}
                          className="p-1 hover:bg-zinc-100 rounded text-zinc-500 hover:text-zinc-900 cursor-pointer disabled:opacity-50"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="px-1.5 text-xs font-bold text-zinc-700">{detail.quantity}</span>
                        <button
                          onClick={() => updateDetailQtyMutation.mutate({ detailId: detail.id, change: 1 })}
                          disabled={updateDetailQtyMutation.isPending}
                          className="p-1 hover:bg-zinc-100 rounded text-zinc-500 hover:text-zinc-900 cursor-pointer disabled:opacity-50"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <span className={`h-2 w-2 rounded-full ${detail.status === 'ready' ? 'bg-emerald-400' : 'bg-zinc-300'}`} title={detail.status === 'ready' ? 'Listo' : 'Cocina'} />
                    </div>
                  </div>
                  {detail.notes && (
                    <div className="text-[10px] text-zinc-550 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200 w-fit">
                      <span>⚠ {detail.notes}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Pricing & Checkout */}
            <div className="p-4 border-t border-zinc-150 bg-zinc-50/30 space-y-4">
              <div className="space-y-1.5 text-xs text-zinc-555">
                <div className="flex justify-between text-sm font-bold text-zinc-755">
                  <span>Total a Pagar</span>
                  <span className="text-lg text-zinc-900 font-black">Bs. {Number(activeOrderForTable.total).toFixed(2)}</span>
                </div>
              </div>

              <Button
                className="w-full bg-blue-600 hover:bg-blue-750 text-white font-bold animate-pulse hover:animate-none cursor-pointer"
                onClick={() => {
                  handleCheckout()
                  if (isMobile) setShowCartMobile(false)
                }}
              >
                <QrCode className="h-4 w-4 mr-2" /> Cobrar Pedido
              </Button>
            </div>
          </div>
        ) : (
          // Panel for new cart
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-zinc-100 bg-zinc-50/50 flex items-center justify-between">
              <div className="flex items-center space-x-2 text-zinc-805">
                <ShoppingCart className="h-5 w-5 text-amber-500" />
                <span className="font-bold text-sm font-[family-name:var(--font-sora)]">Nuevo Pedido</span>
              </div>
              {selectedTable && (
                <span className="text-xs font-bold text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
                  Mesa {selectedTable.table_number}
                </span>
              )}
            </div>

            {/* Cart List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {orderSuccess ? (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-3 animate-in zoom-in duration-300">
                  <CheckCircle2 className="h-12 w-12 text-emerald-500 animate-bounce" />
                  <h3 className="font-bold text-zinc-900 text-sm">¡Comanda en Cocina!</h3>
                  <p className="text-xs text-zinc-500">Los cocineros ya recibieron la comanda en tiempo real.</p>
                </div>
              ) : cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-zinc-400 space-y-2">
                  <ShoppingCart className="h-8 w-8 text-zinc-300" />
                  <p className="text-xs font-bold">Carrito Vacío</p>
                  <p className="text-[10px] text-zinc-500 max-w-[200px]">Agrega productos del catálogo para esta mesa.</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.id} className="flex items-center justify-between bg-zinc-50/50 border border-zinc-100 p-3 rounded-xl">
                    <div className="flex-1 pr-2">
                      <h4 className="text-xs font-bold text-zinc-800 line-clamp-1">{item.name}</h4>
                      <span className="text-[10px] text-zinc-500 font-bold block">Bs. {item.price.toFixed(2)} c/u</span>
                      {item.notes ? (
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-amber-605 bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/10 w-fit">
                          <span className="line-clamp-1">⚠ {item.notes}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingNoteItemId(item.id)
                              setEditingNoteText(item.notes || '')
                            }}
                            className="text-zinc-400 hover:text-amber-600 font-bold ml-1 cursor-pointer"
                          >
                            Editar
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingNoteItemId(item.id)
                            setEditingNoteText('')
                          }}
                          className="text-[10px] text-zinc-450 hover:text-amber-600 flex items-center gap-1 mt-1 transition-all cursor-pointer"
                        >
                          <Pencil className="h-2.5 w-2.5" />
                          <span>Agregar nota...</span>
                        </button>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 shrink-0">
                      <div className="flex items-center border border-zinc-200 rounded-lg bg-white p-0.5">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, -1)}
                          className="p-1 hover:bg-zinc-100 rounded text-zinc-500 hover:text-zinc-900 cursor-pointer"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="px-2 text-xs font-bold text-zinc-700">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, 1)}
                          className="p-1 hover:bg-zinc-100 rounded text-zinc-500 hover:text-zinc-900 cursor-pointer"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="p-1.5 hover:bg-red-50 rounded-lg text-zinc-400 hover:text-red-655 transition-all cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pricing & Submit */}
            <div className="p-4 border-t border-zinc-150 bg-zinc-50/30 space-y-4">
              <div className="space-y-1.5 text-xs text-zinc-550">
                <div className="flex justify-between text-sm font-bold text-zinc-700">
                  <span>Total</span>
                  <span className="text-lg text-zinc-900 font-black">Bs. {cartTotal.toFixed(2)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="border-zinc-200 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer"
                  onClick={() => setCart([])}
                  disabled={cart.length === 0 || createOrderMutation.isPending}
                >
                  Limpiar
                </Button>
                <Button
                  className="bg-emerald-600 text-white font-bold hover:bg-emerald-700 cursor-pointer"
                  onClick={async () => {
                    await handleSendOrder()
                    if (isMobile) setShowCartMobile(false)
                  }}
                  disabled={cart.length === 0 || createOrderMutation.isPending || !selectedTableId}
                >
                  {createOrderMutation.isPending ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Enviar
                    </>
                  ) : (
                    'Enviar Cocina'
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-[#F8F8F9] text-zinc-900 font-[family-name:var(--font-inter)] select-none">
        {/* Left Sidebar */}
        <Sidebar className="border-r-0 bg-[#0F0F0F] text-zinc-400">
          <SidebarHeader className="border-b border-zinc-800 p-5">
            <div className="flex items-center space-x-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-black">
                <UtensilsCrossed className="h-5 w-5" />
              </div>
              <span className="font-bold tracking-tight text-base text-white font-[family-name:var(--font-sora)]">GastroLedger</span>
            </div>
          </SidebarHeader>

          <SidebarContent className="p-4 flex flex-col justify-between h-full">
            <div className="space-y-6">
              <div>
                <p className="px-3 text-[10px] font-semibold tracking-[0.15em] uppercase text-zinc-600 mb-2">
                  Navegación POS
                </p>
                <SidebarMenu className="space-y-1">
                  <SidebarMenuItem>
                    <SidebarMenuButton isActive={true} className="flex items-center space-x-3 h-9 px-3 rounded-md text-sm bg-amber-500/10 text-amber-400 font-medium border-l-2 border-amber-500 rounded-l-none cursor-pointer">
                      <UtensilsCrossed className="h-4 w-4 shrink-0 text-amber-400" />
                      <span>Pantalla POS</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  {profile?.role === 'admin' && (
                    <SidebarMenuItem>
                      <SidebarMenuButton 
                        onClick={() => router.push('/dashboard')}
                        className="flex items-center space-x-3 h-9 px-3 rounded-md text-sm bg-transparent text-zinc-500 hover:bg-white/5 hover:text-zinc-200 cursor-pointer"
                      >
                        <Building className="h-4 w-4 shrink-0 text-zinc-650" />
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
                  <div className="text-xs text-zinc-550 space-y-1 p-2.5 bg-zinc-950/40 rounded border border-zinc-850">
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
                    {profile?.role === 'cashier' ? 'Cajero' : 'Mesero'}
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
          {/* POS Header */}
          <header className="flex h-16 shrink-0 items-center justify-between border-b border-zinc-100 bg-white px-6">
            <div className="flex items-center space-x-3">
              <SidebarTrigger className="text-zinc-500 hover:text-zinc-900 cursor-pointer" />
              <div className="w-px h-4 bg-zinc-200"></div>
              <div className="flex items-center space-x-2 text-zinc-800">
                <Building className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-semibold text-zinc-800 font-[family-name:var(--font-inter)]">
                  La Parrilla del Sol (Terminal POS)
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {profile?.role === 'cashier' && activeSession && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenCloseSessionModal}
                  disabled={loadingSales}
                  className="text-xs font-bold border-red-200 text-red-650 hover:bg-red-50 hover:text-red-700 cursor-pointer flex items-center"
                >
                  {loadingSales && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                  Cerrar Caja
                </Button>
              )}
            </div>
          </header>

      {/* POS Main Content */}
      <div className="flex flex-1 w-full overflow-hidden">
        {/* Left Area: Tables & Menu Grid (2/3 width) */}
        <div className="flex-1 flex flex-col p-6 overflow-hidden space-y-6">
          {/* Tables Bar */}
          <div className="space-y-2 shrink-0">
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase tracking-wider text-zinc-500 font-bold">Distribución de Mesas</Label>
              <div className="flex items-center space-x-3 text-[10px] text-zinc-500 font-semibold">
                <span className="flex items-center"><span className="h-2 w-2 rounded-full bg-emerald-500 mr-1.5" /> Libre</span>
                <span className="flex items-center"><span className="h-2 w-2 rounded-full bg-blue-500 mr-1.5" /> Ocupada</span>
              </div>
            </div>
            {loadingTables ? (
              <div className="flex space-x-3 overflow-x-auto py-1">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-10 w-16 bg-zinc-200 animate-pulse rounded-xl border border-zinc-100" />
                ))}
              </div>
            ) : (
              <div className="flex space-x-3 overflow-x-auto py-1 scrollbar-none">
                {tables.map(table => {
                  const isOccupied = table.status === 'occupied'
                  const isSelected = selectedTableId === table.id
                  return (
                    <button
                      key={table.id}
                      onClick={() => {
                        setSelectedTableId(table.id)
                        if (!isOccupied) {
                          // Clean cart if moving to a free table
                          setCart([])
                        }
                      }}
                      className={`h-11 min-w-16 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                        isSelected
                          ? isOccupied 
                            ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm font-bold ring-2 ring-blue-500/25'
                            : 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm font-bold ring-2 ring-emerald-500/25'
                          : isOccupied
                            ? 'bg-blue-50/20 border-blue-200 text-blue-600 hover:bg-blue-50/50'
                            : 'bg-emerald-50/20 border-emerald-200 text-emerald-600 hover:bg-emerald-50/50'
                      }`}
                    >
                      <span className="text-sm font-black">{table.table_number}</span>
                      <span className="text-[8px] font-bold uppercase tracking-wider">
                        {isOccupied ? 'Ocupada' : 'Libre'}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Catalog Selection */}
          <div className="flex-1 flex flex-col overflow-hidden space-y-4">
            {/* Filter and Search */}
            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-none flex-1">
                {categoriesList.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`rounded-xl px-4 py-2 text-xs font-bold whitespace-nowrap transition-all border ${
                      activeCategory === cat.id
                        ? 'bg-amber-500 text-black border-amber-500 shadow-sm'
                        : 'bg-white text-zinc-500 border-zinc-200 hover:bg-zinc-50'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar platos/bebidas..."
                  className="pl-9 border-zinc-200 bg-white text-zinc-900 placeholder-zinc-400 focus-visible:ring-amber-500 focus-visible:border-amber-500"
                />
              </div>
            </div>

            {/* Menu Items Grid */}
            <div className="flex-1 overflow-y-auto pr-1">
              {loadingMenu ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="h-28 bg-zinc-100 animate-pulse rounded-2xl border border-zinc-200" />
                  ))}
                </div>
              ) : filteredMenuItems.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-zinc-450 py-16 border border-zinc-200 bg-zinc-50/20 rounded-2xl border-dashed">
                  <Coffee className="h-8 w-8 text-zinc-300 mb-2" />
                  <p className="text-xs">No se encontraron platos en esta categoría.</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredMenuItems.map((item) => (
                    <Card
                      key={item.id}
                      onClick={() => addToCart(item)}
                      className="border-zinc-100 bg-white hover:border-amber-500/30 cursor-pointer transition-all shadow-sm hover:shadow-md hover:scale-[1.01] flex flex-col justify-between overflow-hidden group"
                    >
                      <div>
                        {item.image_url ? (
                          <div className="relative w-full aspect-[4/3] overflow-hidden border-b border-zinc-100 bg-zinc-100">
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          </div>
                        ) : (
                          <div className="w-full aspect-[4/3] bg-zinc-50/50 flex items-center justify-center border-b border-zinc-100 text-zinc-300">
                            <UtensilsCrossed className="h-8 w-8 text-zinc-300/80 stroke-[1.5]" />
                          </div>
                        )}
                        <CardHeader className="p-4 pb-2">
                          <span className="text-[10px] uppercase tracking-wider text-amber-600 font-bold">
                            {categoryLabels[item.category] || item.category}
                          </span>
                          <CardTitle className="text-sm text-zinc-800 mt-1 font-bold font-[family-name:var(--font-sora)] group-hover:text-zinc-950 line-clamp-1">{item.name}</CardTitle>
                        </CardHeader>
                      </div>
                      <CardFooter className="p-4 pt-2 flex items-center justify-between border-t border-zinc-50 bg-zinc-50/20">
                        <span className="text-base font-black text-zinc-900">Bs. {item.price.toFixed(2)}</span>
                        <div className="rounded-lg bg-amber-500/10 p-1.5 text-amber-700 border border-amber-500/20 group-hover:bg-amber-500 group-hover:text-black transition-colors">
                          <Plus className="h-3.5 w-3.5" />
                        </div>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Area: Active Order/Cart Panel (1/3 width, hidden on mobile/tablet) */}
        <div className="hidden lg:flex w-96 border-l border-zinc-250 bg-white flex-col h-full shrink-0">
          {renderCartPanel(false)}
        </div>
      </div>
      {/* Mobile Floating Action Button (FAB) */}
      {!activeOrderForTable && cart.length > 0 && (
        <Button
          onClick={() => setShowCartMobile(true)}
          className="lg:hidden fixed bottom-6 right-6 z-40 rounded-full shadow-lg bg-amber-500 hover:bg-amber-600 text-black font-extrabold px-5 py-6 flex items-center gap-2 cursor-pointer transition-transform active:scale-95"
        >
          <ShoppingCart className="h-5 w-5" />
          <span>Ver Pedido ({cart.reduce((sum, item) => sum + item.quantity, 0)}) • Bs. {cartTotal.toFixed(2)}</span>
        </Button>
      )}

      {activeOrderForTable && (
        <Button
          onClick={() => setShowCartMobile(true)}
          className="lg:hidden fixed bottom-6 right-6 z-40 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-5 py-6 flex items-center gap-2 cursor-pointer transition-transform active:scale-95 animate-pulse hover:animate-none"
        >
          <Flame className="h-5 w-5" />
          <span>Ver Comanda • Bs. {Number(activeOrderForTable.total).toFixed(2)}</span>
        </Button>
      )}

      {/* Mobile Cart Sheet Drawer */}
      <div 
        className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-xs lg:hidden transition-opacity duration-300 ${
          showCartMobile ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`} 
        onClick={() => setShowCartMobile(false)}
      >
        <div 
          className={`absolute right-0 top-0 bottom-0 w-[85vw] max-w-md bg-white shadow-xl flex flex-col transition-transform duration-300 ${
            showCartMobile ? 'translate-x-0' : 'translate-x-full'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {renderCartPanel(true)}
        </div>
      </div>

      {/* CHECKOUT MODAL DIALOG */}
      <Dialog open={isCheckoutOpen} onOpenChange={handleCheckoutOpenChange}>
        <DialogContent className="border-zinc-200 bg-white text-zinc-900 max-w-sm">
          {checkoutOrder && (
            <>
              {checkoutStep === 'payment' ? (
                <>
                  <DialogHeader>
                    <DialogTitle className="text-center text-lg font-[family-name:var(--font-sora)] font-bold text-zinc-900">
                      Cobro de Pedido - Mesa {checkoutOrder.tables?.table_number || selectedTable?.table_number}
                    </DialogTitle>
                    <DialogDescription className="text-zinc-500 text-center text-xs font-[family-name:var(--font-inter)]">
                      Selecciona el método de pago para completar la transacción.
                    </DialogDescription>
                  </DialogHeader>

                  {/* Payment Method Selector Tabs */}
                  <div className="flex border border-zinc-200 rounded-xl p-1 bg-zinc-50/50 mt-4">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('qr')}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        paymentMethod === 'qr'
                          ? 'bg-white text-zinc-900 border border-zinc-200 shadow-sm'
                          : 'text-zinc-500 hover:text-zinc-800'
                      }`}
                    >
                      <QrCode className="h-3.5 w-3.5" />
                      Código QR
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('cash')}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        paymentMethod === 'cash'
                          ? 'bg-white text-zinc-900 border border-zinc-200 shadow-sm'
                          : 'text-zinc-500 hover:text-zinc-800'
                      }`}
                    >
                      <UtensilsCrossed className="h-3.5 w-3.5" />
                      Efectivo
                    </button>
                  </div>

                  <div className="flex flex-col items-center py-4 space-y-4">
                    {paymentMethod === 'qr' ? (
                      <>
                        <div className="bg-white p-3 rounded-2xl shadow-md border border-zinc-100">
                          <canvas ref={canvasRef} />
                        </div>
                        <p className="text-[10px] text-zinc-500 text-center max-w-[240px]">
                          Escanea el código QR simulado para registrar el cobro digital.
                        </p>
                      </>
                    ) : (
                      <div className="w-full bg-zinc-50/50 border border-zinc-155 p-4 rounded-2xl text-center space-y-2">
                        <div className="h-12 w-12 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
                          <CheckCircle2 className="h-6 w-6" />
                        </div>
                        <h4 className="text-xs font-bold text-zinc-850">Pago Directo en Efectivo</h4>
                        <p className="text-[10px] text-zinc-500 max-w-[200px] mx-auto">
                          Confirma la transacción directamente en caja sin necesidad de escanear QR.
                        </p>
                      </div>
                    )}

                    <div className="text-center space-y-1">
                      <span className="text-xs text-zinc-455 font-bold uppercase tracking-wider">Total a Cobrar</span>
                      <h3 className="text-2xl font-black text-zinc-900 font-[family-name:var(--font-sora)]">Bs. {Number(checkoutOrder.total).toFixed(2)}</h3>
                      <p className="text-[10px] text-zinc-500">Mesa: {checkoutOrder.tables?.table_number || selectedTable?.table_number} • Pedido: {checkoutOrder.id.substring(0, 8).toUpperCase()}</p>
                    </div>
                  </div>

                  <DialogFooter className="sm:justify-center border-t border-zinc-100 pt-4 flex flex-col gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCheckoutCleanup}
                      className="border-zinc-200 text-zinc-500 hover:bg-zinc-50 w-full cursor-pointer"
                      disabled={payMutation.isPending}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      onClick={simulateSuccessPayment}
                      className="bg-emerald-600 text-white font-bold hover:bg-emerald-700 w-full cursor-pointer"
                      disabled={payMutation.isPending}
                    >
                      {payMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Procesando...
                        </>
                      ) : paymentMethod === 'qr' ? (
                        'Simular Pago QR'
                      ) : (
                        'Confirmar Pago Efectivo'
                      )}
                    </Button>
                  </DialogFooter>
                </>
              ) : checkoutStep === 'billing' ? (
                <>
                  <DialogHeader>
                    <DialogTitle className="text-center text-lg font-[family-name:var(--font-sora)] font-bold text-zinc-900">
                      Datos de Facturación
                    </DialogTitle>
                    <DialogDescription className="text-zinc-500 text-center text-xs font-[family-name:var(--font-inter)]">
                      Completa el NIT/CI y Razón Social del cliente para generar la factura.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="flex flex-col py-4 space-y-4">
                    <div className="space-y-3 px-1">
                      <div className="space-y-1">
                        <Label htmlFor="clientName" className="text-xs font-bold text-zinc-700">Nombre de Cliente / Razón Social</Label>
                        <Input
                          id="clientName"
                          placeholder="Ej. Juan Pérez"
                          value={clientName}
                          onChange={(e) => setClientName(e.target.value)}
                          className="text-xs border-zinc-200 focus-visible:ring-amber-500 focus-visible:border-amber-500 text-zinc-900 bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="clientNit" className="text-xs font-bold text-zinc-700">NIT / CI</Label>
                        <Input
                          id="clientNit"
                          placeholder="Ej. 12345678"
                          value={clientNit}
                          onChange={(e) => setClientNit(e.target.value)}
                          className="text-xs border-zinc-200 focus-visible:ring-amber-500 focus-visible:border-amber-500 text-zinc-900 bg-white"
                        />
                      </div>
                    </div>

                    <div className="text-center bg-zinc-50/50 p-3 rounded-xl border border-zinc-150 space-y-1">
                      <span className="text-[10px] text-zinc-450 font-bold uppercase tracking-wider">Monto Cobrado</span>
                      <h4 className="text-base font-black text-zinc-900">Bs. {Number(checkoutOrder.total).toFixed(2)}</h4>
                    </div>
                  </div>

                  <DialogFooter className="sm:justify-center border-t border-zinc-100 pt-4 flex flex-col gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSkipInvoice}
                      className="border-zinc-200 text-zinc-500 hover:bg-zinc-50 w-full cursor-pointer"
                    >
                      Omitir Factura
                    </Button>
                    <Button
                      type="button"
                      onClick={handleGenerateInvoice}
                      className="bg-amber-500 text-black font-bold hover:bg-amber-600 w-full cursor-pointer"
                    >
                      Generar Factura (PDF)
                    </Button>
                  </DialogFooter>
                </>
              ) : (
                <>
                  <DialogHeader>
                    <DialogTitle className="text-center text-lg font-[family-name:var(--font-sora)] font-bold text-zinc-900">
                      ¡Pago Exitoso!
                    </DialogTitle>
                    <DialogDescription className="text-zinc-500 text-center text-xs font-[family-name:var(--font-inter)]">
                      El pago se ha registrado y la mesa ha sido liberada.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="flex flex-col items-center py-6 space-y-4">
                    <div className="h-16 w-16 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                      <CheckCircle2 className="h-10 w-10 animate-bounce" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-zinc-700">Monto: Bs. {Number(checkoutOrder.total).toFixed(2)}</p>
                      <p className="text-[10px] text-zinc-400 mt-2 font-medium">¿Deseas enviar este pedido a la pantalla de cocina ahora?</p>
                    </div>
                  </div>

                  <DialogFooter className="sm:justify-center border-t border-zinc-100 pt-4 flex flex-col gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCheckoutCleanup}
                      className="border-zinc-200 text-zinc-500 hover:bg-zinc-50 w-full cursor-pointer"
                      disabled={sendToKitchenMutation.isPending}
                    >
                      Finalizar sin enviar
                    </Button>
                    <Button
                      type="button"
                      onClick={() => sendToKitchenMutation.mutate(checkoutOrder.id)}
                      className="bg-amber-500 text-black font-bold hover:bg-amber-600 w-full cursor-pointer flex items-center justify-center gap-1.5"
                      disabled={sendToKitchenMutation.isPending}
                    >
                      {sendToKitchenMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <ChefHat className="h-4 w-4" />
                          Enviar a cocina
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* EDIT NOTE DIALOG */}
      <Dialog open={editingNoteItemId !== null} onOpenChange={(open) => { if (!open) setEditingNoteItemId(null) }}>
        <DialogContent className="border-zinc-200 bg-white text-zinc-900 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-[family-name:var(--font-sora)] font-bold text-zinc-900">
              Observaciones del Producto
            </DialogTitle>
            <DialogDescription className="text-zinc-500 text-xs">
              Agrega instrucciones especiales para la preparación (ej. sin papas, sin salsa).
            </DialogDescription>
          </DialogHeader>
          <div className="py-3">
            <Input
              value={editingNoteText}
              onChange={(e) => setEditingNoteText(e.target.value)}
              placeholder="Ej. sin papas, sin salsa"
              className="text-xs border-zinc-200 focus-visible:ring-amber-500 focus-visible:border-amber-500 text-zinc-900 bg-white"
              autoFocus
            />
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingNoteItemId(null)}
              className="border-zinc-200 text-zinc-500 hover:bg-zinc-50 flex-1 cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (editingNoteItemId) {
                  setCart(prev => prev.map(item =>
                    item.id === editingNoteItemId ? { ...item, notes: editingNoteText || null } : item
                  ))
                  setEditingNoteItemId(null)
                  setEditingNoteText('')
                }
              }}
              className="bg-amber-500 text-black font-bold hover:bg-amber-600 flex-1 cursor-pointer"
            >
              Guardar Nota
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CLOSE CASHIER SESSION DIALOG */}
      <Dialog open={isCloseSessionOpen} onOpenChange={setIsCloseSessionOpen}>
        <DialogContent className="border-zinc-200 bg-white text-zinc-900 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center text-lg font-[family-name:var(--font-sora)] font-bold text-zinc-900">Cierre de Caja</DialogTitle>
            <DialogDescription className="text-zinc-500 text-center text-xs font-[family-name:var(--font-inter)]">
              Confirmación del cierre de caja del turno actual.
            </DialogDescription>
          </DialogHeader>

          {activeSession && (
            <div className="space-y-4 py-4 border-y border-zinc-100 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500">Monto Inicial:</span>
                <span className="font-bold text-zinc-800">Bs. {Number(activeSession.opening_amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Ventas del Turno:</span>
                <span className="font-bold text-zinc-850">Bs. {turnSales.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-zinc-100 pt-3">
                <span className="font-bold text-zinc-900">Total en Caja Estimado:</span>
                <span className="font-black text-emerald-650">Bs. {(Number(activeSession.opening_amount) + turnSales).toFixed(2)}</span>
              </div>
            </div>
          )}

          <DialogFooter className="sm:justify-center pt-2 flex flex-col gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCloseSessionOpen(false)}
              className="border-zinc-200 text-zinc-500 hover:bg-zinc-50 w-full cursor-pointer"
              disabled={isClosingCaja}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleCloseCaja}
              className="bg-red-650 hover:bg-red-700 text-white font-bold w-full cursor-pointer"
              disabled={isClosingCaja}
            >
              {isClosingCaja ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cerrando...
                </>
              ) : (
                'Confirmar Cierre y Salir'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </div>
      </div>
    </SidebarProvider>
  )
}
