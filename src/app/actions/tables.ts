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

export async function getTables(overrideBusinessId?: string) {
  try {
    const { supabase, businessId, isSuperAdmin } = await checkMember()
    const targetBusinessId = isSuperAdmin && overrideBusinessId ? overrideBusinessId : businessId

    if (!targetBusinessId) {
      console.warn('getTables: Identificador de negocio no encontrado (posiblemente Superadmin sin overrideBusinessId)')
      return []
    }

    const { data, error } = await supabase
      .from('tables')
      .select('*')
      .eq('business_id', targetBusinessId)
      .order('table_number', { ascending: true })

    if (error) {
      console.error('getTables: Error en consulta de base de datos:', error.message)
      throw new Error(`Error en base de datos: ${error.message}`)
    }
    return data
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido al obtener mesas'
    console.error('getTables: Excepción atrapada:', message)
    throw new Error(message)
  }
}

export async function createTable(data: {
  table_number: number
  status: 'free' | 'occupied'
  overrideBusinessId?: string
}) {
  const { supabase, businessId, isSuperAdmin } = await checkAdmin()
  const targetBusinessId = isSuperAdmin && data.overrideBusinessId ? data.overrideBusinessId : businessId

  if (!targetBusinessId) throw new Error('Identificador de negocio no encontrado')

  const { data: table, error } = await supabase
    .from('tables')
    .insert({
      business_id: targetBusinessId,
      table_number: data.table_number,
      status: data.status
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/tables')
  return table
}

export async function updateTable(id: string, data: {
  table_number?: number
  status?: 'free' | 'occupied'
}) {
  const { supabase, businessId } = await checkAdmin()

  const query = supabase
    .from('tables')
    .update(data)
    .eq('id', id)

  if (businessId) {
    query.eq('business_id', businessId)
  }

  const { data: table, error } = await query.select().single()

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/tables')
  return table
}

export async function deleteTable(id: string) {
  const { supabase, businessId } = await checkAdmin()

  const query = supabase
    .from('tables')
    .delete()
    .eq('id', id)

  if (businessId) {
    query.eq('business_id', businessId)
  }

  const { error } = await query

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/tables')
  return { success: true }
}
