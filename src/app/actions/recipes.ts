'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Security guard: verify user is Admin/Superadmin and return business_id
async function checkAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, business_id')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'admin' && profile.role !== 'superadmin')) {
    throw new Error('No autorizado: Se requieren privilegios de Administrador')
  }

  return { supabase, businessId: profile.business_id }
}

// Security guard: verify user is authenticated and get user profile
async function checkMember() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, business_id')
    .eq('id', user.id)
    .single()

  if (!profile) throw new Error('Usuario no registrado o sin perfil')

  return { supabase, businessId: profile.business_id }
}

export async function getRecipes() {
  try {
    const { supabase } = await checkMember()

    const { data, error } = await supabase
      .from('recipes')
      .select(`
        id,
        menu_item_id,
        inventory_item_id,
        quantity,
        inventory_items (
          name,
          unit
        )
      `)

    if (error) {
      console.error('getRecipes: Error en base de datos:', error.message)
      throw new Error(`Error en base de datos: ${error.message}`)
    }
    
    return data
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido al obtener recetas'
    console.error('getRecipes error:', message)
    throw new Error(message)
  }
}

export async function addRecipeIngredient(data: {
  menu_item_id: string
  inventory_item_id: string
  quantity: number
}) {
  try {
    const { supabase } = await checkAdmin()

    if (data.quantity <= 0) {
      throw new Error('La cantidad debe ser mayor a 0')
    }

    const { data: recipe, error } = await supabase
      .from('recipes')
      .insert({
        menu_item_id: data.menu_item_id,
        inventory_item_id: data.inventory_item_id,
        quantity: data.quantity
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        throw new Error('Este ingrediente ya está registrado para este plato')
      }
      throw new Error(error.message)
    }

    revalidatePath('/dashboard/recipes')
    return recipe
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al agregar ingrediente'
    console.error('addRecipeIngredient error:', message)
    throw new Error(message)
  }
}

export async function deleteRecipeIngredient(id: string) {
  try {
    const { supabase } = await checkAdmin()

    const { error } = await supabase
      .from('recipes')
      .delete()
      .eq('id', id)

    if (error) throw new Error(error.message)

    revalidatePath('/dashboard/recipes')
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al eliminar ingrediente'
    console.error('deleteRecipeIngredient error:', message)
    throw new Error(message)
  }
}
