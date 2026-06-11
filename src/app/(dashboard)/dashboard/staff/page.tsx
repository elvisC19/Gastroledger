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
  Ban,
  Calendar,
  Download,
  FileText,
  Lock
} from 'lucide-react'
import { toast } from 'sonner'
import { type Profile } from '@/types'
import { usePlanGuard } from '@/hooks/usePlanGuard'
import { getAttendanceReport } from '@/app/actions/attendance'
import { jsPDF } from 'jspdf'

interface AttendanceLogType {
  id: string
  profile_id: string
  business_id: string
  date: string
  clock_in: string
  clock_out: string | null
  total_hours: number | null
  created_at?: string
  profiles?: {
    full_name: string
    role: string
  } | null
}

export default function StaffManagement() {
  const queryClient = useQueryClient()
  const { user: currentUser } = useAuth()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState<Profile | null>(null)

  // Plan Access Guard
  const { hasAccess } = usePlanGuard('pro')

  // Attendance states
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('week')

  const getLocalDateString = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Attendance Queries
  const { data: attendanceLogs, isLoading: isLoadingAttendance } = useQuery({
    queryKey: ['attendance', dateFilter],
    queryFn: () => {
      let start: string | undefined
      let end: string | undefined
      const today = new Date()
      
      if (dateFilter === 'today') {
        start = getLocalDateString(today)
        end = getLocalDateString(today)
      } else if (dateFilter === 'week') {
        const d = new Date()
        d.setDate(d.getDate() - 7)
        start = getLocalDateString(d)
        end = getLocalDateString(today)
      } else if (dateFilter === 'month') {
        const d = new Date()
        d.setMonth(d.getMonth() - 1)
        start = getLocalDateString(d)
        end = getLocalDateString(today)
      }
      return getAttendanceReport(start, end)
    },
    enabled: hasAccess
  })

  // Export handlers
  const exportToCSV = () => {
    if (!attendanceLogs || attendanceLogs.length === 0) {
      toast.error('No hay datos disponibles para exportar.')
      return
    }

    const headers = ['Empleado', 'Rol', 'Fecha', 'Hora Entrada', 'Hora Salida', 'Total Horas']
    const rows = attendanceLogs.map((log: AttendanceLogType) => [
      log.profiles?.full_name || 'Desconocido',
      roleLabels[log.profiles?.role || ''] || log.profiles?.role || '',
      log.date,
      log.clock_in ? new Date(log.clock_in).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '',
      log.clock_out ? new Date(log.clock_out).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : 'En turno',
      log.total_hours !== null ? log.total_hours : ''
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `Reporte_Asistencia_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Reporte CSV descargado con éxito.')
  }

  const exportToPDF = () => {
    if (!attendanceLogs || attendanceLogs.length === 0) {
      toast.error('No hay datos disponibles para exportar.')
      return
    }

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })

    const darkTextColor = [30, 41, 59]
    const lightTextColor = [100, 116, 139]
    const borderColor = [226, 232, 240]

    // Header Title
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2])
    doc.text('GASTROLEDGER', 15, 20)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(lightTextColor[0], lightTextColor[1], lightTextColor[2])
    doc.text('Reporte de Asistencia y Horas Trabajadas', 15, 25)
    doc.text(`Generado: ${new Date().toLocaleDateString('es-PE')} ${new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}`, 15, 30)

    // Divider Line
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2])
    doc.setLineWidth(0.5)
    doc.line(15, 33, 195, 33)

    // Table Headers
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2])
    
    let y = 42
    doc.text('Empleado', 15, y)
    doc.text('Rol', 65, y)
    doc.text('Fecha', 95, y)
    doc.text('Entrada', 120, y)
    doc.text('Salida', 145, y)
    doc.text('Total Horas', 170, y)

    doc.line(15, y + 2, 195, y + 2)
    y += 7

    // Table Rows
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(51, 65, 85)

    attendanceLogs.forEach((log: AttendanceLogType) => {
      if (y > 275) {
        doc.addPage()
        y = 20
        
        // Reprint header on new page
        doc.setFont('helvetica', 'bold')
        doc.text('Empleado', 15, y)
        doc.text('Rol', 65, y)
        doc.text('Fecha', 95, y)
        doc.text('Entrada', 120, y)
        doc.text('Salida', 145, y)
        doc.text('Total Horas', 170, y)
        doc.line(15, y + 2, 195, y + 2)
        y += 7
        doc.setFont('helvetica', 'normal')
      }

      const empName = log.profiles?.full_name || 'Desconocido'
      const empRole = roleLabels[log.profiles?.role || ''] || log.profiles?.role || ''
      const dateStr = log.date
      const inStr = log.clock_in ? new Date(log.clock_in).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '-'
      const outStr = log.clock_out ? new Date(log.clock_out).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : 'En turno'
      const hoursStr = log.total_hours !== null ? `${log.total_hours} hrs` : '-'

      doc.text(empName, 15, y)
      doc.text(empRole, 65, y)
      doc.text(dateStr, 95, y)
      doc.text(inStr, 120, y)
      doc.text(outStr, 145, y)
      doc.text(hoursStr, 170, y)

      y += 6
    })

    // Save PDF
    doc.save(`Reporte_Asistencia_${new Date().toISOString().slice(0, 10)}.pdf`)
    toast.success('Reporte PDF descargado con éxito.')
  }

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
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 font-[family-name:var(--font-sora)]">Gestión de Personal</h1>
          <p className="text-zinc-500 mt-1">Configura las credenciales de acceso para tus cajeros, meseros y cocineros.</p>
        </div>
        <Button
          onClick={() => setIsCreateOpen(true)}
          className="bg-amber-500 hover:bg-amber-600 text-black font-semibold self-start"
        >
          <Plus className="mr-2 h-4 w-4" /> Agregar Personal
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-zinc-100 bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Total Personal</span>
            <Users className="h-4 w-4 text-emerald-455" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-900 font-[family-name:var(--font-sora)]">{totalStaff}</div>
            <p className="text-xs text-zinc-400 mt-1">Cuentas activas en local</p>
          </CardContent>
        </Card>

        <Card className="border-zinc-100 bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Administradores</span>
            <Shield className="h-4 w-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-900 font-[family-name:var(--font-sora)]">{adminCount}</div>
            <p className="text-xs text-zinc-400 mt-1">Acceso total de configuración</p>
          </CardContent>
        </Card>

        <Card className="border-zinc-100 bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Operativos</span>
            <UserCheck className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-900 font-[family-name:var(--font-sora)]">{staffActive}</div>
            <p className="text-xs text-zinc-400 mt-1">Cajeros, meseros y cocineros</p>
          </CardContent>
        </Card>
      </div>

      {/* Staff Table */}
      <Card className="border-zinc-100 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg text-zinc-900">Equipo de Trabajo</CardTitle>
          <CardDescription className="text-zinc-500">
            Controla quién accede a las pantallas de comandas, caja y cocina.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            </div>
          ) : isError ? (
            <div className="rounded-lg bg-red-50 p-4 text-center text-sm text-red-600 border border-red-200">
              Error al cargar el personal: {error.message}
            </div>
          ) : staffList?.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-zinc-500 text-sm space-y-2 border border-dashed border-zinc-200 rounded-xl bg-zinc-50/50">
              <Users className="h-8 w-8 text-zinc-300 animate-pulse" />
              <p className="font-semibold text-zinc-500">Sin personal registrado</p>
              <p className="text-xs text-zinc-400">No hay personal registrado en este negocio. Registra uno para comenzar.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="border-b border-zinc-100">
                  <TableRow className="hover:bg-transparent border-zinc-100">
                    <TableHead className="text-zinc-500">Nombre Completo</TableHead>
                    <TableHead className="text-zinc-500">Correo Electrónico</TableHead>
                    <TableHead className="text-zinc-500">Rol asignado</TableHead>
                    <TableHead className="text-zinc-500">Fecha de Ingreso</TableHead>
                    <TableHead className="text-zinc-500 text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-zinc-100">
                  {staffList?.map((staff) => {
                    const isSelf = currentUser ? staff.id === currentUser.id : false
                    return (
                      <TableRow key={staff.id} className="hover:bg-zinc-50 border-zinc-100">
                        <TableCell className="font-semibold text-zinc-900">
                          {staff.full_name} {isSelf && <span className="text-[10px] bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full font-bold ml-1.5 border border-zinc-200">tú</span>}
                        </TableCell>
                        <TableCell className="text-zinc-500">{staff.email}</TableCell>
                        <TableCell>
                          <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase border ${roleColors[staff.role]}`}>
                            {roleLabels[staff.role]}
                          </span>
                        </TableCell>
                        <TableCell className="text-zinc-500 text-xs">
                          {new Date(staff.created_at).toLocaleDateString('es-PE')}
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditClick(staff)}
                            className="h-8 w-8 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100"
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
                                ? 'text-zinc-300 cursor-not-allowed opacity-40'
                                : 'text-zinc-400 hover:text-red-650 hover:bg-red-50'
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

      {/* REGISTRO DE ASISTENCIA */}
      <Card className="border-zinc-100 bg-white shadow-sm relative overflow-hidden">
        {/* Upgrade Overlay if essential plan */}
        {!hasAccess && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 backdrop-blur-md rounded-xl p-6 text-center animate-in fade-in duration-300">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 mb-3 border border-amber-500/20">
              <Lock className="h-5 w-5" />
            </div>
            <h3 className="font-extrabold text-lg text-zinc-900 font-[family-name:var(--font-sora)]">
              Control de Asistencia de Personal (Exclusivo Pro)
            </h3>
            <p className="text-zinc-500 text-xs max-w-sm mt-1 mb-4">
              Actualiza a Pro para controlar horas de personal, verificar entradas/salidas y exportar reportes detallados en PDF y CSV.
            </p>
          </div>
        )}

        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 pb-4 border-b border-zinc-100">
          <div>
            <CardTitle className="text-lg text-zinc-900 flex items-center space-x-2 font-[family-name:var(--font-sora)]">
              <Calendar className="h-5 w-5 text-amber-500" />
              <span>Control de Asistencia</span>
            </CardTitle>
            <CardDescription className="text-zinc-500 mt-1">
              Registro de ingresos, salidas y horas trabajadas por los empleados.
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={dateFilter}
              onValueChange={(val) => setDateFilter(val as 'today' | 'week' | 'month' | 'all')}
              disabled={!hasAccess}
            >
              <SelectTrigger className="w-[160px] border-zinc-200 bg-zinc-50 text-xs font-semibold">
                <SelectValue placeholder="Rango de fecha" />
              </SelectTrigger>
              <SelectContent className="border-zinc-200 bg-white text-zinc-900 text-xs font-medium">
                <SelectItem value="today">Hoy</SelectItem>
                <SelectItem value="week">Esta Semana</SelectItem>
                <SelectItem value="month">Este Mes</SelectItem>
                <SelectItem value="all">Histórico Completo</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={exportToCSV}
              disabled={!hasAccess || isLoadingAttendance || !attendanceLogs || attendanceLogs.length === 0}
              className="border-zinc-200 text-zinc-600 hover:bg-zinc-50 text-xs font-bold"
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              CSV
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={exportToPDF}
              disabled={!hasAccess || isLoadingAttendance || !attendanceLogs || attendanceLogs.length === 0}
              className="border-zinc-200 text-zinc-600 hover:bg-zinc-50 text-xs font-bold"
            >
              <FileText className="mr-1.5 h-3.5 w-3.5" />
              PDF
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {isLoadingAttendance ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            </div>
          ) : !attendanceLogs || attendanceLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-zinc-500 text-sm space-y-2 border border-dashed border-zinc-200 rounded-xl bg-zinc-50/50">
              <Calendar className="h-8 w-8 text-zinc-300" />
              <p className="font-semibold text-zinc-500">Sin registros de asistencia</p>
              <p className="text-xs text-zinc-400">No se encontraron turnos en el rango de fechas seleccionado.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="border-b border-zinc-100">
                  <TableRow className="hover:bg-transparent border-zinc-100">
                    <TableHead className="text-zinc-500">Empleado</TableHead>
                    <TableHead className="text-zinc-500">Rol</TableHead>
                    <TableHead className="text-zinc-500">Fecha</TableHead>
                    <TableHead className="text-zinc-500">Entrada</TableHead>
                    <TableHead className="text-zinc-500">Salida</TableHead>
                    <TableHead className="text-zinc-500 text-right">Horas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-zinc-100">
                  {attendanceLogs.map((log: AttendanceLogType) => {
                    const isCompleted = !!log.clock_out
                    return (
                      <TableRow key={log.id} className="hover:bg-zinc-50 border-zinc-100">
                        <TableCell className="font-semibold text-zinc-900">
                          {log.profiles?.full_name || 'Empleado'}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase border ${roleColors[log.profiles?.role || ''] || 'bg-zinc-100 text-zinc-500 border-zinc-200'}`}>
                            {roleLabels[log.profiles?.role || ''] || log.profiles?.role}
                          </span>
                        </TableCell>
                        <TableCell className="text-zinc-500 text-xs font-medium">
                          {log.date}
                        </TableCell>
                        <TableCell className="text-zinc-500 text-xs">
                          {log.clock_in ? new Date(log.clock_in).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </TableCell>
                        <TableCell className="text-zinc-500 text-xs">
                          {isCompleted ? (
                            new Date(log.clock_out!).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
                          ) : (
                            <span className="text-emerald-500 font-bold text-[10px] uppercase tracking-wider">Activo</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-zinc-900 font-semibold text-xs">
                          {isCompleted ? (
                            `${log.total_hours} hrs`
                          ) : (
                            <span className="text-zinc-400 font-normal">-</span>
                          )}
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
        <DialogContent className="border-zinc-100 bg-white text-zinc-900">
          <DialogHeader>
            <DialogTitle>Registrar Nuevo Empleado</DialogTitle>
            <DialogDescription className="text-zinc-500">
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
                className="border-zinc-200 bg-zinc-50"
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
                className="border-zinc-200 bg-zinc-50"
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
                  className="border-zinc-200 bg-zinc-50"
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
                  className="border-zinc-200 bg-zinc-50"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="staff-role">Rol Operativo</Label>
              <Select
                value={role}
                onValueChange={(val) => { if (val) setRole(val as 'admin' | 'cashier' | 'waiter' | 'cook') }}
              >
                <SelectTrigger className="border-zinc-200 bg-zinc-50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-zinc-200 bg-white text-zinc-900">
                  <SelectItem value="waiter">Mesero</SelectItem>
                  <SelectItem value="cashier">Cajero</SelectItem>
                  <SelectItem value="cook">Cocinero</SelectItem>
                  <SelectItem value="admin">Administrador Secundario</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-4 border-t border-zinc-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                className="border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                disabled={createMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
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
        <DialogContent className="border-zinc-100 bg-white text-zinc-900">
          <DialogHeader>
            <DialogTitle>Editar Datos del Personal</DialogTitle>
            <DialogDescription className="text-zinc-500">
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
                className="border-zinc-200 bg-zinc-50"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="edit-staff-role">Rol Operativo</Label>
              <Select
                value={editRole}
                onValueChange={(val) => { if (val) setEditRole(val as 'admin' | 'cashier' | 'waiter' | 'cook') }}
              >
                <SelectTrigger className="border-zinc-200 bg-zinc-50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-zinc-200 bg-white text-zinc-900">
                  <SelectItem value="waiter">Mesero</SelectItem>
                  <SelectItem value="cashier">Cajero</SelectItem>
                  <SelectItem value="cook">Cocinero</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-4 border-t border-zinc-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditOpen(false)}
                className="border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                disabled={updateMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
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
        <DialogContent className="border-zinc-100 bg-white text-zinc-900">
          <DialogHeader>
            <DialogTitle className="text-red-600">¿Remover Empleado?</DialogTitle>
            <DialogDescription className="text-zinc-500">
              ¿Estás seguro de que deseas eliminar la cuenta de <strong>{selectedStaff?.full_name}</strong>? Se desactivará su acceso al sistema de inmediato. Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4 border-t border-zinc-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteOpen(false)}
              className="border-zinc-200 text-zinc-600 hover:bg-zinc-50"
              disabled={deleteMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => selectedStaff && deleteMutation.mutate(selectedStaff.id)}
              className="bg-red-500 hover:bg-red-600 text-white font-semibold"
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
