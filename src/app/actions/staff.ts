'use server'

import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Security guard: verify user is Admin/Superadmin and return business_id
async function checkAdmin() {
  const supabase = await createServerClient()
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

export async function getStaff(overrideBusinessId?: string) {
  const { supabase, businessId, isSuperAdmin } = await checkAdmin()
  const targetBusinessId = isSuperAdmin && overrideBusinessId ? overrideBusinessId : businessId

  if (!targetBusinessId) throw new Error('Identificador de negocio no encontrado')

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('business_id', targetBusinessId)
    .neq('role', 'superadmin') // Exclude superadmins
    .order('role', { ascending: true })
    .order('full_name', { ascending: true })

  if (error) throw new Error(error.message)
  return data
}

export async function createStaffUser(data: {
  email: string
  pass: string
  fullName: string
  role: 'admin' | 'cashier' | 'waiter' | 'cook'
  overrideBusinessId?: string
}) {
  const { businessId, isSuperAdmin } = await checkAdmin()
  const targetBusinessId = isSuperAdmin && data.overrideBusinessId ? data.overrideBusinessId : businessId

  if (!targetBusinessId) throw new Error('Identificador de negocio no encontrado')

  // Create user in Auth
  const { data: userNew, error: uErr } = await supabaseAdmin.auth.admin.createUser({
    email: data.email,
    password: data.pass,
    email_confirm: true,
    user_metadata: {
      role: data.role,
      full_name: data.fullName,
      business_id: targetBusinessId
    }
  })

  if (uErr) throw new Error(`Error creando usuario de personal: ${uErr.message}`)

  revalidatePath('/dashboard/staff')
  return userNew.user
}

export async function updateStaffUser(id: string, data: {
  fullName?: string
  role?: 'admin' | 'cashier' | 'waiter' | 'cook'
}) {
  const { supabase, businessId } = await checkAdmin()

  // Verify employee profile exists and belongs to the same business
  const { data: profileCheck } = await supabase
    .from('profiles')
    .select('business_id')
    .eq('id', id)
    .single()

  if (!profileCheck || (businessId && profileCheck.business_id !== businessId)) {
    throw new Error('Personal no encontrado en tu negocio')
  }

  // 1. Update Auth metadata if role or name changes
  const metaUpdates: Record<string, string> = {}
  if (data.role) metaUpdates.role = data.role
  if (data.fullName) metaUpdates.full_name = data.fullName

  if (Object.keys(metaUpdates).length > 0) {
    const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(id, {
      user_metadata: metaUpdates
    })
    if (authErr) throw new Error(`Error actualizando metadatos auth: ${authErr.message}`)
  }

  // 2. Update Database profile row
  const dbUpdates: Record<string, string | Date | null> = { updated_at: new Date().toISOString() }
  if (data.fullName) dbUpdates.full_name = data.fullName
  if (data.role) dbUpdates.role = data.role

  const { data: profile, error } = await supabase
    .from('profiles')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/staff')
  return profile
}

export async function deleteStaffUser(id: string) {
  const { supabase, businessId } = await checkAdmin()

  // Verify employee profile exists and belongs to same business
  const { data: profileCheck } = await supabase
    .from('profiles')
    .select('business_id, role')
    .eq('id', id)
    .single()

  if (!profileCheck || (businessId && profileCheck.business_id !== businessId)) {
    throw new Error('Personal no encontrado en tu negocio')
  }

  if (profileCheck.role === 'admin' && !businessId) {
    // If superadmin deletes an admin, that is fine, but admins shouldn't delete themselves (handled client side)
  }

  // Delete from Supabase Auth (trigger cascade will delete profiles)
  const { error } = await supabaseAdmin.auth.admin.deleteUser(id)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/staff')
  return { success: true }
}

export async function getGlobalUsers() {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No autenticado')

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'superadmin') {
      throw new Error('No autorizado: Se requiere rol Superadmin')
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*, businesses(name)')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('getGlobalUsers: Error en consulta de base de datos:', error.message)
      throw new Error(error.message)
    }
    return data
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido al obtener usuarios globales'
    console.error('getGlobalUsers: Excepción atrapada:', message)
    throw new Error(message)
  }
}

export async function createGlobalUser(data: {
  email: string
  pass: string
  fullName: string
  role: 'superadmin' | 'admin' | 'cashier' | 'waiter' | 'cook'
  businessId: string | null
}) {
  try {
    // Check superadmin authorization
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No autenticado')

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'superadmin') {
      throw new Error('No autorizado: Se requiere rol Superadmin')
    }

    // Create user in Auth
    const { data: userNew, error: uErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.pass,
      email_confirm: true,
      user_metadata: {
        role: data.role,
        full_name: data.fullName,
        business_id: data.role === 'superadmin' ? null : data.businessId
      }
    })

    if (uErr) {
      console.error('createGlobalUser: Error de Supabase Auth:', uErr.message)
      throw new Error(`Error creando usuario global: ${uErr.message}`)
    }

    revalidatePath('/superadmin/dashboard')
    return userNew.user
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido al crear usuario global'
    console.error('createGlobalUser: Excepción atrapada:', message)
    throw new Error(message)
  }
}
