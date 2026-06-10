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

  // If superadmin but no business_id, they must specify one, otherwise we return their profile business_id
  return { supabase, businessId: profile.business_id, isSuperAdmin: profile.role === 'superadmin' }
}

// Security guard: verify user is a business staff member and return business_id
async function checkMember() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, business_id')
    .eq('id', user.id)
    .single()

  if (!profile) {
    throw new Error('No autorizado: Perfil no encontrado')
  }

  return { supabase, businessId: profile.business_id, isSuperAdmin: profile.role === 'superadmin' }
}

export async function getMenuItems(overrideBusinessId?: string) {
  try {
    const { supabase, businessId, isSuperAdmin } = await checkMember()
    const targetBusinessId = isSuperAdmin && overrideBusinessId ? overrideBusinessId : businessId

    if (!targetBusinessId) {
      console.warn('getMenuItems: Identificador de negocio no encontrado (posiblemente Superadmin sin overrideBusinessId)')
      return []
    }

    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('business_id', targetBusinessId)
      .order('category', { ascending: true })
      .order('name', { ascending: true })

    if (error) {
      console.error('getMenuItems: Error en consulta de base de datos:', error.message)
      throw new Error(`Error en base de datos: ${error.message}`)
    }
    return data
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido al obtener menú'
    console.error('getMenuItems: Excepción atrapada:', message)
    throw new Error(message)
  }
}

export async function createMenuItem(data: {
  name: string
  price: number
  category: string
  description?: string
  image_url?: string
  overrideBusinessId?: string
}) {
  const { supabase, businessId, isSuperAdmin } = await checkAdmin()
  const targetBusinessId = isSuperAdmin && data.overrideBusinessId ? data.overrideBusinessId : businessId

  if (!targetBusinessId) throw new Error('Identificador de negocio no encontrado')

  const { data: item, error } = await supabase
    .from('menu_items')
    .insert({
      business_id: targetBusinessId,
      name: data.name,
      price: data.price,
      category: data.category,
      description: data.description,
      image_url: data.image_url
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/menu')
  return item
}

export async function updateMenuItem(id: string, data: {
  name?: string
  price?: number
  category?: string
  description?: string | null
  image_url?: string | null
}) {
  const { supabase, businessId } = await checkAdmin()

  // Ensure item belongs to the user's business (unless superadmin)
  const query = supabase
    .from('menu_items')
    .update(data)
    .eq('id', id)

  if (businessId) {
    query.eq('business_id', businessId)
  }

  const { data: item, error } = await query.select().single()

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/menu')
  return item
}

export async function deleteMenuItem(id: string) {
  const { supabase, businessId } = await checkAdmin()

  const query = supabase
    .from('menu_items')
    .delete()
    .eq('id', id)

  if (businessId) {
    query.eq('business_id', businessId)
  }

  const { error } = await query

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/menu')
  return { success: true }
}
