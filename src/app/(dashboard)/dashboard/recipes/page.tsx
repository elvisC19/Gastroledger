'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getMenuItems } from '@/app/actions/menu'
import { getInventoryItems } from '@/app/actions/inventory'
import { getRecipes, addRecipeIngredient, deleteRecipeIngredient } from '@/app/actions/recipes'
import { Card, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  BookOpen,
  Plus,
  Trash2,
  Search,
  Loader2,
  UtensilsCrossed,
  Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'

interface MenuItemType {
  id: string
  name: string
  price: number
  category: string
  image_url?: string | null
}

interface InventoryItemType {
  id: string
  name: string
  unit: string
  current_stock: number
}

interface RecipeType {
  id: string
  menu_item_id: string
  inventory_item_id: string
  quantity: number
  inventory_items: {
    name: string
    unit: string
  } | {
    name: string
    unit: string
  }[] | null
}

export default function RecipesPage() {
  const queryClient = useQueryClient()

  const getIngredientName = (ing: RecipeType) => {
    if (!ing.inventory_items) return ''
    if (Array.isArray(ing.inventory_items)) {
      return ing.inventory_items[0]?.name || ''
    }
    return ing.inventory_items.name || ''
  }

  const getIngredientUnit = (ing: RecipeType) => {
    if (!ing.inventory_items) return ''
    if (Array.isArray(ing.inventory_items)) {
      return ing.inventory_items[0]?.unit || ''
    }
    return ing.inventory_items.unit || ''
  }
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('todos')
  
  // Modal State
  const [selectedItem, setSelectedItem] = useState<MenuItemType | null>(null)
  const [newIngredientId, setNewIngredientId] = useState('')
  const [newQuantity, setNewQuantity] = useState('1.00')

  // Queries
  const { data: menuItems = [], isLoading: loadingMenu } = useQuery<MenuItemType[], Error>({
    queryKey: ['recipes-menu'],
    queryFn: () => getMenuItems() as Promise<MenuItemType[]>,
  })

  const { data: inventoryItems = [], isLoading: loadingInventory } = useQuery<InventoryItemType[], Error>({
    queryKey: ['recipes-inventory'],
    queryFn: () => getInventoryItems() as Promise<InventoryItemType[]>,
  })

  const { data: recipes = [], isLoading: loadingRecipes } = useQuery<RecipeType[], Error>({
    queryKey: ['recipes-list'],
    queryFn: () => getRecipes() as Promise<RecipeType[]>,
  })

  // Mutations
  const addIngredientMutation = useMutation({
    mutationFn: addRecipeIngredient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes-list'] })
      setNewIngredientId('')
      setNewQuantity('1.00')
      toast.success('Ingrediente agregado a la receta')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Error al agregar ingrediente')
    }
  })

  const deleteIngredientMutation = useMutation({
    mutationFn: deleteRecipeIngredient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes-list'] })
      toast.success('Ingrediente eliminado de la receta')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Error al eliminar ingrediente')
    }
  })

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

  // Filtered menu items
  const filteredMenuItems = menuItems.filter(item => {
    const matchesCategory = selectedCategory === 'todos' || item.category === selectedCategory
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  // Find recipes for selected menu item
  const currentRecipeIngredients = selectedItem
    ? recipes.filter(r => r.menu_item_id === selectedItem.id)
    : []

  // Filter inventory items to only show those NOT already in the recipe
  const availableInventoryItems = inventoryItems.filter(inv => 
    !currentRecipeIngredients.some(rec => rec.inventory_item_id === inv.id)
  )

  const handleAddIngredient = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedItem || !newIngredientId) return
    const qty = parseFloat(newQuantity)
    if (isNaN(qty) || qty <= 0) {
      toast.error('Ingresa una cantidad válida mayor a 0')
      return
    }

    addIngredientMutation.mutate({
      menu_item_id: selectedItem.id,
      inventory_item_id: newIngredientId,
      quantity: qty
    })
  }

  const handleCloseModal = () => {
    setSelectedItem(null)
    setNewIngredientId('')
    setNewQuantity('1.00')
  }

  return (
    <div className="space-y-6 font-[family-name:var(--font-inter)] text-zinc-900 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-black font-[family-name:var(--font-sora)] tracking-tight">Recetas de Platos</h1>
          <p className="text-sm text-zinc-500">
            Vincula tus platos y bebidas con los insumos correspondientes para descontar stock automáticamente al vender.
          </p>
        </div>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-white p-4 rounded-2xl border border-zinc-100 shadow-sm shrink-0">
        <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-none w-full md:w-auto">
          {categoriesList.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`rounded-xl px-4 py-2 text-xs font-bold whitespace-nowrap transition-all border cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-amber-500 text-black border-amber-500 shadow-sm'
                  : 'bg-white text-zinc-500 border-zinc-200 hover:bg-zinc-50'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar platos..."
            className="pl-9 border-zinc-200 bg-white text-zinc-900 placeholder-zinc-400 focus-visible:ring-amber-500 focus-visible:border-amber-500"
          />
        </div>
      </div>

      {/* Main Grid */}
      {loadingMenu || loadingRecipes || loadingInventory ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-64 bg-white border border-zinc-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filteredMenuItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border border-dashed border-zinc-200 bg-white rounded-2xl text-center p-8 space-y-3">
          <Sparkles className="h-10 w-10 text-zinc-300" />
          <h3 className="font-bold text-zinc-700">No se encontraron platos</h3>
          <p className="text-xs text-zinc-450 max-w-sm">
            Prueba ajustando los filtros de categorías o el término de búsqueda de platos.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredMenuItems.map((item) => {
            const itemRecipes = recipes.filter(r => r.menu_item_id === item.id)
            const ingredientCount = itemRecipes.length
            const hasRecipe = ingredientCount > 0

            return (
              <Card
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className="border-zinc-150 bg-white hover:border-amber-500/35 cursor-pointer transition-all shadow-sm hover:shadow-md flex flex-col justify-between overflow-hidden group"
              >
                <div>
                  {/* Image Header */}
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
                      <UtensilsCrossed className="h-8 w-8 text-zinc-350 stroke-[1.5]" />
                    </div>
                  )}

                  {/* Body */}
                  <CardHeader className="p-5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-wider text-amber-600 font-extrabold">
                        {categoryLabels[item.category] || item.category}
                      </span>
                      {hasRecipe ? (
                        <span className="inline-block rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold">
                          {ingredientCount} {ingredientCount === 1 ? 'ingrediente' : 'ingredientes'}
                        </span>
                      ) : (
                        <span className="inline-block rounded-full bg-zinc-50 text-zinc-400 border border-zinc-200 px-2 py-0.5 text-[10px] font-bold">
                          Sin receta
                        </span>
                      )}
                    </div>
                    <CardTitle className="text-base font-bold text-zinc-800 font-[family-name:var(--font-sora)] group-hover:text-zinc-950 line-clamp-2">
                      {item.name}
                    </CardTitle>
                  </CardHeader>
                </div>

                {/* Footer */}
                <CardFooter className="p-5 pt-0 flex items-center justify-between border-t border-zinc-50 bg-zinc-50/10">
                  <span className="text-base font-black text-zinc-900">Bs. {Number(item.price).toFixed(2)}</span>
                  <Button
                    size="sm"
                    className="bg-zinc-900 text-white hover:bg-zinc-850 font-bold text-xs rounded-xl cursor-pointer"
                  >
                    <BookOpen className="h-3.5 w-3.5 mr-1.5" /> Configurar
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}

      {/* Edit Recipe Modal */}
      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && handleCloseModal()}>
        <DialogContent className="border-zinc-200 bg-white text-zinc-900 max-w-md overflow-y-auto max-h-[90vh]">
          {selectedItem && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg font-[family-name:var(--font-sora)] font-bold text-zinc-950 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-amber-500" />
                  Receta: {selectedItem.name}
                </DialogTitle>
                <DialogDescription className="text-zinc-500 text-xs">
                  Agrega los ingredientes del inventario que componen este plato.
                </DialogDescription>
              </DialogHeader>

              {/* Assigned Ingredients */}
              <div className="space-y-3 py-2 border-t border-b border-zinc-100 my-2">
                <h4 className="text-xs uppercase font-bold tracking-wider text-zinc-500">Ingredientes Asignados</h4>
                {currentRecipeIngredients.length === 0 ? (
                  <div className="text-center py-6 bg-zinc-50/50 rounded-2xl border border-dashed border-zinc-150 text-zinc-400 text-xs p-4">
                    Esta receta no tiene ingredientes asignados aún.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {currentRecipeIngredients.map((ing) => (
                      <div
                        key={ing.id}
                        className="flex items-center justify-between p-3 rounded-xl border border-zinc-100 bg-zinc-50/20"
                      >
                        <div className="text-sm">
                          <span className="font-bold text-zinc-800">{getIngredientName(ing)}</span>
                          <span className="text-xs text-zinc-500 block">
                            Cantidad: {Number(ing.quantity).toFixed(2)} {getIngredientUnit(ing)}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteIngredientMutation.mutate(ing.id)}
                          disabled={deleteIngredientMutation.isPending}
                          className="text-zinc-400 hover:text-red-650 hover:bg-red-50 rounded-lg cursor-pointer h-8 w-8"
                          title="Eliminar de la receta"
                        >
                          {deleteIngredientMutation.isPending ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add New Ingredient Form */}
              <form onSubmit={handleAddIngredient} className="space-y-4 pt-1">
                <h4 className="text-xs uppercase font-bold tracking-wider text-zinc-500">Agregar Ingrediente</h4>
                
                <div className="grid grid-cols-3 gap-3">
                  {/* Item selector */}
                  <div className="col-span-2 space-y-1">
                    <Label htmlFor="ingredientId" className="text-xs font-bold text-zinc-700">Insumo del Inventario</Label>
                    <select
                      id="ingredientId"
                      value={newIngredientId}
                      onChange={(e) => setNewIngredientId(e.target.value)}
                      required
                      className="w-full text-xs rounded-lg border border-zinc-200 p-2.5 bg-white text-zinc-900 focus-visible:ring-amber-500 focus-visible:border-amber-500 outline-none"
                    >
                      <option value="">Selecciona un insumo...</option>
                      {availableInventoryItems.map((inv) => (
                        <option key={inv.id} value={inv.id}>
                          {inv.name} ({inv.unit})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Quantity input */}
                  <div className="space-y-1">
                    <Label htmlFor="ingredientQty" className="text-xs font-bold text-zinc-700">Cantidad</Label>
                    <Input
                      id="ingredientQty"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={newQuantity}
                      onChange={(e) => setNewQuantity(e.target.value)}
                      required
                      className="text-xs border-zinc-200 focus-visible:ring-amber-500 focus-visible:border-amber-500 bg-white"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-zinc-100">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseModal}
                    className="border-zinc-200 text-zinc-500 hover:bg-zinc-50 cursor-pointer text-xs rounded-xl"
                  >
                    Cerrar
                  </Button>
                  <Button
                    type="submit"
                    disabled={addIngredientMutation.isPending || !newIngredientId}
                    className="bg-amber-500 text-black hover:bg-amber-600 font-bold text-xs rounded-xl cursor-pointer"
                  >
                    {addIngredientMutation.isPending ? (
                      <>
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        Agregando...
                      </>
                    ) : (
                      <>
                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                        Agregar
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
