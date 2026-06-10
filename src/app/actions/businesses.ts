'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

// Special client with bypass privileges for auth user creation
function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

// Security guard: verify user is superadmin
async function checkSuperAdmin() {
  const supabase = await createClient()
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

  return supabase
}

export async function getBusinesses() {
  await checkSuperAdmin()
  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('businesses')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data
}

export async function createBusinessWithAdmin(data: {
  name: string
  type: 'cafeteria' | 'restaurante' | 'polleria'
  subscription_plan: 'essential' | 'pro' | 'premium'
  address: string
  adminEmail: string
  adminPass: string
  adminName: string
}) {
  await checkSuperAdmin()
  const adminClient = createAdminClient()

  // 1. Create Business
  const { data: business, error: bErr } = await adminClient
    .from('businesses')
    .insert({
      name: data.name,
      type: data.type,
      subscription_plan: data.subscription_plan,
      address: data.address
    })
    .select()
    .single()

  if (bErr) throw new Error(`Error creando negocio: ${bErr.message}`)

  // 2. Create associated Admin user
  const { data: userNew, error: uErr } = await adminClient.auth.admin.createUser({
    email: data.adminEmail,
    password: data.adminPass,
    email_confirm: true,
    user_metadata: {
      role: 'admin',
      full_name: data.adminName,
      business_id: business.id
    }
  })

  if (uErr) {
    // Transactional rollback: delete the business if user creation fails
    await adminClient.from('businesses').delete().eq('id', business.id)
    throw new Error(`Error creando usuario administrador: ${uErr.message}`)
  }

  revalidatePath('/superadmin/dashboard')
  return { business, user: userNew.user }
}

export async function updateBusiness(id: string, updates: {
  name?: string
  type?: 'cafeteria' | 'restaurante' | 'polleria'
  subscription_plan?: 'essential' | 'pro' | 'premium'
  address?: string | null
  status?: 'active' | 'inactive' | 'suspended'
}) {
  await checkSuperAdmin()
  const adminClient = createAdminClient()

  const { data, error } = await adminClient
    .from('businesses')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/superadmin/dashboard')
  return data
}

export async function deleteBusiness(id: string) {
  await checkSuperAdmin()
  const adminClient = createAdminClient()

  // Find all profiles in the business first to delete their Auth users too!
  const { data: profiles } = await adminClient
    .from('profiles')
    .select('id')
    .eq('business_id', id)

  // Delete auth users
  if (profiles && profiles.length > 0) {
    for (const p of profiles) {
      await adminClient.auth.admin.deleteUser(p.id)
    }
  }

  // Delete business (cascade will delete profiles & data, but delete users first is safe)
  const { error } = await adminClient
    .from('businesses')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/superadmin/dashboard')
  return { success: true }
}

export async function getPlans() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .order('price', { ascending: true })

  if (error) throw new Error(error.message)
  return data
}

export async function updatePlanPrice(id: string, price: number) {
  // Enforce superadmin authorization
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'superadmin') {
    throw new Error('No autorizado: Se requieren privilegios de Superadministrador')
  }

  const adminClient = createAdminClient()

  const { data, error } = await adminClient
    .from('plans')
    .update({ price })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/superadmin/dashboard')
  return data
}
