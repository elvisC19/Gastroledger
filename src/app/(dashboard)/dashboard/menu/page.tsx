'use client'

import { useState } from 'react'
import * as z from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem
} from '@/app/actions/menu'
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
  UtensilsCrossed,
  Tag
} from 'lucide-react'
import { toast } from 'sonner'

interface MenuItemType {
  id: string
  name: string
  price: number
  category: string
  description: string | null
  image_url: string | null
}

export default function MenuManagement() {
  const queryClient = useQueryClient()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<MenuItemType | null>(null)
  const [activeCategory, setActiveCategory] = useState<string>('todos')

  // Form states for creation
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [category, setCategory] = useState('plato-fondo')
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState('')

  // Form states for editing
  const [editName, setEditName] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editImageUrl, setEditImageUrl] = useState('')

  // Queries
  const { data: menuItems, isLoading, isError, error } = useQuery<MenuItemType[], Error>({
    queryKey: ['menu-items'],
    queryFn: () => getMenuItems() as Promise<MenuItemType[]>,
  })

  // Mutations
  const createMutation = useMutation({
    mutationFn: createMenuItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-items'] })
      toast.success('Plato/Bebida agregado a la carta correctamente')
      setIsCreateOpen(false)
      // Reset form
      setName('')
      setPrice('')
      setDescription('')
      setImageUrl('')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Error al agregar elemento')
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Omit<MenuItemType, 'id'>> }) => updateMenuItem(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-items'] })
      toast.success('Plato/Bebida actualizado correctamente')
      setIsEditOpen(false)
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Error al actualizar elemento')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: deleteMenuItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-items'] })
      toast.success('Plato/Bebida eliminado correctamente')
      setIsDeleteOpen(false)
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Error al eliminar elemento')
    }
  })

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const menuItemSchema = z.object({
      name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
      price: z.number({ message: 'El precio debe ser un número' }).positive('El precio debe ser un número positivo'),
      category: z.string().min(1, 'La categoría es obligatoria'),
      description: z.string().optional(),
      image_url: z.union([z.string().url('El formato de la imagen debe ser una URL válida'), z.string().length(0)]).optional()
    })

    const parsedPrice = parseFloat(price)
    const parsed = menuItemSchema.safeParse({
      name,
      price: isNaN(parsedPrice) ? undefined : parsedPrice,
      category,
      description,
      image_url: imageUrl
    })

    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message)
      return
    }

    createMutation.mutate({
      name,
      price: parsedPrice,
      category,
      description,
      image_url: imageUrl || undefined
    })
  }

  const handleEditClick = (item: MenuItemType) => {
    setSelectedItem(item)
    setEditName(item.name)
    setEditPrice(item.price.toString())
    setEditCategory(item.category)
    setEditDescription(item.description || '')
    setEditImageUrl(item.image_url || '')
    setIsEditOpen(true)
  }

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedItem) return

    const menuItemSchema = z.object({
      name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
      price: z.number({ message: 'El precio debe ser un número' }).positive('El precio debe ser un número positivo'),
      category: z.string().min(1, 'La categoría es obligatoria'),
      description: z.string().optional(),
      image_url: z.union([z.string().url('El formato de la imagen debe ser una URL válida'), z.string().length(0)]).optional().nullable()
    })

    const parsedPrice = parseFloat(editPrice)
    const parsed = menuItemSchema.safeParse({
      name: editName,
      price: isNaN(parsedPrice) ? undefined : parsedPrice,
      category: editCategory,
      description: editDescription,
      image_url: editImageUrl
    })

    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message)
      return
    }

    updateMutation.mutate({
      id: selectedItem.id,
      updates: {
        name: editName,
        price: parsedPrice,
        category: editCategory,
        description: editDescription,
        image_url: editImageUrl || null
      }
    })
  }

  const handleDeleteClick = (item: MenuItemType) => {
    setSelectedItem(item)
    setIsDeleteOpen(true)
  }

  // Predefined Categories
  const categoriesList = [
    { id: 'todos', name: 'Todos' },
    { id: 'plato-fondo', name: 'Platos de Fondo' },
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

  const filteredItems = menuItems && activeCategory !== 'todos'
    ? menuItems.filter((item) => item.category === activeCategory)
    : menuItems

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Carta / Menú</h1>
          <p className="text-slate-400 mt-1">Gestiona los platos y bebidas que ofreces a tus clientes.</p>
        </div>
        <Button
          onClick={() => setIsCreateOpen(true)}
          className="bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-600 self-start"
        >
          <Plus className="mr-2 h-4 w-4" /> Agregar Plato / Bebida
        </Button>
      </div>

      {/* Category filters */}
      <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-none">
        {categoriesList.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`rounded-xl px-4 py-2 text-xs font-semibold whitespace-nowrap transition-all border ${
              activeCategory === cat.id
                ? 'bg-emerald-500 text-slate-950 border-emerald-500 shadow-md shadow-emerald-500/10'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
        </div>
      ) : isError ? (
        <div className="rounded-lg bg-red-500/10 p-4 text-center text-sm text-red-400 border border-red-500/20">
          Error al cargar la carta: {error.message}
        </div>
      ) : filteredItems?.length === 0 ? (
        <div className="p-16 border border-dashed border-slate-800 rounded-2xl text-center text-slate-500">
          <UtensilsCrossed className="h-10 w-10 text-slate-750 mx-auto mb-4" />
          <p className="text-sm font-semibold">No se encontraron ítems en esta categoría</p>
          <p className="text-xs text-slate-650 mt-1">
            Puedes agregar un nuevo elemento haciendo clic en el botón de arriba.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredItems?.map((item) => (
            <Card
              key={item.id}
              className="border-slate-800 bg-slate-900/40 relative overflow-hidden transition-all flex flex-col justify-between group hover:border-slate-700"
            >
              {/* Image slot */}
              <div className="h-40 w-full bg-slate-950/80 border-b border-slate-800/60 relative flex items-center justify-center text-slate-650 overflow-hidden">
                {item.image_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="object-cover h-full w-full group-hover:scale-105 transition-all duration-300"
                  />
                ) : (
                  <UtensilsCrossed className="h-12 w-12 text-slate-800" />
                )}
                {/* Price chip */}
                <span className="absolute top-3 right-3 bg-slate-900/90 text-white text-sm font-black tracking-tight px-3 py-1 rounded-lg border border-slate-800 backdrop-blur-md">
                  ${item.price.toFixed(2)}
                </span>
              </div>

              <div>
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center space-x-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                    <Tag className="h-3 w-3" />
                    <span>{categoryLabels[item.category]}</span>
                  </div>
                  <CardTitle className="text-base text-slate-200 mt-1">{item.name}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 py-0">
                  <p className="text-xs text-slate-400 line-clamp-2 min-h-[32px] leading-relaxed">
                    {item.description || 'Sin descripción disponible.'}
                  </p>
                </CardContent>
              </div>

              <CardFooter className="p-4 pt-4 border-t border-slate-800/40 mt-4 flex items-center justify-end space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEditClick(item)}
                  className="h-8 text-slate-455 hover:text-slate-100 hover:bg-slate-800"
                >
                  <Edit2 className="h-3.5 w-3.5 mr-1" /> Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteClick(item)}
                  className="h-8 text-slate-455 hover:text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Eliminar
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* DIALOG: CREATE ITEM */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="border-slate-800 bg-slate-900 text-slate-100">
          <DialogHeader>
            <DialogTitle>Agregar Elemento al Menú</DialogTitle>
            <DialogDescription className="text-slate-400">
              Ingresa los detalles del nuevo plato o bebida para la carta.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="item-name">Nombre *</Label>
                <Input
                  id="item-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Lomo Saltado"
                  className="border-slate-800 bg-slate-950/50"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="item-price">Precio ($) *</Label>
                <Input
                  id="item-price"
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="Ej. 28.50"
                  className="border-slate-800 bg-slate-950/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="item-category">Categoría</Label>
                <Select
                  value={category}
                  onValueChange={(val) => setCategory(val || 'plato-fondo')}
                >
                  <SelectTrigger className="border-slate-800 bg-slate-950/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-slate-800 bg-slate-900 text-slate-100">
                    <SelectItem value="plato-fondo">Plato de Fondo</SelectItem>
                    <SelectItem value="entradas">Entrada</SelectItem>
                    <SelectItem value="bebidas">Bebida</SelectItem>
                    <SelectItem value="postres">Postre</SelectItem>
                    <SelectItem value="otros">Otros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="item-img">URL de Imagen</Label>
                <Input
                  id="item-img"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://ejemplo.com/foto.jpg"
                  className="border-slate-800 bg-slate-950/50"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="item-desc">Descripción</Label>
              <Input
                id="item-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ingredientes clave o preparación..."
                className="border-slate-800 bg-slate-950/50"
              />
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
                    Agregando...
                  </>
                ) : (
                  'Agregar Plato'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG: EDIT ITEM */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="border-slate-800 bg-slate-900 text-slate-100">
          <DialogHeader>
            <DialogTitle>Editar Elemento del Menú</DialogTitle>
            <DialogDescription className="text-slate-400">
              Modifica la información comercial del plato o bebida.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="edit-item-name">Nombre</Label>
                <Input
                  id="edit-item-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="border-slate-800 bg-slate-950/50"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-item-price">Precio ($)</Label>
                <Input
                  id="edit-item-price"
                  type="number"
                  step="0.01"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  className="border-slate-800 bg-slate-950/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="edit-item-category">Categoría</Label>
                <Select
                  value={editCategory}
                  onValueChange={(val) => setEditCategory(val || '')}
                >
                  <SelectTrigger className="border-slate-800 bg-slate-950/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-slate-800 bg-slate-900 text-slate-100">
                    <SelectItem value="plato-fondo">Plato de Fondo</SelectItem>
                    <SelectItem value="entradas">Entrada</SelectItem>
                    <SelectItem value="bebidas">Bebida</SelectItem>
                    <SelectItem value="postres">Postre</SelectItem>
                    <SelectItem value="otros">Otros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-item-img">URL de Imagen</Label>
                <Input
                  id="edit-item-img"
                  value={editImageUrl}
                  onChange={(e) => setEditImageUrl(e.target.value)}
                  className="border-slate-800 bg-slate-950/50"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="edit-item-desc">Descripción</Label>
              <Input
                id="edit-item-desc"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="border-slate-800 bg-slate-950/50"
              />
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
            <DialogTitle className="text-red-400">¿Quitar Plato/Bebida?</DialogTitle>
            <DialogDescription className="text-slate-400">
              ¿Estás seguro de que deseas eliminar <strong>{selectedItem?.name}</strong> de la carta? Esta acción no se puede deshacer.
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
              onClick={() => selectedItem && deleteMutation.mutate(selectedItem.id)}
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
