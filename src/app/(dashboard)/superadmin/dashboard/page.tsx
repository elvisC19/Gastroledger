'use client'

import { useState } from 'react'
import * as z from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getBusinesses,
  createBusinessWithAdmin,
  updateBusiness,
  deleteBusiness,
  getPlans,
  updatePlanPrice
} from '@/app/actions/businesses'
import { getGlobalUsers, createGlobalUser } from '@/app/actions/staff'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Store,
  CreditCard,
  ShieldAlert,
  Plus,
  TrendingUp,
  Loader2,
  Trash2,
  Edit2,
  Users
} from 'lucide-react'
import { toast } from 'sonner'
import { type Business } from '@/types'

interface PlanType {
  id: string
  name: string
  price: number
  features: string[]
  created_at: string
}

interface GlobalUserWithBusiness {
  id: string
  business_id: string | null
  role: 'superadmin' | 'admin' | 'cashier' | 'waiter' | 'cook'
  full_name: string
  email: string
  avatar_url: string | null
  created_at: string
  updated_at: string
  businesses: {
    name: string
  } | null
}

export default function SuperAdminDashboard() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'businesses' | 'plans' | 'users'>('businesses')

  // Businesses CRUD Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null)

  // Plan Price CRUD Modal
  const [isEditPlanOpen, setIsEditPlanOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<PlanType | null>(null)
  const [editPlanPrice, setEditPlanPrice] = useState('')

  // Form states for creation
  const [name, setName] = useState('')
  const [type, setType] = useState<'cafeteria' | 'restaurante' | 'polleria'>('restaurante')
  const [plan, setPlan] = useState<'essential' | 'pro' | 'premium'>('pro')
  const [address, setAddress] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPass, setAdminPass] = useState('')
  const [adminName, setAdminName] = useState('')

  // Form states for editing
  const [editName, setEditName] = useState('')
  const [editType, setEditType] = useState<'cafeteria' | 'restaurante' | 'polleria'>('restaurante')
  const [editPlan, setEditPlan] = useState<'essential' | 'pro' | 'premium'>('pro')
  const [editAddress, setEditAddress] = useState('')
  const [editStatus, setEditStatus] = useState<'active' | 'inactive' | 'suspended'>('active')

  // Form states for Global User creation
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false)
  const [uFullName, setUFullName] = useState('')
  const [uEmail, setUEmail] = useState('')
  const [uPass, setUPass] = useState('')
  const [uConfirmPass, setUConfirmPass] = useState('')
  const [uRole, setURole] = useState<'superadmin' | 'admin' | 'cashier' | 'waiter' | 'cook'>('admin')
  const [uBusinessId, setUBusinessId] = useState<string>('')

  // Queries
  const { data: businesses = [], isLoading: loadingBiz, isError: bizError, error: bizErr } = useQuery<Business[], Error>({
    queryKey: ['businesses'],
    queryFn: () => getBusinesses() as Promise<Business[]>,
  })

  const { data: plans = [], isLoading: loadingPlans } = useQuery<PlanType[], Error>({
    queryKey: ['plans'],
    queryFn: () => getPlans() as Promise<PlanType[]>,
  })

  const { data: globalUsers = [], isLoading: loadingUsers } = useQuery<GlobalUserWithBusiness[], Error>({
    queryKey: ['global-users'],
    queryFn: () => getGlobalUsers() as Promise<GlobalUserWithBusiness[]>,
    enabled: activeTab === 'users'
  })

  const createUserMutation = useMutation({
    mutationFn: createGlobalUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global-users'] })
      toast.success('Usuario global creado con éxito')
      setIsCreateUserOpen(false)
      setUFullName('')
      setUEmail('')
      setUPass('')
      setUConfirmPass('')
      setURole('admin')
      setUBusinessId('')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Error al crear usuario')
    }
  })

  const handleCreateUserSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const userSchema = z.object({
      uFullName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
      uEmail: z.string().email('Por favor ingresa un correo electrónico válido'),
      uPass: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
      uConfirmPass: z.string(),
      uRole: z.enum(['superadmin', 'admin', 'cashier', 'waiter', 'cook']),
      uBusinessId: z.string().nullable()
    }).refine((data) => data.uPass === data.uConfirmPass, {
      message: "Las contraseñas no coinciden",
      path: ["uConfirmPass"],
    })

    const parsed = userSchema.safeParse({
      uFullName,
      uEmail,
      uPass,
      uConfirmPass,
      uRole,
      uBusinessId: uRole === 'superadmin' ? null : uBusinessId || null
    })

    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message)
      return
    }

    if (uRole !== 'superadmin' && !uBusinessId) {
      toast.error('Por favor selecciona un negocio para este usuario')
      return
    }

    createUserMutation.mutate({
      fullName: uFullName,
      email: uEmail,
      pass: uPass,
      role: uRole,
      businessId: uRole === 'superadmin' ? null : uBusinessId
    })
  }

  // Mutations
  const createMutation = useMutation({
    mutationFn: createBusinessWithAdmin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['businesses'] })
      toast.success('¡Negocio y Administrador creados con éxito!')
      setIsCreateOpen(false)
      setName('')
      setAddress('')
      setAdminEmail('')
      setAdminPass('')
      setAdminName('')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Error al crear el negocio')
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Omit<Business, 'id' | 'created_at'>> }) => updateBusiness(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['businesses'] })
      toast.success('Negocio actualizado correctamente')
      setIsEditOpen(false)
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Error al actualizar el negocio')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: deleteBusiness,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['businesses'] })
      toast.success('Negocio eliminado correctamente')
      setIsDeleteOpen(false)
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Error al eliminar el negocio')
    }
  })

  const updatePlanMutation = useMutation({
    mutationFn: ({ id, price }: { id: string; price: number }) => updatePlanPrice(id, price),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] })
      queryClient.invalidateQueries({ queryKey: ['businesses'] })
      toast.success('Precio del plan actualizado exitosamente')
      setIsEditPlanOpen(false)
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Error al actualizar el precio')
    }
  })

  // Handlers
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const businessSchema = z.object({
      name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
      type: z.enum(['cafeteria', 'restaurante', 'polleria']),
      subscription_plan: z.enum(['essential', 'pro', 'premium']),
      address: z.string().min(5, 'La dirección debe tener al menos 5 caracteres')
    })

    const adminUserSchema = z.object({
      adminName: z.string().min(2, 'El nombre del administrador debe tener al menos 2 caracteres'),
      adminEmail: z.string().email('Por favor ingresa un correo electrónico válido'),
      adminPass: z.string().min(6, 'La contraseña del administrador debe tener al menos 6 caracteres')
    })

    const bizParsed = businessSchema.safeParse({ name, type, subscription_plan: plan, address })
    const adminParsed = adminUserSchema.safeParse({ adminName, adminEmail, adminPass })

    if (!bizParsed.success) {
      toast.error(bizParsed.error.issues[0].message)
      return
    }
    if (!adminParsed.success) {
      toast.error(adminParsed.error.issues[0].message)
      return
    }

    createMutation.mutate({
      name,
      type,
      subscription_plan: plan,
      address,
      adminEmail,
      adminPass,
      adminName
    })
  }

  const handleEditClick = (biz: Business) => {
    setSelectedBusiness(biz)
    setEditName(biz.name)
    setEditType(biz.type)
    setEditPlan(biz.subscription_plan)
    setEditAddress(biz.address || '')
    setEditStatus(biz.status)
    setIsEditOpen(true)
  }

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBusiness) return

    const editSchema = z.object({
      name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
      type: z.enum(['cafeteria', 'restaurante', 'polleria']),
      subscription_plan: z.enum(['essential', 'pro', 'premium']),
      address: z.string().min(5, 'La dirección debe tener al menos 5 caracteres'),
      status: z.enum(['active', 'inactive', 'suspended'])
    })

    const parsed = editSchema.safeParse({
      name: editName,
      type: editType,
      subscription_plan: editPlan,
      address: editAddress,
      status: editStatus
    })

    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message)
      return
    }

    updateMutation.mutate({
      id: selectedBusiness.id,
      updates: {
        name: editName,
        type: editType,
        subscription_plan: editPlan,
        address: editAddress,
        status: editStatus
      }
    })
  }

  const handleDeleteClick = (biz: Business) => {
    setSelectedBusiness(biz)
    setIsDeleteOpen(true)
  }

  const handleEditPlanClick = (pln: PlanType) => {
    setSelectedPlan(pln)
    setEditPlanPrice(pln.price.toString())
    setIsEditPlanOpen(true)
  }

  const handleEditPlanSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPlan || !editPlanPrice) return
    const numericPrice = parseFloat(editPlanPrice)
    if (isNaN(numericPrice) || numericPrice < 0) {
      toast.error('Por favor ingresa un precio numérico válido')
      return
    }
    updatePlanMutation.mutate({
      id: selectedPlan.id,
      price: numericPrice
    })
  }

  // Calculate SaaS MRR dynamically linked to plans prices
  const calculateMRR = () => {
    if (businesses.length === 0 || plans.length === 0) return 0
    return businesses.reduce((sum: number, b: Business) => {
      if (b.status !== 'active') return sum
      const currentPlan = plans.find(p => p.id === b.subscription_plan)
      const price = currentPlan ? Number(currentPlan.price) : 0
      return sum + price
    }, 0)
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12 font-[family-name:var(--font-inter)]">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 font-[family-name:var(--font-sora)]">Panel de Control Global</h1>
          <p className="text-sm text-zinc-500 mt-1">Superadministrador de la plataforma SaaS Gastroledger</p>
        </div>
        <Button
          onClick={() => setIsCreateOpen(true)}
          className="bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg text-sm h-9 px-4 self-start"
        >
          <Plus className="mr-2 h-4 w-4" /> Registrar Negocio
        </Button>
      </div>

      {/* SaaS Aggregate Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Metric 1 */}
        <Card className="bg-white border border-zinc-100 shadow-sm rounded-xl p-6">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-0">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Negocios Registrados
            </span>
            <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
              <Store className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="p-0 mt-4">
            <div className="text-3xl font-bold text-zinc-900 font-[family-name:var(--font-sora)]">
              {loadingBiz ? <Loader2 className="h-5 w-5 animate-spin text-zinc-400" /> : businesses.length}
            </div>
            <p className="text-xs text-zinc-400 mt-1">Totales en base de datos</p>
          </CardContent>
        </Card>

        {/* Metric 2 */}
        <Card className="bg-white border border-zinc-100 shadow-sm rounded-xl p-6">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-0">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              MRR SaaS Estimado
            </span>
            <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-650">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="p-0 mt-4">
            <div className="text-3xl font-bold text-zinc-900 font-[family-name:var(--font-sora)]">
              {loadingBiz || loadingPlans ? (
                <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
              ) : (
                `$${calculateMRR().toFixed(2)}`
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-1">Suma de precios de planes activos</p>
          </CardContent>
        </Card>

        {/* Metric 3 */}
        <Card className="bg-white border border-zinc-100 shadow-sm rounded-xl p-6">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-0">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Suscripciones Activas
            </span>
            <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
              <CreditCard className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="p-0 mt-4">
            <div className="text-3xl font-bold text-zinc-900 font-[family-name:var(--font-sora)]">
              {loadingBiz ? (
                <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
              ) : (
                `${businesses.filter((b) => b.status === 'active').length} / ${businesses.length}`
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-1">Locales activos operando</p>
          </CardContent>
        </Card>

        {/* Metric 4 */}
        <Card className="bg-white border border-zinc-100 shadow-sm rounded-xl p-6">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-0">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Estado Servidores
            </span>
            <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-zinc-100 text-zinc-500">
              <ShieldAlert className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="p-0 mt-4">
            <div className="text-3xl font-bold text-emerald-600 font-[family-name:var(--font-sora)]">Online</div>
            <p className="text-xs text-zinc-400 mt-1">Supabase Realtime + Vercel OK</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Layout: businesses vs plans vs users */}
      <div className="flex space-x-2 bg-white border-b border-zinc-100 pb-1">
        <button
          onClick={() => setActiveTab('businesses')}
          className={`pb-3 text-sm px-4 border-b-2 transition-all ${
            activeTab === 'businesses'
              ? 'border-amber-500 text-zinc-900 font-semibold'
              : 'border-transparent text-zinc-400 hover:text-zinc-600'
          }`}
        >
          Negocios Gastronómicos
        </button>
        <button
          onClick={() => setActiveTab('plans')}
          className={`pb-3 text-sm px-4 border-b-2 transition-all ${
            activeTab === 'plans'
              ? 'border-amber-500 text-zinc-900 font-semibold'
              : 'border-transparent text-zinc-400 hover:text-zinc-600'
          }`}
        >
          Planes y Suscripciones
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 text-sm px-4 border-b-2 transition-all ${
            activeTab === 'users'
              ? 'border-amber-500 text-zinc-900 font-semibold'
              : 'border-transparent text-zinc-400 hover:text-zinc-600'
          }`}
        >
          Usuarios Globales
        </button>
      </div>

      {/* RENDER ACTIVE TAB */}
      {activeTab === 'businesses' && (
        <Card className="bg-white border border-zinc-100 shadow-sm rounded-xl">
          <CardHeader>
            <CardTitle className="text-base text-zinc-900 font-[family-name:var(--font-sora)]">Listado de Establecimientos</CardTitle>
            <CardDescription className="text-xs text-zinc-500">Administra los locales vinculados al SaaS.</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingBiz ? (
              <div className="flex h-32 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
              </div>
            ) : bizError ? (
              <div className="rounded-lg bg-red-50 p-4 text-center text-sm text-red-650 border border-red-200">
                Error al cargar negocios: {bizErr.message}
              </div>
            ) : businesses.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-zinc-500 text-sm space-y-2 border border-dashed border-zinc-200 rounded-xl bg-zinc-50">
                <Store className="h-8 w-8 text-zinc-400" />
                <p className="font-semibold text-zinc-700">No hay negocios registrados</p>
                <p className="text-xs text-zinc-500">Haz clic en &quot;Registrar Negocio&quot; para empezar.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="border-b border-zinc-100">
                    <TableRow className="hover:bg-transparent border-zinc-100">
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Establecimiento</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Tipo</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Plan</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Dirección</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Fecha Creación</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Estado</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-400 text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-zinc-100">
                    {businesses.map((b) => (
                      <TableRow key={b.id} className="hover:bg-zinc-50/50 border-b border-zinc-50">
                        <TableCell className="font-medium text-zinc-900">{b.name}</TableCell>
                        <TableCell className="text-sm text-zinc-700 capitalize">{b.type}</TableCell>
                        <TableCell>
                          <span className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                            b.subscription_plan === 'premium'
                              ? 'bg-violet-50 text-violet-700 border border-violet-200'
                              : b.subscription_plan === 'pro'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-zinc-100 text-zinc-650'
                          }`}>
                            {b.subscription_plan}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate text-sm text-zinc-700">{b.address}</TableCell>
                        <TableCell className="text-zinc-500 text-xs">
                          {new Date(b.created_at).toLocaleDateString('es-PE')}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${
                            b.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : b.status === 'suspended'
                              ? 'bg-red-50 text-red-600 border-red-200'
                              : 'bg-zinc-100 text-zinc-500 border-zinc-200'
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full mr-1.5 ${
                              b.status === 'active'
                                ? 'bg-emerald-500 animate-pulse'
                                : b.status === 'suspended'
                                ? 'bg-red-500'
                                : 'bg-zinc-400'
                            }`}></span>
                            <span className="capitalize">{b.status === 'active' ? 'activo' : b.status === 'suspended' ? 'suspendido' : 'inactivo'}</span>
                          </span>
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditClick(b)}
                            className="h-8 w-8 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(b)}
                            className="h-8 w-8 text-zinc-400 hover:text-red-650 hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'plans' && (
        <Card className="bg-white border border-zinc-100 shadow-sm rounded-xl">
          <CardHeader>
            <CardTitle className="text-base text-zinc-900 font-[family-name:var(--font-sora)]">Planes Comerciales Disponibles</CardTitle>
            <CardDescription className="text-xs text-zinc-500">Define las tarifas mensuales y características activas por plan del SaaS.</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingPlans ? (
              <div className="flex h-32 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="border-b border-zinc-100">
                    <TableRow className="hover:bg-transparent border-zinc-100">
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Plan</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Costo Mensual</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Características Clave</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-400 text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-zinc-100">
                    {plans.map((pln) => (
                      <TableRow key={pln.id} className="hover:bg-zinc-50/50 border-b border-zinc-50">
                        <TableCell className="font-bold text-zinc-900 text-sm">{pln.name}</TableCell>
                        <TableCell className="text-emerald-700 font-bold text-sm">${Number(pln.price).toFixed(2)} / mes</TableCell>
                        <TableCell className="max-w-md">
                          <div className="flex flex-wrap gap-1">
                            {pln.features.map((f, i) => (
                              <span key={i} className="inline-block bg-zinc-50 text-[10px] text-zinc-500 px-2 py-0.5 rounded border border-zinc-100">
                                {f}
                              </span>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditPlanClick(pln)}
                            className="h-8 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 rounded-lg text-xs font-semibold"
                          >
                            <Edit2 className="h-3.5 w-3.5 mr-1" /> Editar Tarifa
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'users' && (
        <Card className="bg-white border border-zinc-100 shadow-sm rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base text-zinc-900 font-[family-name:var(--font-sora)]">Listado de Usuarios</CardTitle>
              <CardDescription className="text-xs text-zinc-500">Administra todos los usuarios globales del sistema.</CardDescription>
            </div>
            <Button
              onClick={() => setIsCreateUserOpen(true)}
              className="bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg text-sm h-9 px-4"
            >
              <Plus className="mr-2 h-4 w-4" /> Crear Usuario
            </Button>
          </CardHeader>
          <CardContent>
            {loadingUsers ? (
              <div className="flex h-32 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
              </div>
            ) : globalUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-zinc-500 text-sm space-y-2 border border-dashed border-zinc-200 rounded-xl bg-zinc-50">
                <Users className="h-8 w-8 text-zinc-400" />
                <p className="font-semibold text-zinc-700">No hay usuarios registrados</p>
                <p className="text-xs text-zinc-500">Haz clic en &quot;Crear Usuario&quot; para registrar uno nuevo.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="border-b border-zinc-100">
                    <TableRow className="hover:bg-transparent border-zinc-100">
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Usuario</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Correo</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Rol</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Negocio Asignado</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Fecha Creación</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-zinc-100">
                    {globalUsers.map((u) => (
                      <TableRow key={u.id} className="hover:bg-zinc-50/50 border-b border-zinc-50">
                        <TableCell className="font-medium text-zinc-900">{u.full_name}</TableCell>
                        <TableCell className="text-sm text-zinc-700">{u.email}</TableCell>
                        <TableCell>
                          <span className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                            u.role === 'superadmin'
                              ? 'bg-violet-50 text-violet-700 border border-violet-200'
                              : u.role === 'admin'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-zinc-100 text-zinc-500 border border-zinc-200'
                          }`}>
                            {u.role}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-zinc-700">
                          {u.businesses?.name || <span className="text-zinc-400">Global / Ninguno</span>}
                        </TableCell>
                        <TableCell className="text-zinc-500 text-xs">
                          {new Date(u.created_at).toLocaleDateString('es-PE')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* DIALOG: CREATE BUSINESS + ADMIN */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="border-zinc-200 bg-white text-zinc-900 max-w-lg overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-[family-name:var(--font-sora)] text-zinc-900">Nuevo Negocio Gastronómico</DialogTitle>
            <DialogDescription className="text-zinc-500 text-xs font-[family-name:var(--font-inter)]">
              Registra una nueva empresa y configura su cuenta de Administrador por defecto.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4 py-2 font-[family-name:var(--font-inter)]">
            <div className="space-y-1.5">
              <h3 className="text-sm font-semibold text-amber-600 border-b border-zinc-100 pb-1">
                Datos del Negocio
              </h3>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div className="space-y-1">
                  <Label htmlFor="biz-name" className="text-zinc-700 text-sm font-medium">Nombre Comercial *</Label>
                  <Input
                    id="biz-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. Pollería Central"
                    className="border-zinc-200 bg-white text-zinc-900 focus-visible:ring-amber-500 focus-visible:border-amber-500"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="biz-type" className="text-zinc-700 text-sm font-medium">Tipo de Establecimiento</Label>
                  <Select
                    value={type}
                    onValueChange={(val) => { if (val) setType(val as 'cafeteria' | 'restaurante' | 'polleria') }}
                  >
                    <SelectTrigger className="border-zinc-200 bg-white text-zinc-900 focus:ring-amber-500 focus:border-amber-500">
                      <SelectValue placeholder="Selecciona" />
                    </SelectTrigger>
                    <SelectContent className="border-zinc-200 bg-white text-zinc-900">
                      <SelectItem value="restaurante">Restaurante</SelectItem>
                      <SelectItem value="polleria">Pollería</SelectItem>
                      <SelectItem value="cafeteria">Cafetería</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="space-y-1">
                  <Label htmlFor="biz-plan" className="text-zinc-700 text-sm font-medium">Plan de Suscripción</Label>
                  <Select
                    value={plan}
                    onValueChange={(val) => { if (val) setPlan(val as 'essential' | 'pro' | 'premium') }}
                  >
                    <SelectTrigger className="border-zinc-200 bg-white text-zinc-900 focus:ring-amber-500 focus:border-amber-500">
                      <SelectValue placeholder="Selecciona" />
                    </SelectTrigger>
                    <SelectContent className="border-zinc-200 bg-white text-zinc-900">
                      <SelectItem value="essential">Esencial</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="biz-addr" className="text-zinc-700 text-sm font-medium">Dirección *</Label>
                  <Input
                    id="biz-addr"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Av. Principal 123"
                    className="border-zinc-200 bg-white text-zinc-900 focus-visible:ring-amber-500 focus-visible:border-amber-500"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <h3 className="text-sm font-semibold text-amber-600 border-b border-zinc-100 pb-1">
                Cuenta Administrador del Negocio
              </h3>
              <div className="space-y-2 mt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="admin-name" className="text-zinc-700 text-sm font-medium">Nombre Completo *</Label>
                    <Input
                      id="admin-name"
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      placeholder="Ej. Carlos Mendoza"
                      className="border-zinc-200 bg-white text-zinc-900 focus-visible:ring-amber-500 focus-visible:border-amber-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="admin-email" className="text-zinc-700 text-sm font-medium">Correo Electrónico *</Label>
                    <Input
                      id="admin-email"
                      type="email"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      placeholder="admin@correo.com"
                      className="border-zinc-200 bg-white text-zinc-900 focus-visible:ring-amber-500 focus-visible:border-amber-500"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="admin-pass" className="text-zinc-700 text-sm font-medium">Contraseña Temporal *</Label>
                  <Input
                    id="admin-pass"
                    type="password"
                    value={adminPass}
                    onChange={(e) => setAdminPass(e.target.value)}
                    placeholder="Min. 6 caracteres"
                    className="border-zinc-200 bg-white text-zinc-900 focus-visible:ring-amber-500 focus-visible:border-amber-500"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-zinc-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                className="border-zinc-200 text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
                disabled={createMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg text-sm h-9 px-4"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Registrando...
                  </>
                ) : (
                  'Crear Negocio'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG: EDIT BUSINESS */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="border-zinc-200 bg-white text-zinc-900 max-w-lg overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-[family-name:var(--font-sora)] text-zinc-900">Editar Datos del Negocio</DialogTitle>
            <DialogDescription className="text-zinc-500 text-xs font-[family-name:var(--font-inter)]">
              Actualiza la información comercial o estado de suscripción de la empresa.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 py-2 font-[family-name:var(--font-inter)]">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="edit-biz-name" className="text-zinc-700 text-sm font-medium">Nombre Comercial</Label>
                <Input
                  id="edit-biz-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="border-zinc-200 bg-white text-zinc-900 focus-visible:ring-amber-500 focus-visible:border-amber-500"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-biz-type" className="text-zinc-700 text-sm font-medium">Tipo</Label>
                <Select
                  value={editType}
                  onValueChange={(val) => { if (val) setEditType(val as 'cafeteria' | 'restaurante' | 'polleria') }}
                >
                  <SelectTrigger className="border-zinc-200 bg-white text-zinc-900 focus:ring-amber-500 focus:border-amber-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-zinc-200 bg-white text-zinc-900">
                    <SelectItem value="restaurante">Restaurante</SelectItem>
                    <SelectItem value="polleria">Pollería</SelectItem>
                    <SelectItem value="cafeteria">Cafetería</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="edit-biz-plan" className="text-zinc-700 text-sm font-medium">Plan de Suscripción</Label>
                <Select
                  value={editPlan}
                  onValueChange={(val) => { if (val) setEditPlan(val as 'essential' | 'pro' | 'premium') }}
                >
                  <SelectTrigger className="border-zinc-200 bg-white text-zinc-900 focus:ring-amber-500 focus:border-amber-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-zinc-200 bg-white text-zinc-900">
                    <SelectItem value="essential">Esencial</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-biz-status" className="text-zinc-700 text-sm font-medium">Estado Operativo</Label>
                <Select
                  value={editStatus}
                  onValueChange={(val) => { if (val) setEditStatus(val as 'active' | 'inactive' | 'suspended') }}
                >
                  <SelectTrigger className="border-zinc-200 bg-white text-zinc-900 focus:ring-amber-500 focus:border-amber-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-zinc-200 bg-white text-zinc-900">
                    <SelectItem value="active">Activo</SelectItem>
                    <SelectItem value="inactive">Inactivo</SelectItem>
                    <SelectItem value="suspended">Suspendido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="edit-biz-addr" className="text-zinc-700 text-sm font-medium">Dirección</Label>
              <Input
                id="edit-biz-addr"
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                className="border-zinc-200 bg-white text-zinc-900 focus-visible:ring-amber-500 focus-visible:border-amber-500"
              />
            </div>

            <DialogFooter className="pt-4 border-t border-zinc-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditOpen(false)}
                className="border-zinc-200 text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
                disabled={updateMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg text-sm h-9 px-4"
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Actualizando...
                  </>
                ) : (
                  'Guardar Cambios'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG: EDIT PLAN PRICE */}
      <Dialog open={isEditPlanOpen} onOpenChange={setIsEditPlanOpen}>
        <DialogContent className="border-zinc-200 bg-white text-zinc-900 max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-[family-name:var(--font-sora)] font-bold text-zinc-900">Editar Tarifa de Plan</DialogTitle>
            <DialogDescription className="text-zinc-500 text-xs font-[family-name:var(--font-inter)]">
              Modifica el costo mensual para la suscripción al plan **{selectedPlan?.name}**.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditPlanSubmit} className="space-y-4 py-2 font-[family-name:var(--font-inter)]">
            <div className="space-y-1">
              <Label htmlFor="plan-price" className="text-zinc-700 text-sm font-medium">Costo Mensual ($) *</Label>
              <Input
                id="plan-price"
                type="number"
                step="0.01"
                value={editPlanPrice}
                onChange={(e) => setEditPlanPrice(e.target.value)}
                className="border-zinc-200 bg-white text-zinc-900 focus-visible:ring-amber-500 focus-visible:border-amber-500"
              />
            </div>

            <DialogFooter className="pt-4 border-t border-zinc-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditPlanOpen(false)}
                className="border-zinc-200 text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 w-full"
                disabled={updatePlanMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg text-sm h-9 w-full"
                disabled={updatePlanMutation.isPending}
              >
                {updatePlanMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Guardar Tarifa'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG: CONFIRM DELETE */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="border-zinc-200 bg-white text-zinc-900">
          <DialogHeader>
            <DialogTitle className="text-red-600 font-[family-name:var(--font-sora)] font-bold text-lg">¿Eliminar Establecimiento?</DialogTitle>
            <DialogDescription className="text-zinc-500 text-xs font-[family-name:var(--font-inter)]">
              Esta acción es irreversible. Se eliminará el negocio <strong>{selectedBusiness?.name}</strong>, todas sus cuentas asociadas (incluyendo al Administrador), carta, inventario, mesas y pedidos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4 border-t border-zinc-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteOpen(false)}
              className="border-zinc-200 text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
              disabled={deleteMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => selectedBusiness && deleteMutation.mutate(selectedBusiness.id)}
              className="bg-red-500 hover:bg-red-650 text-white font-semibold rounded-lg text-sm h-9 px-4"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                'Eliminar por Completo'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: CREATE USER */}
      <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
        <DialogContent className="border-zinc-200 bg-white text-zinc-900 max-w-md">
          <DialogHeader>
            <DialogTitle className="font-[family-name:var(--font-sora)] font-bold text-zinc-900">Crear Nuevo Usuario</DialogTitle>
            <DialogDescription className="text-zinc-500 text-xs font-[family-name:var(--font-inter)]">
              Registra un nuevo usuario en la base de datos de GastroLedger.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateUserSubmit} className="space-y-4 py-2 font-[family-name:var(--font-inter)]">
            <div className="space-y-1">
              <Label htmlFor="user-fullname" className="text-zinc-700 text-sm font-medium">Nombre Completo *</Label>
              <Input
                id="user-fullname"
                value={uFullName}
                onChange={(e) => setUFullName(e.target.value)}
                placeholder="Ej. Juan Pérez"
                className="border-zinc-200 bg-white text-zinc-900 focus-visible:ring-amber-500 focus-visible:border-amber-500"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="user-email" className="text-zinc-700 text-sm font-medium">Correo Electrónico *</Label>
              <Input
                id="user-email"
                type="email"
                value={uEmail}
                onChange={(e) => setUEmail(e.target.value)}
                placeholder="juan@gastroledger.com"
                className="border-zinc-200 bg-white text-zinc-900 focus-visible:ring-amber-500 focus-visible:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="user-pass" className="text-zinc-700 text-sm font-medium">Contraseña *</Label>
                <Input
                  id="user-pass"
                  type="password"
                  value={uPass}
                  onChange={(e) => setUPass(e.target.value)}
                  placeholder="Mín. 6 caracteres"
                  className="border-zinc-200 bg-white text-zinc-900 focus-visible:ring-amber-500 focus-visible:border-amber-500"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="user-confirm-pass" className="text-zinc-700 text-sm font-medium">Confirmar *</Label>
                <Input
                  id="user-confirm-pass"
                  type="password"
                  value={uConfirmPass}
                  onChange={(e) => setUConfirmPass(e.target.value)}
                  placeholder="Repite"
                  className="border-zinc-200 bg-white text-zinc-900 focus-visible:ring-amber-500 focus-visible:border-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="user-role" className="text-zinc-700 text-sm font-medium">Rol del Usuario</Label>
                <Select
                  value={uRole}
                  onValueChange={(val) => {
                    if (val) {
                      setURole(val as 'superadmin' | 'admin' | 'cashier' | 'waiter' | 'cook')
                      if (val === 'superadmin') setUBusinessId('')
                    }
                  }}
                >
                  <SelectTrigger className="border-zinc-200 bg-white text-zinc-900 focus:ring-amber-500 focus:border-amber-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-zinc-200 bg-white text-zinc-900">
                    <SelectItem value="superadmin">Superadmin</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="cashier">Cajero</SelectItem>
                    <SelectItem value="waiter">Mesero</SelectItem>
                    <SelectItem value="cook">Cocinero</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="user-business" className="text-zinc-700 text-sm font-medium">Negocio Asignado</Label>
                <Select
                  disabled={uRole === 'superadmin'}
                  value={uBusinessId}
                  onValueChange={(val) => setUBusinessId(val || '')}
                >
                  <SelectTrigger className="border-zinc-200 bg-white text-zinc-900 focus:ring-amber-500 focus:border-amber-500">
                    <SelectValue placeholder="Selecciona" />
                  </SelectTrigger>
                  <SelectContent className="border-zinc-200 bg-white text-zinc-900">
                    {businesses.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-zinc-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateUserOpen(false)}
                className="border-zinc-200 text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
                disabled={createUserMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg text-sm h-9 px-4"
                disabled={createUserMutation.isPending}
              >
                {createUserMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creando...
                  </>
                ) : (
                  'Crear Usuario'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
