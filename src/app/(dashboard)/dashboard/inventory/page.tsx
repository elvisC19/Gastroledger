'use client'

import { useState } from 'react'
import * as z from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getInventoryItems,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem
} from '@/app/actions/inventory'
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
  AlertTriangle,
  Package,
  TrendingDown
} from 'lucide-react'
import { toast } from 'sonner'

interface InventoryItemType {
  id: string
  name: string
  unit: string
  current_stock: number
  min_stock: number
  unit_cost: number
  created_at: string
}

export default function InventoryManagement() {
  const queryClient = useQueryClient()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<InventoryItemType | null>(null)

  // Form states for creation
  const [name, setName] = useState('')
  const [unit, setUnit] = useState('und')
  const [currentStock, setCurrentStock] = useState('')
  const [minStock, setMinStock] = useState('')
  const [unitCost, setUnitCost] = useState('')

  // Form states for editing
  const [editName, setEditName] = useState('')
  const [editUnit, setEditUnit] = useState('')
  const [editCurrentStock, setEditCurrentStock] = useState('')
  const [editMinStock, setEditMinStock] = useState('')
  const [editUnitCost, setEditUnitCost] = useState('')

  // Queries
  const { data: inventoryItems, isLoading, isError, error } = useQuery<InventoryItemType[], Error>({
    queryKey: ['inventory-items'],
    queryFn: () => getInventoryItems() as Promise<InventoryItemType[]>,
  })

  // Mutations
  const createMutation = useMutation({
    mutationFn: createInventoryItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] })
      toast.success('Insumo registrado correctamente en el inventario')
      setIsCreateOpen(false)
      // Reset form
      setName('')
      setUnit('und')
      setCurrentStock('')
      setMinStock('')
      setUnitCost('')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Error al registrar insumo')
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Omit<InventoryItemType, 'id' | 'created_at'>> }) =>
      updateInventoryItem(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] })
      toast.success('Insumo actualizado correctamente')
      setIsEditOpen(false)
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Error al actualizar insumo')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: deleteInventoryItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] })
      toast.success('Insumo eliminado correctamente del inventario')
      setIsDeleteOpen(false)
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Error al eliminar insumo')
    }
  })

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const inventorySchema = z.object({
      name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
      unit: z.string().min(1, 'La unidad de medida es obligatoria'),
      current_stock: z.number({ message: 'El stock actual debe ser un número' }).min(0, 'El stock actual no puede ser negativo'),
      min_stock: z.number({ message: 'El stock mínimo debe ser un número' }).min(0, 'El stock mínimo no puede ser negativo'),
      unit_cost: z.number({ message: 'El costo unitario debe ser un número' }).min(0, 'El costo unitario no puede ser negativo')
    })

    const parsedStock = parseFloat(currentStock)
    const parsedMin = parseFloat(minStock)
    const parsedCost = parseFloat(unitCost)

    const parsed = inventorySchema.safeParse({
      name,
      unit,
      current_stock: isNaN(parsedStock) ? undefined : parsedStock,
      min_stock: isNaN(parsedMin) ? undefined : parsedMin,
      unit_cost: isNaN(parsedCost) ? undefined : parsedCost
    })

    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message)
      return
    }

    createMutation.mutate({
      name,
      unit,
      current_stock: parsedStock,
      min_stock: parsedMin,
      unit_cost: parsedCost
    })
  }

  const handleEditClick = (item: InventoryItemType) => {
    setSelectedItem(item)
    setEditName(item.name)
    setEditUnit(item.unit)
    setEditCurrentStock(item.current_stock.toString())
    setEditMinStock(item.min_stock.toString())
    setEditUnitCost(item.unit_cost.toString())
    setIsEditOpen(true)
  }

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedItem) return

    const inventorySchema = z.object({
      name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
      unit: z.string().min(1, 'La unidad de medida es obligatoria'),
      current_stock: z.number({ message: 'El stock actual debe ser un número' }).min(0, 'El stock actual no puede ser negativo'),
      min_stock: z.number({ message: 'El stock mínimo debe ser un número' }).min(0, 'El stock mínimo no puede ser negativo'),
      unit_cost: z.number({ message: 'El costo unitario debe ser un número' }).min(0, 'El costo unitario no puede ser negativo')
    })

    const parsedStock = parseFloat(editCurrentStock)
    const parsedMin = parseFloat(editMinStock)
    const parsedCost = parseFloat(editUnitCost)

    const parsed = inventorySchema.safeParse({
      name: editName,
      unit: editUnit,
      current_stock: isNaN(parsedStock) ? undefined : parsedStock,
      min_stock: isNaN(parsedMin) ? undefined : parsedMin,
      unit_cost: isNaN(parsedCost) ? undefined : parsedCost
    })

    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message)
      return
    }

    updateMutation.mutate({
      id: selectedItem.id,
      updates: {
        name: editName,
        unit: editUnit,
        current_stock: parsedStock,
        min_stock: parsedMin,
        unit_cost: parsedCost
      }
    })
  }

  const handleDeleteClick = (item: InventoryItemType) => {
    setSelectedItem(item)
    setIsDeleteOpen(true)
  }

  // Analytics Helpers
  const totalStockItems = inventoryItems?.length || 0
  const lowStockItems = inventoryItems?.filter((i) => i.current_stock <= i.min_stock).length || 0
  const totalValuation = inventoryItems?.reduce((sum, i) => sum + (i.current_stock * i.unit_cost), 0) || 0

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 font-[family-name:var(--font-sora)]">Inventario de Cocina</h1>
          <p className="text-zinc-500 mt-1">Monitorea ingredientes, stock de insumos, costos y alertas críticas.</p>
        </div>
        <Button
          onClick={() => setIsCreateOpen(true)}
          className="bg-amber-500 hover:bg-amber-600 text-black font-semibold self-start"
        >
          <Plus className="mr-2 h-4 w-4" /> Registrar Insumo / Ingrediente
        </Button>
      </div>

      {/* Analytics widgets */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-zinc-100 bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Total Insumos</span>
            <Package className="h-4 w-4 text-emerald-455" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-900 font-[family-name:var(--font-sora)]">{totalStockItems}</div>
            <p className="text-xs text-zinc-400 mt-1">Materias primas controladas</p>
          </CardContent>
        </Card>

        <Card className="border-zinc-100 bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Alertas de Stock</span>
            <AlertTriangle className={`h-4 w-4 ${lowStockItems > 0 ? 'text-amber-500 animate-pulse' : 'text-zinc-400'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${lowStockItems > 0 ? 'text-amber-400' : 'text-zinc-900 font-[family-name:var(--font-sora)]'}`}>
              {lowStockItems} Items
            </div>
            <p className="text-xs text-zinc-400 mt-1">Bajo el umbral de seguridad mínimo</p>
          </CardContent>
        </Card>

        <Card className="border-zinc-100 bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Valorización Estimada</span>
            <TrendingDown className="h-4 w-4 text-purple-450" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-900 font-[family-name:var(--font-sora)]">${totalValuation.toFixed(2)}</div>
            <p className="text-xs text-zinc-400 mt-1">Valor total de mercadería en almacén</p>
          </CardContent>
        </Card>
      </div>

      {/* Inventory Table */}
      <Card className="border-zinc-100 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg text-zinc-900">Control de Insumos</CardTitle>
          <CardDescription className="text-zinc-505">
            Listado de existencias actuales con alertas inteligentes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            </div>
          ) : isError ? (
            <div className="rounded-lg bg-red-50 p-4 text-center text-sm text-red-600 border border-red-200">
              Error al cargar inventario: {error.message}
            </div>
          ) : inventoryItems?.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-zinc-500 text-sm space-y-2 border border-dashed border-zinc-200 rounded-xl bg-zinc-50/50">
              <Package className="h-8 w-8 text-zinc-300 animate-pulse" />
              <p className="font-semibold text-zinc-500">Inventario vacío</p>
              <p className="text-xs text-zinc-400">No hay ingredientes en el inventario. Registra uno para comenzar.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="border-b border-zinc-100 bg-zinc-50">
                  <TableRow className="hover:bg-transparent border-zinc-100">
                    <TableHead className="text-zinc-500">Nombre del Insumo</TableHead>
                    <TableHead className="text-zinc-500">Unidad</TableHead>
                    <TableHead className="text-zinc-500">Stock Actual</TableHead>
                    <TableHead className="text-zinc-500">Stock Mínimo</TableHead>
                    <TableHead className="text-zinc-500">Costo Unit.</TableHead>
                    <TableHead className="text-zinc-500">Valor Almacén</TableHead>
                    <TableHead className="text-zinc-500">Estado Stock</TableHead>
                    <TableHead className="text-zinc-500 text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-zinc-100">
                  {inventoryItems?.map((item) => {
                    const isLow = item.current_stock <= item.min_stock
                    return (
                      <TableRow key={item.id} className="hover:bg-zinc-50 border-zinc-100">
                        <TableCell className="font-semibold text-zinc-900">{item.name}</TableCell>
                        <TableCell className="text-zinc-500 text-xs font-mono">{item.unit}</TableCell>
                        <TableCell className={`font-bold ${isLow ? 'text-amber-400' : 'text-zinc-800'}`}>
                          {item.current_stock}
                        </TableCell>
                        <TableCell className="text-zinc-500">{item.min_stock}</TableCell>
                        <TableCell className="text-zinc-700">${item.unit_cost.toFixed(2)}</TableCell>
                        <TableCell className="text-zinc-800">
                          ${(item.current_stock * item.unit_cost).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {isLow ? (
                            <span className="inline-flex items-center space-x-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-400 border border-amber-500/20 animate-pulse">
                              <AlertTriangle className="h-3 w-3" />
                              <span>Stock Bajo</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span>Suficiente</span>
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditClick(item)}
                            className="h-8 w-8 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(item)}
                            className="h-8 w-8 text-zinc-400 hover:text-red-655 hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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

      {/* DIALOG: CREATE ITEM */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="border-zinc-100 bg-white text-zinc-900">
          <DialogHeader>
            <DialogTitle>Registrar Nuevo Insumo</DialogTitle>
            <DialogDescription className="text-zinc-505">
              Agrega una nueva materia prima para controlar existencias y recetas.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="inv-name">Nombre Insumo *</Label>
                <Input
                  id="inv-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Papas Amarillas"
                  className="border-zinc-200 bg-zinc-50"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="inv-unit">Unidad de Medida</Label>
                <Select
                  value={unit}
                  onValueChange={(val) => setUnit(val || 'und')}
                >
                  <SelectTrigger className="border-zinc-200 bg-zinc-50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-zinc-200 bg-white text-zinc-900">
                    <SelectItem value="und">Unidades (und)</SelectItem>
                    <SelectItem value="kg">Kilogramos (kg)</SelectItem>
                    <SelectItem value="L">Litros (L)</SelectItem>
                    <SelectItem value="g">Gramos (g)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="inv-stock">Stock Inicial *</Label>
                <Input
                  id="inv-stock"
                  type="number"
                  step="0.01"
                  value={currentStock}
                  onChange={(e) => setCurrentStock(e.target.value)}
                  placeholder="Ej. 50"
                  className="border-zinc-200 bg-zinc-50"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="inv-min">Stock Mínimo *</Label>
                <Input
                  id="inv-min"
                  type="number"
                  step="0.01"
                  value={minStock}
                  onChange={(e) => setMinStock(e.target.value)}
                  placeholder="Ej. 10"
                  className="border-zinc-200 bg-zinc-50"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="inv-cost">Costo Unit. ($) *</Label>
                <Input
                  id="inv-cost"
                  type="number"
                  step="0.01"
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                  placeholder="Ej. 1.20"
                  className="border-zinc-200 bg-zinc-50"
                />
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
                  'Registrar Insumo'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG: EDIT ITEM */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="border-zinc-100 bg-white text-zinc-900">
          <DialogHeader>
            <DialogTitle>Editar Insumo</DialogTitle>
            <DialogDescription className="text-zinc-505">
              Modifica los niveles de stock, costo de compra o detalles del insumo.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="edit-inv-name">Nombre Insumo</Label>
                <Input
                  id="edit-inv-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="border-zinc-200 bg-zinc-50"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-inv-unit">Unidad</Label>
                <Select
                  value={editUnit}
                  onValueChange={(val) => setEditUnit(val || '')}
                >
                  <SelectTrigger className="border-zinc-200 bg-zinc-50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-zinc-200 bg-white text-zinc-900">
                    <SelectItem value="und">Unidades (und)</SelectItem>
                    <SelectItem value="kg">Kilogramos (kg)</SelectItem>
                    <SelectItem value="L">Litros (L)</SelectItem>
                    <SelectItem value="g">Gramos (g)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="edit-inv-stock">Stock Actual</Label>
                <Input
                  id="edit-inv-stock"
                  type="number"
                  step="0.01"
                  value={editCurrentStock}
                  onChange={(e) => setEditCurrentStock(e.target.value)}
                  className="border-zinc-200 bg-zinc-50"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-inv-min">Stock Mínimo</Label>
                <Input
                  id="edit-inv-min"
                  type="number"
                  step="0.01"
                  value={editMinStock}
                  onChange={(e) => setEditMinStock(e.target.value)}
                  className="border-zinc-200 bg-zinc-50"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-inv-cost">Costo Unitario ($)</Label>
                <Input
                  id="edit-inv-cost"
                  type="number"
                  step="0.01"
                  value={editUnitCost}
                  onChange={(e) => setEditUnitCost(e.target.value)}
                  className="border-zinc-200 bg-zinc-50"
                />
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
            <DialogTitle className="text-red-600">¿Eliminar Insumo del Almacén?</DialogTitle>
            <DialogDescription className="text-zinc-505">
              ¿Estás seguro de que deseas eliminar <strong>{selectedItem?.name}</strong>? Si este insumo está en alguna receta activa, podría causar inconsistencias. Esta acción no se puede deshacer.
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
              onClick={() => selectedItem && deleteMutation.mutate(selectedItem.id)}
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
