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

  return { supabase, businessId: profile.business_id, isSuperAdmin: profile.role === 'superadmin' }
}

export async function getInventoryItems(overrideBusinessId?: string) {
  const { supabase, businessId, isSuperAdmin } = await checkAdmin()
  const targetBusinessId = isSuperAdmin && overrideBusinessId ? overrideBusinessId : businessId

  if (!targetBusinessId) throw new Error('Identificador de negocio no encontrado')

  const { data, error } = await supabase
    .from('inventory_items')
    .select('*')
    .eq('business_id', targetBusinessId)
    .order('name', { ascending: true })

  if (error) throw new Error(error.message)
  return data
}

export async function createInventoryItem(data: {
  name: string
  unit: string
  current_stock: number
  min_stock: number
  unit_cost: number
  overrideBusinessId?: string
}) {
  const { supabase, businessId, isSuperAdmin } = await checkAdmin()
  const targetBusinessId = isSuperAdmin && data.overrideBusinessId ? data.overrideBusinessId : businessId

  if (!targetBusinessId) throw new Error('Identificador de negocio no encontrado')

  const { data: item, error } = await supabase
    .from('inventory_items')
    .insert({
      business_id: targetBusinessId,
      name: data.name,
      unit: data.unit,
      current_stock: data.current_stock,
      min_stock: data.min_stock,
      unit_cost: data.unit_cost
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/inventory')
  return item
}

export async function updateInventoryItem(id: string, data: {
  name?: string
  unit?: string
  current_stock?: number
  min_stock?: number
  unit_cost?: number
}) {
  const { supabase, businessId } = await checkAdmin()

  const query = supabase
    .from('inventory_items')
    .update(data)
    .eq('id', id)

  if (businessId) {
    query.eq('business_id', businessId)
  }

  const { data: item, error } = await query.select().single()

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/inventory')
  return item
}

export async function deleteInventoryItem(id: string) {
  const { supabase, businessId } = await checkAdmin()

  const query = supabase
    .from('inventory_items')
    .delete()
    .eq('id', id)

  if (businessId) {
    query.eq('business_id', businessId)
  }

  const { error } = await query

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/inventory')
  return { success: true }
}
