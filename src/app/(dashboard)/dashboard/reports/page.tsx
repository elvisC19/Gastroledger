'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getReportsData } from '@/app/actions/analytics'
import { getDashboardAnalytics } from '@/app/actions/analytics'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  Download,
  AlertTriangle,
  FileText,
  Lock,
  Loader2
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'sales' | 'inventory' | 'consumption'>('sales')

  // Fetch current business plan
  const { data: analyticsData, isLoading: loadingPlan } = useQuery({
    queryKey: ['dashboard-analytics'],
    queryFn: () => getDashboardAnalytics()
  })

  // Fetch reports tables data
  const { data, isLoading: loadingReports, isError, error } = useQuery({
    queryKey: ['reports-data'],
    queryFn: () => getReportsData(),
    enabled: !!analyticsData && analyticsData.plan !== 'essential' // Don't run report queries for Essential plan
  })

  if (loadingPlan || (loadingReports && analyticsData?.plan !== 'essential')) {
    return (
      <div className="flex h-[75vh] items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="h-10 w-10 animate-spin text-amber-500 mx-auto" />
          <p className="text-sm text-zinc-500">Generando reportes consolidados...</p>
        </div>
      </div>
    )
  }

  const plan = analyticsData?.plan || 'essential'
  const isEssential = plan === 'essential'

  if (isEssential) {
    return (
      <div className="space-y-6 max-w-lg mx-auto my-16 text-center animate-in fade-in duration-500">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto">
          <Lock className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-extrabold text-zinc-900 font-[family-name:var(--font-sora)]">Reportes Bloqueados</h1>
        <p className="text-sm text-zinc-500">
          El módulo de reportes consolidados, análisis de mermas e inventario avanzado requiere una suscripción comercial activa al plan **Pro** o **Premium**.
        </p>
        <div className="pt-4">
          <Link
            href="/dashboard/billing"
            className={buttonVariants({
              className: 'bg-amber-500 hover:bg-amber-600 text-black font-semibold'
            })}
          >
            Actualizar Plan
          </Link>
        </div>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="rounded-2xl bg-red-50 p-6 text-center text-sm text-red-650 border border-red-200 max-w-md mx-auto my-16 space-y-3">
        <AlertTriangle className="h-8 w-8 mx-auto text-red-500" />
        <p className="font-bold">Error al generar reportes</p>
        <p className="text-xs text-zinc-400">{error?.message || 'Error desconocido'}</p>
      </div>
    )
  }

  const { salesReport, inventoryReport, consumptionReport } = data

  // CSV Exporter logic
  const handleExportCSV = () => {
    let reportData: Record<string, string | number>[] = []
    let filename = ''

    if (activeTab === 'sales') {
      reportData = salesReport
      filename = `Reporte_Ventas_${new Date().toISOString().slice(0,10)}.csv`
    } else if (activeTab === 'inventory') {
      reportData = inventoryReport
      filename = `Reporte_Inventario_${new Date().toISOString().slice(0,10)}.csv`
    } else {
      reportData = consumptionReport
      filename = `Reporte_Consumo_Mermas_${new Date().toISOString().slice(0,10)}.csv`
    }

    if (reportData.length === 0) {
      toast.error('No hay datos disponibles para exportar')
      return
    }

    try {
      const headers = Object.keys(reportData[0]).join(',')
      const rows = reportData.map(row => 
        Object.values(row).map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')
      )
      const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers, ...rows].join('\n')
      const encodedUri = encodeURI(csvContent)
      const link = document.createElement('a')
      link.setAttribute('href', encodedUri)
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success(`Exportado exitosamente: ${filename}`)
    } catch (err) {
      console.error('CSV Export Error:', err)
      toast.error('Error al generar archivo CSV')
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 font-[family-name:var(--font-sora)] flex items-center space-x-2">
            <FileText className="h-8 w-8 text-amber-500" />
            <span>Módulo de Reportes</span>
          </h1>
          <p className="text-zinc-505 mt-1">
            Exporta reportes de ventas, almacén y consumo de insumos por recetas.
          </p>
        </div>

        <Button
          onClick={handleExportCSV}
          className="bg-amber-500 hover:bg-amber-600 text-black font-semibold self-start sm:self-auto shrink-0 shadow-md"
        >
          <Download className="h-4 w-4 mr-2" /> Exportar a CSV
        </Button>
      </div>

      {/* Tabs Selector */}
      <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-none border-b border-zinc-200">
        <button
          onClick={() => setActiveTab('sales')}
          className={`pb-3 text-sm font-semibold transition-all px-4 border-b-2 ${
            activeTab === 'sales'
              ? 'border-amber-500 text-zinc-900 font-bold'
              : 'border-transparent text-zinc-400 hover:text-zinc-650'
          }`}
        >
          Ventas y Tickets
        </button>
        <button
          onClick={() => setActiveTab('inventory')}
          className={`pb-3 text-sm font-semibold transition-all px-4 border-b-2 ${
            activeTab === 'inventory'
              ? 'border-amber-500 text-zinc-900 font-bold'
              : 'border-transparent text-zinc-400 hover:text-zinc-650'
          }`}
        >
          Nivel de Inventario
        </button>
        <button
          onClick={() => setActiveTab('consumption')}
          className={`pb-3 text-sm font-semibold transition-all px-4 border-b-2 ${
            activeTab === 'consumption'
              ? 'border-amber-500 text-zinc-900 font-bold'
              : 'border-transparent text-zinc-400 hover:text-zinc-650'
          }`}
        >
          Consumo e Insumos (Recetas)
        </button>
      </div>

      {/* Data Render Tables */}
      <Card className="border-zinc-100 bg-white shadow-sm">
        {activeTab === 'sales' && (
          <div>
            <CardHeader className="pb-3 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle className="text-base text-zinc-900">Historial Comercial</CardTitle>
                <CardDescription className="text-xs text-zinc-500">Listado detallado de transacciones registradas.</CardDescription>
              </div>
              <div className="flex items-center space-x-6 text-xs text-zinc-500 border border-zinc-100 bg-zinc-50 px-4 py-2 rounded-xl">
                <span>Ventas Totales: <strong className="text-emerald-400">${salesReport.reduce((sum, r) => sum + r.Total, 0).toFixed(2)}</strong></span>
                <span>Tickets: <strong className="text-zinc-900">{salesReport.length}</strong></span>
              </div>
            </CardHeader>
            <CardContent>
              {salesReport.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-500 space-y-2 border border-dashed border-zinc-200 rounded-xl bg-zinc-50/50">
                  <FileText className="h-8 w-8 text-zinc-300" />
                  <p className="font-semibold text-zinc-500 text-xs">No hay registros de ventas</p>
                  <p className="text-[10px] text-zinc-400">Aún no se han cobrado comandas en este establecimiento.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="border-b border-zinc-100 bg-zinc-50">
                      <TableRow className="hover:bg-transparent border-zinc-100">
                        <TableHead className="text-zinc-400 bg-zinc-50">Fecha y Hora</TableHead>
                        <TableHead className="text-zinc-400 bg-zinc-50">Pedido ID</TableHead>
                        <TableHead className="text-zinc-400 bg-zinc-50">Mesa</TableHead>
                        <TableHead className="text-zinc-400 bg-zinc-50">Estado</TableHead>
                        <TableHead className="text-zinc-400 bg-zinc-50 text-right">Monto Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-zinc-100">
                      {salesReport.map((row, idx) => (
                        <TableRow key={idx} className="hover:bg-zinc-50/50 border-zinc-100">
                          <TableCell className="text-zinc-500 text-xs font-semibold">{row.Fecha}</TableCell>
                          <TableCell className="text-zinc-500 text-xs font-mono">{row.PedidoID}</TableCell>
                          <TableCell className="text-zinc-900">{row.Mesa}</TableCell>
                          <TableCell>
                            <span className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-black uppercase border ${
                              row.Estado === 'paid'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-zinc-100 text-zinc-500 border-zinc-200'
                            }`}>
                              {row.Estado === 'paid' ? 'pagado' : row.Estado}
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-zinc-900 font-bold">${row.Total.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </div>
        )}

        {activeTab === 'inventory' && (
          <div>
            <CardHeader className="pb-3 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle className="text-base text-zinc-900">Estado Físico de Almacén</CardTitle>
                <CardDescription className="text-xs text-zinc-500">Niveles de stock y costos unitarios registrados.</CardDescription>
              </div>
              <div className="flex items-center space-x-6 text-xs text-zinc-500 border border-zinc-100 bg-zinc-50 px-4 py-2 rounded-xl">
                <span>Alertas Críticas: <strong className="text-red-400">{inventoryReport.filter(r => r.Estado !== 'OK').length}</strong></span>
                <span>Insumos Totales: <strong className="text-zinc-900">{inventoryReport.length}</strong></span>
              </div>
            </CardHeader>
            <CardContent>
              {inventoryReport.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-500 space-y-2 border border-dashed border-zinc-200 rounded-xl bg-zinc-50/50">
                  <AlertTriangle className="h-8 w-8 text-zinc-300" />
                  <p className="font-semibold text-zinc-500 text-xs">No hay insumos registrados</p>
                  <p className="text-[10px] text-zinc-400">Registra insumos en el módulo de Inventario para ver el estado de almacén.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="border-b border-zinc-100 bg-zinc-50">
                      <TableRow className="hover:bg-transparent border-zinc-100">
                        <TableHead className="text-zinc-400 bg-zinc-50">Insumo</TableHead>
                        <TableHead className="text-zinc-400 bg-zinc-50">Stock Actual</TableHead>
                        <TableHead className="text-zinc-400 bg-zinc-50">Mínimo Seguridad</TableHead>
                        <TableHead className="text-zinc-400 bg-zinc-50">Costo Unitario ($)</TableHead>
                        <TableHead className="text-zinc-400 bg-zinc-50 text-right">Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-zinc-100">
                      {inventoryReport.map((row, idx) => (
                        <TableRow key={idx} className="hover:bg-zinc-50/50 border-zinc-100">
                          <TableCell className="text-zinc-900 font-semibold">{row.Insumo}</TableCell>
                          <TableCell className="text-zinc-500 font-bold">{row['Stock Actual'].toFixed(1)} {row.Unidad}</TableCell>
                          <TableCell className="text-zinc-500">{row['Stock Mínimo'].toFixed(1)} {row.Unidad}</TableCell>
                          <TableCell className="text-zinc-500">${row['Costo Unitario ($)'].toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            <span className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-black uppercase border ${
                              row.Estado === 'OK'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-red-50 border-red-200 text-red-600'
                            }`}>
                              {row.Estado}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </div>
        )}

        {activeTab === 'consumption' && (
          <div>
            <CardHeader className="pb-3 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle className="text-base text-zinc-900">Consumo Teórico de Cocina (Recetas)</CardTitle>
                <CardDescription className="text-xs text-zinc-500">Deducciones automáticas estimadas por comandas cobradas.</CardDescription>
              </div>
              <div className="flex items-center space-x-6 text-xs text-zinc-500 border border-zinc-100 bg-zinc-50 px-4 py-2 rounded-xl">
                <span>Costo Total Consumido: <strong className="text-amber-400">${consumptionReport.reduce((sum, r) => sum + r['Costo de Insumos ($)'], 0).toFixed(2)}</strong></span>
              </div>
            </CardHeader>
            <CardContent>
              {consumptionReport.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-500 space-y-2 border border-dashed border-zinc-200 rounded-xl bg-zinc-50/50">
                  <FileText className="h-8 w-8 text-zinc-300" />
                  <p className="font-semibold text-zinc-500 text-xs">No hay consumo acumulado</p>
                  <p className="text-[10px] text-zinc-400 max-w-xs">
                    Asegúrate de registrar recetas asociadas a tus platos del menú y cobrar comandas en el POS.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="border-b border-zinc-100 bg-zinc-50">
                      <TableRow className="hover:bg-transparent border-zinc-100">
                        <TableHead className="text-zinc-400 bg-zinc-50">Ingrediente Consumido</TableHead>
                        <TableHead className="text-zinc-400 bg-zinc-50">Cantidad Total Deductible</TableHead>
                        <TableHead className="text-zinc-400 bg-zinc-50">Unidad de Medida</TableHead>
                        <TableHead className="text-zinc-400 bg-zinc-50 text-right">Costo Total de Consumo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-zinc-100">
                      {consumptionReport.map((row, idx) => (
                        <TableRow key={idx} className="hover:bg-zinc-50/50 border-zinc-100">
                          <TableCell className="text-zinc-900 font-semibold">{row.Insumo}</TableCell>
                          <TableCell className="text-zinc-900 font-black">{row['Cantidad Consumida'].toFixed(1)}</TableCell>
                          <TableCell className="text-zinc-500">{row.Unidad}</TableCell>
                          <TableCell className="text-right text-zinc-900 font-bold">${row['Costo de Insumos ($)'].toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </div>
        )}
      </Card>
    </div>
  )
}
