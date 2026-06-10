'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/components/providers/auth-provider'
import { getDashboardAnalytics } from '@/app/actions/analytics'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar
} from 'recharts'
import {
  Users,
  AlertTriangle,
  Clock,
  DollarSign,
  TrendingUp,
  Loader2,
  Lock,
  ArrowUpRight
} from 'lucide-react'
import Link from 'next/link'

// Harmonic color palette for Pie Chart slices
const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899']

export default function BusinessDashboard() {
  const { profile } = useAuth()
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('today')

  // Query analytics data from the server action
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['dashboard-analytics'],
    queryFn: () => getDashboardAnalytics(),
    refetchInterval: 30000 // Invalidate and reload every 30 seconds for live comanda monitoring!
  })

  if (isLoading) {
    return (
      <div className="flex h-[75vh] items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="h-10 w-10 animate-spin text-emerald-500 mx-auto" />
          <p className="text-sm text-slate-400">Cargando métricas y analíticas comerciales...</p>
        </div>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="rounded-2xl bg-red-500/10 p-6 text-center text-sm text-red-400 border border-red-500/20 max-w-md mx-auto my-16 space-y-3">
        <AlertTriangle className="h-8 w-8 mx-auto" />
        <p className="font-bold">Error al cargar datos del Dashboard</p>
        <p className="text-xs text-slate-500">{error?.message || 'Error desconocido'}</p>
      </div>
    )
  }

  const { plan, metrics, recentOrders, lowStockItems, salesTrendChart, salesByCategoryChart, topProductsChart } = data
  const isEssential = plan === 'essential'
  const isPremium = plan === 'premium'

  // Metric displays depending on selected range
  const salesValue = timeRange === 'today' ? metrics.todaySales : metrics.monthSales
  const salesLabel = timeRange === 'today' ? 'Ventas de Hoy' : 'Ventas del Mes'

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12 font-[family-name:var(--font-inter)]">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 font-[family-name:var(--font-sora)]">
            Panel de {profile?.full_name.split(' ')[0]}
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Resumen comercial y operativo en tiempo real para tu establecimiento.
          </p>
        </div>

        {/* Range Selector */}
        <div className="flex space-x-1.5 bg-zinc-100 p-1 rounded-xl border border-zinc-200 self-start">
          <Button
            size="sm"
            onClick={() => setTimeRange('today')}
            className={`text-xs font-bold rounded-lg h-7 px-3 ${
              timeRange === 'today' ? 'bg-[#F59E0B] text-black hover:bg-[#D97706]' : 'bg-transparent text-zinc-500 hover:text-zinc-700'
            }`}
          >
            Hoy
          </Button>
          <Button
            size="sm"
            onClick={() => setTimeRange('month')}
            className={`text-xs font-bold rounded-lg h-7 px-3 ${
              timeRange === 'month' ? 'bg-[#F59E0B] text-black hover:bg-[#D97706]' : 'bg-transparent text-zinc-500 hover:text-zinc-700'
            }`}
          >
            Este Mes
          </Button>
        </div>
      </div>

      {/* Feature Upgrade Banner for Essential plan users */}
      {isEssential && (
        <Card className="border-amber-200 bg-amber-50 rounded-xl shadow-sm">
          <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start space-x-3">
              <Lock className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-amber-900 font-[family-name:var(--font-sora)]">Estás en el plan Esencial</h4>
                <p className="text-xs text-amber-800 mt-0.5">
                  Las analíticas avanzadas, el Kitchen Display System en tiempo real y los reportes detallados requieren el plan **Pro** o **Premium**.
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/billing"
              className={buttonVariants({
                size: 'sm',
                className: 'bg-amber-500 text-black font-semibold rounded-lg hover:bg-amber-600 self-end sm:self-auto'
              })}
            >
              Upgrade Plan
            </Link>
          </CardContent>
        </Card>
      )}

      {/* KPIs Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Sales KPI */}
        <Card className="bg-white border border-zinc-100 shadow-sm rounded-xl p-6">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-0">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              {salesLabel}
            </span>
            <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
              <DollarSign className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="p-0 mt-4">
            <div className="text-3xl font-bold text-zinc-900 font-[family-name:var(--font-sora)]">${salesValue.toFixed(2)}</div>
            <p className="text-xs text-zinc-400 mt-1">Actualizado hace segundos</p>
          </CardContent>
        </Card>

        {/* Avg Ticket KPI */}
        <Card className="bg-white border border-zinc-100 shadow-sm rounded-xl p-6">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-0">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Ticket Promedio
            </span>
            <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="p-0 mt-4">
            <div className="text-3xl font-bold text-zinc-900 font-[family-name:var(--font-sora)]">${metrics.averageTicket.toFixed(2)}</div>
            <p className="text-xs text-zinc-400 mt-1">Por transacción cobrada</p>
          </CardContent>
        </Card>

        {/* Occupancy KPI */}
        <Card className="bg-white border border-zinc-100 shadow-sm rounded-xl p-6">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-0">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Ocupación Mesas
            </span>
            <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
              <Users className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="p-0 mt-4">
            <div className="text-3xl font-bold text-zinc-900 font-[family-name:var(--font-sora)]">
              {metrics.occupiedTablesCount} / {metrics.totalTablesCount}
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              {metrics.totalTablesCount > 0 
                ? `${((metrics.occupiedTablesCount / metrics.totalTablesCount) * 100).toFixed(0)}% de aforo ocupado`
                : 'Sin mesas configuradas'}
            </p>
          </CardContent>
        </Card>

        {/* Inventory alerts KPI */}
        <Card className="bg-white border border-zinc-100 shadow-sm rounded-xl p-6">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-0">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Alertas Inventario
            </span>
            <div className={`w-10 h-10 flex items-center justify-center rounded-xl ${
              metrics.lowStockCount > 0 
                ? 'bg-red-500/10 text-red-600' 
                : 'bg-zinc-105 text-zinc-400'
            }`}>
              <AlertTriangle className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="p-0 mt-4">
            <div className="text-3xl font-bold text-zinc-900 font-[family-name:var(--font-sora)]">
              {metrics.lowStockCount} {metrics.lowStockCount === 1 ? 'Insumo' : 'Insumos'}
            </div>
            <p className="text-xs text-zinc-400 mt-1">Por debajo del stock mínimo</p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Trend chart */}
        <Card className="bg-white border border-zinc-100 shadow-sm rounded-xl relative overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base font-bold text-zinc-900 font-[family-name:var(--font-sora)]">Tendencia de Ventas (Últimos 7 días)</CardTitle>
            <CardDescription className="text-xs text-zinc-500">Ingresos acumulados diarios por comanda pagada.</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {isEssential ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-400 space-y-2">
                <Lock className="h-6 w-6 text-zinc-300" />
                <p className="text-xs font-bold text-zinc-700">Gráfico Bloqueado</p>
                <p className="text-[10px] text-zinc-500 text-center max-w-[200px]">Disponible en planes Pro y Premium.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesTrendChart}>
                  <XAxis dataKey="name" stroke="#71717a" fontSize={11} tickLine={false} />
                  <YAxis stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e4e4e7', borderRadius: '10px' }}
                    labelStyle={{ color: '#71717a', fontSize: '11px', fontWeight: 'bold' }}
                    itemStyle={{ color: '#f59e0b', fontSize: '12px' }}
                  />
                  <Line type="monotone" dataKey="total" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, strokeWidth: 0, fill: '#f59e0b' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Categories Pie share */}
        <Card className="bg-white border border-zinc-100 shadow-sm rounded-xl relative overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base font-bold text-zinc-900 font-[family-name:var(--font-sora)]">Ingresos por Categoría de Carta</CardTitle>
            <CardDescription className="text-xs text-zinc-500">Distribución del valor facturado.</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {isEssential ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-400 space-y-2">
                <Lock className="h-6 w-6 text-zinc-300" />
                <p className="text-xs font-bold text-zinc-700">Gráfico Bloqueado</p>
                <p className="text-[10px] text-zinc-500 text-center max-w-[200px]">Disponible en planes Pro y Premium.</p>
              </div>
            ) : salesByCategoryChart.length === 0 ? (
              <div className="h-full flex items-center justify-center text-zinc-400 text-xs">
                Aún no hay comandas cobradas registradas.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={salesByCategoryChart}
                    cx="50%"
                    cy="45%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {salesByCategoryChart.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e4e4e7', borderRadius: '10px' }}
                    itemStyle={{ fontSize: '12px' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', color: '#71717a' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent orders */}
        <Card className="bg-white border border-zinc-100 shadow-sm rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-zinc-900 font-[family-name:var(--font-sora)]">Pedidos Recientes</CardTitle>
              <CardDescription className="text-xs text-zinc-500">Últimos pedidos del local.</CardDescription>
            </div>
            <Link
              href="/pos"
              className={buttonVariants({
                variant: 'ghost',
                size: 'sm',
                className: 'text-xs text-amber-500 hover:text-amber-600 hover:bg-amber-50'
              })}
            >
              POS Terminal <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <p className="text-center py-6 text-xs text-zinc-500">No hay pedidos registrados hoy.</p>
            ) : (
              <div className="space-y-4">
                {recentOrders.map((ord) => (
                  <div key={ord.id} className="flex items-center justify-between border-b border-zinc-100/80 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center space-x-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-500">
                        <Clock className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-zinc-900">
                          {typeof ord.table_number === 'number' ? `Mesa ${ord.table_number}` : 'Llevar'}
                        </p>
                        <p className="text-[10px] text-zinc-400">ID: {ord.id.substring(0, 8).toUpperCase()} • {new Date(ord.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-zinc-800">${ord.total.toFixed(2)}</p>
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium mt-0.5 border ${
                        ord.status === 'paid'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : ord.status === 'ready'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : ord.status === 'preparing'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-zinc-100 text-zinc-500 border-zinc-200'
                      }`}>
                        {ord.status === 'paid' ? 'Pagado' : ord.status === 'ready' ? 'Listo' : ord.status === 'preparing' ? 'Preparando' : 'Pendiente'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Products / Low stock Warnings */}
        <div className="space-y-6">
          {/* Top products bar chart (Premium feature flag) */}
          <Card className="bg-white border border-zinc-100 shadow-sm rounded-xl relative overflow-hidden">
            <CardHeader>
              <CardTitle className="text-base font-bold text-zinc-900 font-[family-name:var(--font-sora)]">Platos Más Vendidos</CardTitle>
              <CardDescription className="text-xs text-zinc-500">Volumen y ranking comercial.</CardDescription>
            </CardHeader>
            <CardContent className="h-48">
              {!isPremium ? (
                <div className="h-full flex flex-col items-center justify-center text-zinc-400 space-y-2">
                  <Lock className="h-5 w-5 text-zinc-300" />
                  <p className="text-xs font-bold text-zinc-700">Ranking Premium Bloqueado</p>
                  <p className="text-[10px] text-zinc-500 text-center max-w-[220px]">Disponible exclusivamente en el plan Premium.</p>
                </div>
              ) : topProductsChart.length === 0 ? (
                <p className="text-center py-8 text-xs text-zinc-500">Aún no hay transacciones cobradas.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProductsChart} layout="vertical">
                    <XAxis type="number" stroke="#71717a" fontSize={10} tickLine={false} />
                    <YAxis dataKey="name" type="category" stroke="#71717a" fontSize={9} width={80} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e4e4e7', borderRadius: '10px' }}
                      itemStyle={{ color: '#3b82f6', fontSize: '11px' }}
                    />
                    <Bar dataKey="quantity" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={12} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Low Stock items grid */}
          <Card className="bg-white border border-zinc-100 shadow-sm rounded-xl">
            <CardHeader>
              <CardTitle className="text-base font-bold text-zinc-900 font-[family-name:var(--font-sora)]">Insumos Críticos (Stock Bajo)</CardTitle>
              <CardDescription className="text-xs text-zinc-500">Ingredientes por debajo del mínimo de seguridad.</CardDescription>
            </CardHeader>
            <CardContent>
              {lowStockItems.length === 0 ? (
                <p className="text-center py-4 text-xs text-zinc-500">Todos los insumos se encuentran en niveles saludables.</p>
              ) : (
                <div className="space-y-3.5">
                  {lowStockItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between bg-zinc-50/50 p-2.5 border border-zinc-100 rounded-xl">
                      <div>
                        <p className="text-xs font-bold text-zinc-850">{item.name}</p>
                        <p className="text-[10px] text-zinc-400">Mínimo requerido: {item.min_stock} {item.unit}</p>
                      </div>
                      <span className="text-xs font-bold text-red-650 bg-red-50 px-2.5 py-0.5 rounded border border-red-100 uppercase tracking-tight">
                        {item.current_stock.toFixed(1)} {item.unit}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
