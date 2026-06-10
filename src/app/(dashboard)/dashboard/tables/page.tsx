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
          <h1 className="text-3xl font-bold tracking-tight text-white">Gestión de Mesas</h1>
          <p className="text-slate-400 mt-1">Configura el aforo de tu salón y monitorea el estado en tiempo real.</p>
        </div>
        <Button
          onClick={() => setIsCreateOpen(true)}
          className="bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-600 self-start"
        >
          <Plus className="mr-2 h-4 w-4" /> Agregar Mesa
        </Button>
      </div>

      {/* Counts Grid */}
      <div className="grid gap-4 grid-cols-3">
        <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-sm">
          <CardContent className="pt-6 text-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">Aforo Total</span>
            <div className="text-3xl font-black text-slate-100">{totalTables}</div>
            <p className="text-[10px] text-slate-500 mt-1">Mesas registradas en el salón</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-sm">
          <CardContent className="pt-6 text-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">Disponibles</span>
            <div className="text-3xl font-black text-emerald-455">{freeTables}</div>
            <p className="text-[10px] text-slate-500 mt-1">Listas para recibir clientes</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-sm">
          <CardContent className="pt-6 text-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">Ocupadas</span>
            <div className="text-3xl font-black text-blue-400">{occupiedTables}</div>
            <p className="text-[10px] text-slate-500 mt-1">Consumiendo activamente</p>
          </CardContent>
        </Card>
      </div>

      {/* Tables Grid view */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
        </div>
      ) : isError ? (
        <div className="rounded-lg bg-red-500/10 p-4 text-center text-sm text-red-400 border border-red-500/20">
          Error al cargar mesas: {error.message}
        </div>
      ) : tables?.length === 0 ? (
        <div className="p-16 border border-dashed border-slate-800 rounded-2xl text-center text-slate-500">
          <Coffee className="h-10 w-10 text-slate-750 mx-auto mb-4" />
          <p className="text-sm font-semibold">No hay mesas configuradas</p>
          <p className="text-xs text-slate-655 mt-1">
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
                className={`border-slate-800 bg-slate-900/40 transition-all flex flex-col justify-between overflow-hidden group ${
                  isFree
                    ? 'hover:border-emerald-500/50'
                    : 'hover:border-blue-500/50'
                }`}
              >
                {/* Header status bar */}
                <div className={`h-1.5 w-full ${isFree ? 'bg-emerald-500' : 'bg-blue-500'}`} />

                <CardHeader className="p-4 pb-2 text-center">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Mesa</span>
                  <CardTitle className="text-3xl font-black text-white mt-1">
                    {table.table_number}
                  </CardTitle>
                </CardHeader>

                <CardContent className="p-4 py-2 text-center">
                  <button
                    onClick={() => toggleStatus(table)}
                    disabled={updateMutation.isPending}
                    className={`inline-flex items-center space-x-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase transition-all border ${
                      isFree
                        ? 'bg-emerald-500/10 text-emerald-455 border-emerald-500/20 hover:bg-emerald-500/20'
                        : 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20'
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

                <CardFooter className="p-2 border-t border-slate-800/40 mt-4 bg-slate-900/20 flex items-center justify-center space-x-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEditClick(table)}
                    className="h-8 w-8 text-slate-455 hover:text-slate-100 hover:bg-slate-800"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteClick(table)}
                    className="h-8 w-8 text-slate-455 hover:text-red-400 hover:bg-red-500/10"
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
        <DialogContent className="border-slate-800 bg-slate-900 text-slate-100">
          <DialogHeader>
            <DialogTitle>Nueva Mesa</DialogTitle>
            <DialogDescription className="text-slate-400">
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
                  className="border-slate-800 bg-slate-950/50"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="tbl-status">Estado Inicial</Label>
                <Select
                  value={status}
                  onValueChange={(val) => { if (val) setStatus(val as 'free' | 'occupied') }}
                >
                  <SelectTrigger className="border-slate-800 bg-slate-950/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-slate-800 bg-slate-900 text-slate-100">
                    <SelectItem value="free">Libre</SelectItem>
                    <SelectItem value="occupied">Ocupada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
                className="bg-emerald-500 text-slate-955 font-bold hover:bg-emerald-600"
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
        <DialogContent className="border-slate-800 bg-slate-900 text-slate-100">
          <DialogHeader>
            <DialogTitle>Editar Mesa</DialogTitle>
            <DialogDescription className="text-slate-400">
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
                  className="border-slate-800 bg-slate-950/50"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-tbl-status">Estado</Label>
                <Select
                  value={editStatus}
                  onValueChange={(val) => { if (val) setEditStatus(val as 'free' | 'occupied') }}
                >
                  <SelectTrigger className="border-slate-800 bg-slate-950/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-slate-800 bg-slate-900 text-slate-100">
                    <SelectItem value="free">Libre</SelectItem>
                    <SelectItem value="occupied">Ocupada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
                className="bg-emerald-500 text-slate-955 font-bold hover:bg-emerald-600"
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
            <DialogTitle className="text-red-400">¿Eliminar Mesa?</DialogTitle>
            <DialogDescription className="text-slate-400">
              ¿Estás seguro de que deseas eliminar la <strong>Mesa {selectedTable?.table_number}</strong>? Se quitará del panel y de la toma de comandas. Esta acción no se puede deshacer.
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
              onClick={() => selectedTable && deleteMutation.mutate(selectedTable.id)}
              className="bg-red-500 text-slate-955 font-bold hover:bg-red-650"
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
