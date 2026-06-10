'use client'

import { useState } from 'react'
import * as z from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/components/providers/auth-provider'
import {
  getStaff,
  createStaffUser,
  updateStaffUser,
  deleteStaffUser
} from '@/app/actions/staff'
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
  Plus,
  Loader2,
  Trash2,
  Edit2,
  Users,
  Shield,
  UserCheck,
  Ban
} from 'lucide-react'
import { toast } from 'sonner'
import { type Profile } from '@/types'

export default function StaffManagement() {
  const queryClient = useQueryClient()
  const { user: currentUser } = useAuth()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState<Profile | null>(null)

  // Form states for creation
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<'admin' | 'cashier' | 'waiter' | 'cook'>('waiter')

  // Form states for editing
  const [editFullName, setEditFullName] = useState('')
  const [editRole, setEditRole] = useState<'admin' | 'cashier' | 'waiter' | 'cook'>('waiter')

  // Queries
  const { data: staffList, isLoading, isError, error } = useQuery<Profile[], Error>({
    queryKey: ['staff'],
    queryFn: () => getStaff() as Promise<Profile[]>,
  })

  // Mutations
  const createMutation = useMutation({
    mutationFn: createStaffUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] })
      toast.success('Miembro del personal registrado con éxito')
      setIsCreateOpen(false)
      // Reset form
      setEmail('')
      setPass('')
      setConfirmPass('')
      setFullName('')
      setRole('waiter')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Error al registrar miembro')
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: { fullName?: string; role?: 'admin' | 'cashier' | 'waiter' | 'cook' } }) =>
      updateStaffUser(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] })
      toast.success('Datos de personal actualizados correctamente')
      setIsEditOpen(false)
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Error al actualizar personal')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: deleteStaffUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] })
      toast.success('Miembro del personal eliminado del sistema')
      setIsDeleteOpen(false)
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Error al eliminar personal')
    }
  })

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const staffSchema = z.object({
      fullName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
      email: z.string().email('Por favor ingresa un correo electrónico válido'),
      pass: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
      confirmPass: z.string(),
      role: z.enum(['admin', 'cashier', 'waiter', 'cook'])
    }).refine((data) => data.pass === data.confirmPass, {
      message: "Las contraseñas no coinciden",
      path: ["confirmPass"],
    })

    const parsed = staffSchema.safeParse({ fullName, email, pass, confirmPass, role })

    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message)
      return
    }

    createMutation.mutate({
      email,
      pass,
      fullName,
      role
    })
  }

  const handleEditClick = (staff: Profile) => {
    setSelectedStaff(staff)
    setEditFullName(staff.full_name)
    setEditRole(staff.role as 'admin' | 'cashier' | 'waiter' | 'cook')
    setIsEditOpen(true)
  }

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStaff) return

    const editStaffSchema = z.object({
      fullName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
      role: z.enum(['admin', 'cashier', 'waiter', 'cook'])
    })

    const parsed = editStaffSchema.safeParse({ fullName: editFullName, role: editRole })

    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message)
      return
    }

    updateMutation.mutate({
      id: selectedStaff.id,
      updates: {
        fullName: editFullName,
        role: editRole
      }
    })
  }

  const handleDeleteClick = (staff: Profile) => {
    if (currentUser && staff.id === currentUser.id) {
      toast.error('No puedes eliminar tu propia cuenta de administrador.')
      return
    }
    setSelectedStaff(staff)
    setIsDeleteOpen(true)
  }

  // Count summaries
  const totalStaff = staffList?.length || 0
  const adminCount = staffList?.filter((s) => s.role === 'admin').length || 0
  const staffActive = staffList?.filter((s) => s.role !== 'admin').length || 0

  const roleLabels: Record<string, string> = {
    admin: 'Administrador',
    cashier: 'Cajero',
    waiter: 'Mesero',
    cook: 'Cocinero',
  }

  const roleColors: Record<string, string> = {
    admin: 'bg-red-500/10 text-red-400 border-red-500/20',
    cashier: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    waiter: 'bg-emerald-500/10 text-emerald-450 border-emerald-500/20',
    cook: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Gestión de Personal</h1>
          <p className="text-slate-400 mt-1">Configura las credenciales de acceso para tus cajeros, meseros y cocineros.</p>
        </div>
        <Button
          onClick={() => setIsCreateOpen(true)}
          className="bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-600 self-start"
        >
          <Plus className="mr-2 h-4 w-4" /> Agregar Personal
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Personal</span>
            <Users className="h-4 w-4 text-emerald-450" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-100">{totalStaff}</div>
            <p className="text-xs text-slate-500 mt-1">Cuentas activas en local</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Administradores</span>
            <Shield className="h-4 w-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-100">{adminCount}</div>
            <p className="text-xs text-slate-500 mt-1">Acceso total de configuración</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Operativos</span>
            <UserCheck className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-100">{staffActive}</div>
            <p className="text-xs text-slate-500 mt-1">Cajeros, meseros y cocineros</p>
          </CardContent>
        </Card>
      </div>

      {/* Staff Table */}
      <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg text-slate-200">Equipo de Trabajo</CardTitle>
          <CardDescription className="text-slate-400">
            Controla quién accede a las pantallas de comandas, caja y cocina.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            </div>
          ) : isError ? (
            <div className="rounded-lg bg-red-500/10 p-4 text-center text-sm text-red-400 border border-red-500/20">
              Error al cargar el personal: {error.message}
            </div>
          ) : staffList?.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-slate-500 text-sm space-y-2 border border-dashed border-slate-800/60 rounded-xl bg-slate-950/20">
              <Users className="h-8 w-8 text-slate-700 animate-pulse" />
              <p className="font-semibold text-slate-400">Sin personal registrado</p>
              <p className="text-xs text-slate-600">No hay personal registrado en este negocio. Registra uno para comenzar.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="border-b border-slate-800">
                  <TableRow className="hover:bg-transparent border-slate-800">
                    <TableHead className="text-slate-400">Nombre Completo</TableHead>
                    <TableHead className="text-slate-400">Correo Electrónico</TableHead>
                    <TableHead className="text-slate-400">Rol asignado</TableHead>
                    <TableHead className="text-slate-400">Fecha de Ingreso</TableHead>
                    <TableHead className="text-slate-400 text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-800/50">
                  {staffList?.map((staff) => {
                    const isSelf = currentUser ? staff.id === currentUser.id : false
                    return (
                      <TableRow key={staff.id} className="hover:bg-slate-900/20 border-slate-800/50">
                        <TableCell className="font-semibold text-slate-200">
                          {staff.full_name} {isSelf && <span className="text-[10px] bg-slate-800 text-slate-450 px-2 py-0.5 rounded-full font-bold ml-1.5 border border-slate-750">tú</span>}
                        </TableCell>
                        <TableCell className="text-slate-400">{staff.email}</TableCell>
                        <TableCell>
                          <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase border ${roleColors[staff.role]}`}>
                            {roleLabels[staff.role]}
                          </span>
                        </TableCell>
                        <TableCell className="text-slate-455 text-xs">
                          {new Date(staff.created_at).toLocaleDateString('es-PE')}
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditClick(staff)}
                            className="h-8 w-8 text-slate-455 hover:text-slate-100 hover:bg-slate-800"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(staff)}
                            disabled={isSelf}
                            className={`h-8 w-8 transition-all ${
                              isSelf
                                ? 'text-slate-700 cursor-not-allowed opacity-40'
                                : 'text-slate-455 hover:text-red-400 hover:bg-red-500/10'
                            }`}
                            title={isSelf ? 'No puedes eliminarte a ti mismo' : 'Eliminar empleado'}
                          >
                            {isSelf ? <Ban className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* DIALOG: CREATE STAFF */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="border-slate-800 bg-slate-900 text-slate-100">
          <DialogHeader>
            <DialogTitle>Registrar Nuevo Empleado</DialogTitle>
            <DialogDescription className="text-slate-400">
              Registra la cuenta con la que el empleado ingresará a Gastroledger.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="staff-name">Nombre Completo *</Label>
              <Input
                id="staff-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ej. Ana Gómez"
                className="border-slate-800 bg-slate-950/50"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="staff-email">Correo Electrónico *</Label>
              <Input
                id="staff-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ana@comercio.com"
                className="border-slate-800 bg-slate-950/50"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="staff-pass">Contraseña *</Label>
                <Input
                  id="staff-pass"
                  type="password"
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  placeholder="Mín. 6 caracteres"
                  className="border-slate-800 bg-slate-950/50"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="staff-confirm-pass">Confirmar Contraseña *</Label>
                <Input
                  id="staff-confirm-pass"
                  type="password"
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  placeholder="Repite contraseña"
                  className="border-slate-800 bg-slate-950/50"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="staff-role">Rol Operativo</Label>
              <Select
                value={role}
                onValueChange={(val) => { if (val) setRole(val as 'admin' | 'cashier' | 'waiter' | 'cook') }}
              >
                <SelectTrigger className="border-slate-800 bg-slate-950/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-slate-800 bg-slate-900 text-slate-100">
                  <SelectItem value="waiter">Mesero</SelectItem>
                  <SelectItem value="cashier">Cajero</SelectItem>
                  <SelectItem value="cook">Cocinero</SelectItem>
                  <SelectItem value="admin">Administrador Secundario</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-4 border-t border-slate-800/60">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                className="border-slate-800 text-slate-400 hover:bg-slate-850"
                disabled={createMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-600"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creando Cuenta...
                  </>
                ) : (
                  'Registrar Empleado'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG: EDIT STAFF */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="border-slate-800 bg-slate-900 text-slate-100">
          <DialogHeader>
            <DialogTitle>Editar Datos del Personal</DialogTitle>
            <DialogDescription className="text-slate-400">
              Actualiza el nombre comercial o rol operativo del empleado.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="edit-staff-name">Nombre Completo</Label>
              <Input
                id="edit-staff-name"
                value={editFullName}
                onChange={(e) => setEditFullName(e.target.value)}
                className="border-slate-800 bg-slate-950/50"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="edit-staff-role">Rol Operativo</Label>
              <Select
                value={editRole}
                onValueChange={(val) => { if (val) setEditRole(val as 'admin' | 'cashier' | 'waiter' | 'cook') }}
              >
                <SelectTrigger className="border-slate-800 bg-slate-950/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-slate-800 bg-slate-900 text-slate-100">
                  <SelectItem value="waiter">Mesero</SelectItem>
                  <SelectItem value="cashier">Cajero</SelectItem>
                  <SelectItem value="cook">Cocinero</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-4 border-t border-slate-800/60">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditOpen(false)}
                className="border-slate-800 text-slate-400 hover:bg-slate-850"
                disabled={updateMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-600"
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Guardar Cambios'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG: CONFIRM DELETE */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="border-slate-800 bg-slate-900 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-red-400">¿Remover Empleado?</DialogTitle>
            <DialogDescription className="text-slate-400">
              ¿Estás seguro de que deseas eliminar la cuenta de <strong>{selectedStaff?.full_name}</strong>? Se desactivará su acceso al sistema de inmediato. Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4 border-t border-slate-800/60">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteOpen(false)}
              className="border-slate-800 text-slate-400 hover:bg-slate-850"
              disabled={deleteMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => selectedStaff && deleteMutation.mutate(selectedStaff.id)}
              className="bg-red-500 text-slate-955 font-bold hover:bg-red-650"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                'Remover'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
