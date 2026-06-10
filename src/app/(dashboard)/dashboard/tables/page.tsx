'use client'

import { useState } from 'react'
import * as z from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getTables,
  createTable,
  updateTable,
  deleteTable
} from '@/app/actions/tables'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
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
  Plus,
  Loader2,
  Trash2,
  Edit2,
  Coffee,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'

interface TableType {
  id: string
  table_number: number
  status: 'free' | 'occupied'
  created_at: string
}

export default function TablesManagement() {
  const queryClient = useQueryClient()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedTable, setSelectedTable] = useState<TableType | null>(null)

  // Form states for creation
  const [tableNumber, setTableNumber] = useState('')
  const [status, setStatus] = useState<'free' | 'occupied'>('free')

  // Form states for editing
  const [editTableNumber, setEditTableNumber] = useState('')
  const [editStatus, setEditStatus] = useState<'free' | 'occupied'>('free')

  // Queries
  const { data: tables, isLoading, isError, error } = useQuery<TableType[], Error>({
    queryKey: ['tables'],
    queryFn: () => getTables() as Promise<TableType[]>,
  })

  // Mutations
  const createMutation = useMutation({
    mutationFn: createTable,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] })
      toast.success('Mesa agregada correctamente')
      setIsCreateOpen(false)
      setTableNumber('')
      setStatus('free')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Error al agregar mesa')
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Omit<TableType, 'id' | 'created_at'>> }) => updateTable(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] })
      toast.success('Mesa actualizada correctamente')
      setIsEditOpen(false)
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Error al actualizar mesa')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: deleteTable,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] })
      toast.success('Mesa eliminada correctamente')
      setIsDeleteOpen(false)
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Error al eliminar mesa')
    }
  })

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const tableSchema = z.object({
      table_number: z.number({ message: 'El número de mesa debe ser un número entero' }).int('El número de mesa debe ser entero').positive('El número de mesa debe ser un entero positivo'),
      status: z.enum(['free', 'occupied'])
    })

    const parsedNum = parseInt(tableNumber)
    const parsed = tableSchema.safeParse({
      table_number: isNaN(parsedNum) ? undefined : parsedNum,
      status
    })

    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message)
      return
    }

    createMutation.mutate({
      table_number: parsedNum,
      status
    })
  }

  const handleEditClick = (tbl: TableType) => {
    setSelectedTable(tbl)
    setEditTableNumber(tbl.table_number.toString())
    setEditStatus(tbl.status)
    setIsEditOpen(true)
  }

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTable) return

    const tableSchema = z.object({
      table_number: z.number({ message: 'El número de mesa debe ser un número entero' }).int('El número de mesa debe ser entero').positive('El número de mesa debe ser un entero positivo'),
      status: z.enum(['free', 'occupied'])
    })

    const parsedNum = parseInt(editTableNumber)
    const parsed = tableSchema.safeParse({
      table_number: isNaN(parsedNum) ? undefined : parsedNum,
      status: editStatus
    })

    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message)
      return
    }

    updateMutation.mutate({
      id: selectedTable.id,
      updates: {
        table_number: parsedNum,
        status: editStatus
      }
    })
  }

  const handleDeleteClick = (tbl: TableType) => {
    setSelectedTable(tbl)
    setIsDeleteOpen(true)
  }

  const toggleStatus = (tbl: TableType) => {
    const nextStatus = tbl.status === 'free' ? 'occupied' : 'free'
    updateMutation.mutate({
      id: tbl.id,
      updates: { status: nextStatus }
    })
  }

  // Count summaries
  const totalTables = tables?.length || 0
  const freeTables = tables?.filter((t) => t.status === 'free').length || 0
  const occupiedTables = tables?.filter((t) => t.status === 'occupied').length || 0

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 font-[family-name:var(--font-sora)]">Gestión de Mesas</h1>
          <p className="text-zinc-500 mt-1">Configura el aforo de tu salón y monitorea el estado en tiempo real.</p>
        </div>
        <Button
          onClick={() => setIsCreateOpen(true)}
          className="bg-amber-500 hover:bg-amber-600 text-black font-semibold self-start"
        >
          <Plus className="mr-2 h-4 w-4" /> Agregar Mesa
        </Button>
      </div>

      {/* Counts Grid */}
      <div className="grid gap-4 grid-cols-3">
        <Card className="border-zinc-100 bg-white shadow-sm">
          <CardContent className="pt-6 text-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block mb-1">Aforo Total</span>
            <div className="text-3xl font-black text-zinc-900 font-[family-name:var(--font-sora)]">{totalTables}</div>
            <p className="text-[10px] text-zinc-400 mt-1">Mesas registradas en el salón</p>
          </CardContent>
        </Card>

        <Card className="border-zinc-100 bg-white shadow-sm">
          <CardContent className="pt-6 text-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block mb-1">Disponibles</span>
            <div className="text-3xl font-black text-emerald-600 font-[family-name:var(--font-sora)]">{freeTables}</div>
            <p className="text-[10px] text-zinc-400 mt-1">Listas para recibir clientes</p>
          </CardContent>
        </Card>

        <Card className="border-zinc-100 bg-white shadow-sm">
          <CardContent className="pt-6 text-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block mb-1">Ocupadas</span>
            <div className="text-3xl font-black text-blue-600 font-[family-name:var(--font-sora)]">{occupiedTables}</div>
            <p className="text-[10px] text-zinc-400 mt-1">Consumiendo activamente</p>
          </CardContent>
        </Card>
      </div>

      {/* Tables Grid view */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
        </div>
      ) : isError ? (
        <div className="rounded-lg bg-red-50 p-4 text-center text-sm text-red-650 border border-red-200">
          Error al cargar mesas: {error.message}
        </div>
      ) : tables?.length === 0 ? (
        <div className="p-16 border border-dashed border-zinc-200 rounded-2xl text-center text-zinc-500 bg-zinc-50/50">
          <Coffee className="h-10 w-10 text-zinc-300 mx-auto mb-4" />
          <p className="text-sm font-semibold">No hay mesas configuradas</p>
          <p className="text-xs text-zinc-400 mt-1">
            Puedes configurar las mesas de tu local haciendo clic en el botón de arriba.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {tables?.map((table) => {
            const isFree = table.status === 'free'
            return (
              <Card
                key={table.id}
                className={`border-zinc-100 bg-white shadow-sm transition-all flex flex-col justify-between overflow-hidden group ${
                  isFree
                    ? 'hover:border-emerald-500/50'
                    : 'hover:border-blue-500/50'
                }`}
              >
                {/* Header status bar */}
                <div className={`h-1.5 w-full ${isFree ? 'bg-emerald-500' : 'bg-blue-500'}`} />

                <CardHeader className="p-4 pb-2 text-center">
                  <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold">Mesa</span>
                  <CardTitle className="text-3xl font-black text-zinc-900 font-[family-name:var(--font-sora)] mt-1">
                    {table.table_number}
                  </CardTitle>
                </CardHeader>

                <CardContent className="p-4 py-2 text-center">
                  <button
                    onClick={() => toggleStatus(table)}
                    disabled={updateMutation.isPending}
                    className={`inline-flex items-center space-x-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase transition-all border ${
                      isFree
                        ? 'bg-emerald-55 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                    }`}
                  >
                    {isFree ? (
                      <>
                        <CheckCircle className="h-3 w-3" />
                        <span>Libre</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-3 w-3" />
                        <span>Ocupada</span>
                      </>
                    )}
                  </button>
                </CardContent>

                <CardFooter className="p-2 border-t border-zinc-100 mt-4 bg-zinc-50/30 flex items-center justify-center space-x-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEditClick(table)}
                    className="h-8 w-8 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteClick(table)}
                    className="h-8 w-8 text-zinc-400 hover:text-red-655 hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}

      {/* DIALOG: CREATE TABLE */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="border-zinc-100 bg-white text-zinc-900">
          <DialogHeader>
            <DialogTitle>Nueva Mesa</DialogTitle>
            <DialogDescription className="text-zinc-500">
              Registra un nuevo número de mesa para que los meseros puedan tomar comandas.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="tbl-num">Número de Mesa *</Label>
                <Input
                  id="tbl-num"
                  type="number"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  placeholder="Ej. 12"
                  className="border-zinc-200 bg-zinc-50"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="tbl-status">Estado Inicial</Label>
                <Select
                  value={status}
                  onValueChange={(val) => { if (val) setStatus(val as 'free' | 'occupied') }}
                >
                  <SelectTrigger className="border-zinc-200 bg-zinc-50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-zinc-200 bg-white text-zinc-900">
                    <SelectItem value="free">Libre</SelectItem>
                    <SelectItem value="occupied">Ocupada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
                    Registrando...
                  </>
                ) : (
                  'Registrar Mesa'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG: EDIT TABLE */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="border-zinc-100 bg-white text-zinc-900">
          <DialogHeader>
            <DialogTitle>Editar Mesa</DialogTitle>
            <DialogDescription className="text-zinc-500">
              Modifica los detalles de la mesa seleccionada.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="edit-tbl-num">Número de Mesa</Label>
                <Input
                  id="edit-tbl-num"
                  type="number"
                  value={editTableNumber}
                  onChange={(e) => setEditTableNumber(e.target.value)}
                  className="border-zinc-200 bg-zinc-50"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-tbl-status">Estado</Label>
                <Select
                  value={editStatus}
                  onValueChange={(val) => { if (val) setEditStatus(val as 'free' | 'occupied') }}
                >
                  <SelectTrigger className="border-zinc-200 bg-zinc-50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-zinc-200 bg-white text-zinc-900">
                    <SelectItem value="free">Libre</SelectItem>
                    <SelectItem value="occupied">Ocupada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
            <DialogTitle className="text-red-600">¿Eliminar Mesa?</DialogTitle>
            <DialogDescription className="text-zinc-500">
              ¿Estás seguro de que deseas eliminar la <strong>Mesa {selectedTable?.table_number}</strong>? Se quitará del panel y de la toma de comandas. Esta acción no se puede deshacer.
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
              onClick={() => selectedTable && deleteMutation.mutate(selectedTable.id)}
              className="bg-red-500 hover:bg-red-650 text-white font-semibold"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                'Eliminar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
