'use server'

import { createClient } from '@/lib/supabase/server'

interface OrderDetailWithMenuItem {
  id: string
  menu_item_id: string
  quantity: number
  price_at_time: number
  menu_items: {
    name: string
    category: string
  } | null
}

interface RecipeWithRelations {
  menu_item_id: string
  quantity: number
  inventory_items: {
    name: string
    unit: string
    unit_cost: number
  } | null
}

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

  return { supabase, businessId: profile.business_id }
}

export async function getDashboardAnalytics() {
  const { supabase, businessId } = await checkAuth()
  if (!businessId) throw new Error('Negocio no identificado')

  // 1. Fetch active business plan for feature flag checks
  const { data: business } = await supabase
    .from('businesses')
    .select('subscription_plan')
    .eq('id', businessId)
    .single()

  const plan = business?.subscription_plan || 'essential'

  // 2. Fetch all orders (we process records in JS to avoid database pressure)
  const { data: ordersData, error: ordErr } = await supabase
    .from('orders')
    .select(`
      *,
      tables(table_number),
      order_details(
        *,
        menu_items(name, category)
      )
    `)
    .eq('business_id', businessId)

  if (ordErr) throw new Error(`Error al leer pedidos: ${ordErr.message}`)
  const orders = ordersData || []

  // 3. Fetch inventory stock items
  const { data: inventoryData, error: invErr } = await supabase
    .from('inventory_items')
    .select('*')
    .eq('business_id', businessId)

  if (invErr) throw new Error(`Error al leer inventario: ${invErr.message}`)
  const inventory = inventoryData || []

  // 4. Fetch tables state
  const { data: tablesData, error: tblErr } = await supabase
    .from('tables')
    .select('*')
    .eq('business_id', businessId)

  if (tblErr) throw new Error(`Error al leer mesas: ${tblErr.message}`)
  const tables = tablesData || []

  // Date constants
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  todayEnd.setHours(23, 59, 59, 999)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()

  // Filter paid orders
  const paidOrders = orders.filter(o => o.status === 'paid')

  // KPIs Calculations
  const todaySales = paidOrders
    .filter(o => {
      const orderTime = new Date(o.created_at).getTime()
      return orderTime >= todayStart.getTime() && orderTime <= todayEnd.getTime()
    })
    .reduce((sum, o) => sum + Number(o.total), 0)

  const monthSales = paidOrders
    .filter(o => new Date(o.created_at).getTime() >= monthStart)
    .reduce((sum, o) => sum + Number(o.total), 0)

  const totalPaidTicketsCount = paidOrders.length
  const averageTicket = totalPaidTicketsCount > 0 
    ? paidOrders.reduce((sum, o) => sum + Number(o.total), 0) / totalPaidTicketsCount 
    : 0

  const lowStockCount = inventory.filter(item => Number(item.current_stock) < Number(item.min_stock)).length
  const totalTablesCount = tables.length
  const occupiedTablesCount = tables.filter(t => t.status === 'occupied').length

  // Recent orders list (last 5)
  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)
    .map(o => {
      const tableObj = o.tables as unknown as { table_number: number } | null
      return {
        id: o.id,
        table_number: tableObj?.table_number || 'Llevar',
        total: Number(o.total),
        status: o.status,
        created_at: o.created_at
      }
    })

  // Low stock items list (last 5 warnings)
  const lowStockItems = inventory
    .filter(item => Number(item.current_stock) < Number(item.min_stock))
    .slice(0, 5)
    .map(item => ({
      id: item.id,
      name: item.name,
      current_stock: Number(item.current_stock),
      min_stock: Number(item.min_stock),
      unit: item.unit
    }))

  // Recharts: Sales Trend last 7 Days
  const salesByDayMap: Record<string, number> = {}
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(now.getDate() - i)
    const label = d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' })
    salesByDayMap[label] = 0
  }

  paidOrders.forEach(o => {
    const label = new Date(o.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' })
    if (salesByDayMap[label] !== undefined) {
      salesByDayMap[label] += Number(o.total)
    }
  })

  const salesTrendChart = Object.keys(salesByDayMap).map(key => ({
    name: key,
    total: Number(salesByDayMap[key].toFixed(2))
  }))

  // Recharts: Sales by Category
  const categorySalesMap: Record<string, number> = {}
  const categoryLabels: Record<string, string> = {
    'plato-fondo': 'Segundos',
    'entradas': 'Entradas',
    'bebidas': 'Bebidas',
    'postres': 'Postres',
    'otros': 'Otros'
  }

  paidOrders.forEach(o => {
    const details = (o.order_details as unknown as OrderDetailWithMenuItem[] | null) || []
    details.forEach((detail) => {
      const dbCat = detail.menu_items?.category || 'otros'
      const label = categoryLabels[dbCat] || 'Otros'
      const revenue = Number(detail.price_at_time) * Number(detail.quantity)
      categorySalesMap[label] = (categorySalesMap[label] || 0) + revenue
    })
  })

  const salesByCategoryChart = Object.keys(categorySalesMap).map(key => ({
    name: key,
    value: Number(categorySalesMap[key].toFixed(2))
  }))

  // Recharts: Top products sales volume
  const productSalesMap: Record<string, { quantity: number; sales: number }> = {}
  paidOrders.forEach(o => {
    const details = (o.order_details as unknown as OrderDetailWithMenuItem[] | null) || []
    details.forEach((detail) => {
      const name = detail.menu_items?.name || 'Desconocido'
      const qty = Number(detail.quantity)
      const rev = Number(detail.price_at_time) * qty

      if (!productSalesMap[name]) {
        productSalesMap[name] = { quantity: 0, sales: 0 }
      }
      productSalesMap[name].quantity += qty
      productSalesMap[name].sales += rev
    })
  })

  const topProductsChart = Object.keys(productSalesMap)
    .map(name => ({
      name,
      quantity: productSalesMap[name].quantity,
      sales: Number(productSalesMap[name].sales.toFixed(2))
    }))
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 5)

  return {
    plan,
    metrics: {
      todaySales: Number(todaySales.toFixed(2)),
      monthSales: Number(monthSales.toFixed(2)),
      averageTicket: Number(averageTicket.toFixed(2)),
      lowStockCount,
      occupiedTablesCount,
      totalTablesCount
    },
    recentOrders,
    lowStockItems,
    salesTrendChart,
    salesByCategoryChart,
    topProductsChart
  }
}

export async function getReportsData() {
  const { supabase, businessId } = await checkAuth()
  if (!businessId) throw new Error('Negocio no identificado')

  // 1. Sales Report
  const { data: salesOrdersData } = await supabase
    .from('orders')
    .select('id, status, total, created_at, tables(table_number)')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })

  const salesOrders = salesOrdersData || []

  const salesReport = salesOrders.map(o => {
    const tableObj = o.tables as unknown as { table_number: number } | null
    return {
      Fecha: new Date(o.created_at).toLocaleDateString('es-PE') + ' ' + new Date(o.created_at).toLocaleTimeString('es-PE'),
      PedidoID: o.id.substring(0, 8).toUpperCase(),
      Mesa: tableObj?.table_number ? `Mesa ${tableObj.table_number}` : 'Llevar',
      Estado: o.status,
      Total: Number(o.total)
    }
  })

  // 2. Inventory Report
  const { data: inventoryData } = await supabase
    .from('inventory_items')
    .select('*')
    .eq('business_id', businessId)
    .order('name', { ascending: true })

  const inventory = inventoryData || []

  const inventoryReport = inventory.map(item => ({
    Insumo: item.name,
    'Stock Actual': Number(item.current_stock),
    'Stock Mínimo': Number(item.min_stock),
    Unidad: item.unit,
    'Costo Unitario ($)': Number(item.unit_cost),
    Estado: Number(item.current_stock) < Number(item.min_stock) ? 'ALERTA BAJO STOCK' : 'OK'
  }))

  // 3. Recipe Consumption / Waste Report
  // Calculates total theoretical inventory deductions based on paid orders
  const { data: paidOrdersData } = await supabase
    .from('orders')
    .select('*, order_details(*, menu_items(*))')
    .eq('business_id', businessId)
    .eq('status', 'paid')

  const paidOrders = paidOrdersData || []

  // Get recipe formulas to map menu items with raw ingredients
  const { data: recipesData } = await supabase
    .from('recipes')
    .select('*, menu_items(name), inventory_items(name, unit, unit_cost)')

  const recipes = recipesData || []

  const consumptionMap: Record<string, { ingredient: string; unit: string; qty: number; cost: number }> = {}

  paidOrders.forEach(o => {
    const details = (o.order_details as unknown as OrderDetailWithMenuItem[] | null) || []
    details.forEach((detail) => {
      const menuId = detail.menu_item_id
      const detailQty = Number(detail.quantity)

      // Find ingredients matching this menu item
      const itemIngredients = (recipes as unknown as RecipeWithRelations[]).filter((r) => r.menu_item_id === menuId)
      itemIngredients.forEach((rec) => {
        const ingName = rec.inventory_items?.name || 'Insumo'
        const ingUnit = rec.inventory_items?.unit || 'und'
        const formulaQty = Number(rec.quantity)
        const unitCost = Number(rec.inventory_items?.unit_cost || 0)

        const totalQtyDeducted = formulaQty * detailQty
        const totalCostDeducted = totalQtyDeducted * unitCost

        if (!consumptionMap[ingName]) {
          consumptionMap[ingName] = { ingredient: ingName, unit: ingUnit, qty: 0, cost: 0 }
        }
        consumptionMap[ingName].qty += totalQtyDeducted
        consumptionMap[ingName].cost += totalCostDeducted
      })
    })
  })

  const consumptionReport = Object.keys(consumptionMap).map(name => ({
    Insumo: name,
    'Cantidad Consumida': Number(consumptionMap[name].qty.toFixed(2)),
    Unidad: consumptionMap[name].unit,
    'Costo de Insumos ($)': Number(consumptionMap[name].cost.toFixed(2))
  }))

  return {
    salesReport,
    inventoryReport,
    consumptionReport
  }
}
