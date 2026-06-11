'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Security guard: verify user is authenticated and is a business staff member
async function checkAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, business_id')
    .eq('id', user.id)
    .single()

  if (!profile) {
    throw new Error('Usuario no registrado o sin perfil')
  }

  return { supabase, businessId: profile.business_id, role: profile.role, userId: user.id }
}

export async function getActiveAttendance() {
  try {
    const { supabase, userId } = await checkAuth()
    const { data, error } = await supabase
      .from('staff_attendance')
      .select('*')
      .eq('profile_id', userId)
      .is('clock_out', null)
      .maybeSingle()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error in getActiveAttendance:', error)
    return null
  }
}

export async function clockIn() {
  const { supabase, businessId, userId } = await checkAuth()
  if (!businessId) throw new Error('Identificador de negocio no encontrado')

  // Check if there is an active session or a session for today
  const todayStr = new Date().toISOString().split('T')[0]
  
  const { data: existing, error: existErr } = await supabase
    .from('staff_attendance')
    .select('id, clock_out')
    .eq('profile_id', userId)
    .eq('date', todayStr)
    .maybeSingle()

  if (existErr) {
    throw new Error(`Error de validación: ${existErr.message}`)
  }

  if (existing) {
    if (!existing.clock_out) {
      throw new Error('Ya tienes un turno activo iniciado hoy.')
    } else {
      throw new Error('Ya has registrado tu asistencia para el día de hoy.')
    }
  }

  // Also check globally if there's any active clock_in session that was not closed from previous days
  const { data: globalActive } = await supabase
    .from('staff_attendance')
    .select('id')
    .eq('profile_id', userId)
    .is('clock_out', null)
    .maybeSingle()

  if (globalActive) {
    throw new Error('Tienes un turno activo pendiente de cerrar de un día anterior. Por favor, marca la salida antes de iniciar uno nuevo.')
  }

  const { data, error } = await supabase
    .from('staff_attendance')
    .insert({
      profile_id: userId,
      business_id: businessId,
      date: todayStr,
      clock_in: new Date().toISOString(),
      clock_out: null,
      total_hours: null
    })
    .select()
    .single()

  if (error) throw new Error(`Error al registrar entrada: ${error.message}`)

  revalidatePath('/dashboard/staff')
  return data
}

export async function clockOut() {
  const { supabase, userId } = await checkAuth()

  // Find the active shift (clock_out is null)
  const { data: active, error: activeErr } = await supabase
    .from('staff_attendance')
    .select('*')
    .eq('profile_id', userId)
    .is('clock_out', null)
    .maybeSingle()

  if (activeErr || !active) {
    throw new Error('No tienes ningún turno activo para finalizar.')
  }

  const clockInTime = new Date(active.clock_in).getTime()
  const clockOutTime = new Date().getTime()
  const diffMs = clockOutTime - clockInTime
  const hours = diffMs / (1000 * 60 * 60)
  const roundedHours = Math.round(hours * 100) / 100 // Round to 2 decimal places

  const { data, error } = await supabase
    .from('staff_attendance')
    .update({
      clock_out: new Date().toISOString(),
      total_hours: roundedHours
    })
    .eq('id', active.id)
    .select()
    .single()

  if (error) throw new Error(`Error al registrar salida: ${error.message}`)

  revalidatePath('/dashboard/staff')
  return data
}

export async function getAttendanceReport(startDate?: string, endDate?: string) {
  const { supabase, businessId, role } = await checkAuth()
  if (!businessId || (role !== 'admin' && role !== 'superadmin')) {
    throw new Error('No autorizado para ver reportes de asistencia.')
  }

  let query = supabase
    .from('staff_attendance')
    .select(`
      *,
      profiles:profile_id (
        full_name,
        role
      )
    `)
    .eq('business_id', businessId)
    .order('date', { ascending: false })

  if (startDate) {
    query = query.gte('date', startDate)
  }
  if (endDate) {
    query = query.lte('date', endDate)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}
