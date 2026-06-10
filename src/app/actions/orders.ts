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

export async function getOrders(statusFilters?: string[]) {
  try {
    const { supabase, businessId } = await checkAuth()
    if (!businessId) {
      console.warn('getOrders: Identificador de negocio no encontrado')
      return []
    }

    let query = supabase
      .from('orders')
      .select(`
        *,
        tables (table_number),
        order_details (
          *,
          menu_items (name, category)
        ),
        profiles (full_name)
      `)
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })

    if (statusFilters && statusFilters.length > 0) {
      query = query.in('status', statusFilters)
    }

    const { data, error } = await query
    if (error) {
      console.error('getOrders: Error en consulta de base de datos:', error.message)
      throw new Error(`Error en base de datos: ${error.message}`)
    }
    return data
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido al obtener pedidos'
    console.error('getOrders: Excepción atrapada:', message)
    throw new Error(message)
  }
}

export async function createOrder(data: {
  table_id: string
  items: { menu_item_id: string; quantity: number; price_at_time: number }[]
}) {
  const { supabase, businessId, userId } = await checkAuth()
  if (!businessId) throw new Error('Identificador de negocio no encontrado')
  if (data.items.length === 0) throw new Error('El pedido no puede estar vacío')

  // Calculate order total
  const total = data.items.reduce((sum, item) => sum + (item.price_at_time * item.quantity), 0)

  // 1. Create order
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .insert({
      business_id: businessId,
      table_id: data.table_id,
      user_id: userId,
      status: 'pending',
      total: total
    })
    .select()
    .single()

  if (orderErr) throw new Error(`Error al crear pedido: ${orderErr.message}`)

  // 2. Insert order details
  const detailRows = data.items.map((item) => ({
    order_id: order.id,
    menu_item_id: item.menu_item_id,
    quantity: item.quantity,
    price_at_time: item.price_at_time,
    status: 'pending'
  }))

  const { error: detailsErr } = await supabase
    .from('order_details')
    .insert(detailRows)

  if (detailsErr) {
    // Rollback order creation if details insert fails
    await supabase.from('orders').delete().eq('id', order.id)
    throw new Error(`Error al registrar detalles: ${detailsErr.message}`)
  }

  // 3. Mark Table as occupied
  const { error: tableErr } = await supabase
    .from('tables')
    .update({ status: 'occupied' })
    .eq('id', data.table_id)

  if (tableErr) {
    console.error('Failed to update table status:', tableErr.message)
  }

  revalidatePath('/pos')
  revalidatePath('/kitchen')
  return order
}

export async function updateKitchenStatus(orderId: string, status: 'pending' | 'preparing' | 'ready') {
  const { supabase, businessId } = await checkAuth()
  if (!businessId) throw new Error('No autorizado')

  // Verify business ownership
  const { data: orderCheck } = await supabase
    .from('orders')
    .select('id')
    .eq('id', orderId)
    .eq('business_id', businessId)
    .single()

  if (!orderCheck) throw new Error('Pedido no encontrado')

  // Update order status
  const { data, error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId)
    .select()
    .single()

  if (error) throw new Error(error.message)

  // If order status is ready, set all item statuses to ready as well
  if (status === 'ready') {
    await supabase
      .from('order_details')
      .update({ status: 'ready' })
      .eq('order_id', orderId)
  }

  revalidatePath('/kitchen')
  revalidatePath('/pos')
  return data
}

export async function updateOrderItemStatus(detailId: string, status: 'pending' | 'ready') {
  const { supabase, businessId } = await checkAuth()
  if (!businessId) throw new Error('No autorizado')

  // Fetch detail row and verify it belongs to this business
  const { data: detail, error: fetchErr } = await supabase
    .from('order_details')
    .select('*, orders(*)')
    .eq('id', detailId)
    .single()

  if (fetchErr || !detail) throw new Error('Detalle de pedido no encontrado')

  const parentOrder = detail.orders as unknown as { business_id: string; status: string }
  if (!parentOrder || parentOrder.business_id !== businessId) {
    throw new Error('No autorizado para modificar este pedido')
  }

  // Update specific item status
  const { data, error } = await supabase
    .from('order_details')
    .update({ status })
    .eq('id', detailId)
    .select()
    .single()

  if (error) throw new Error(error.message)

  const orderId = detail.order_id

  // Check state of other items belonging to this order
  const { data: siblingDetails } = await supabase
    .from('order_details')
    .select('status')
    .eq('order_id', orderId)

  if (siblingDetails && siblingDetails.every(item => item.status === 'ready')) {
    // If all items are ready, set parent order status to ready!
    await supabase
      .from('orders')
      .update({ status: 'ready' })
      .eq('id', orderId)
  } else {
    // If some items are ready/cooking and the order was pending, transition to preparing
    if (parentOrder.status === 'pending') {
      await supabase
        .from('orders')
        .update({ status: 'preparing' })
        .eq('id', orderId)
    }
  }

  revalidatePath('/kitchen')
  revalidatePath('/pos')
  return data
}

export async function completePayment(orderId: string, amount: number) {
  const { supabase, businessId } = await checkAuth()
  if (!businessId) throw new Error('No autorizado')

  // 1. Verify order belongs to this business
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .select('id, table_id')
    .eq('id', orderId)
    .eq('business_id', businessId)
    .single()

  if (orderErr || !order) throw new Error('Pedido no encontrado')

  // 2. Insert Payment status 'completed'
  // Trigger on_payment_completed will auto-deduct recipe stocks and mark order status 'paid'
  const { data: payment, error: payErr } = await supabase
    .from('payments')
    .insert({
      order_id: orderId,
      amount: amount,
      status: 'completed',
      mock_transaction_id: `TXN-${Math.random().toString(36).substring(2, 11).toUpperCase()}`,
      qr_data: { paid_at: new Date().toISOString(), payment_method: 'Yape/Plin (QR)' }
    })
    .select()
    .single()

  if (payErr) throw new Error(`Error procesando pago: ${payErr.message}`)

  // 3. Mark Table as free
  if (order.table_id) {
    const { error: tableErr } = await supabase
      .from('tables')
      .update({ status: 'free' })
      .eq('id', order.table_id)

    if (tableErr) {
      console.error('Failed to free table:', tableErr.message)
    }
  }

  revalidatePath('/pos')
  revalidatePath('/kitchen')
  revalidatePath('/dashboard/inventory')
  return payment
}
