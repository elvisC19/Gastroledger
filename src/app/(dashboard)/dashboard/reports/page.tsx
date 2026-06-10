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
          <Loader2 className="h-10 w-10 animate-spin text-emerald-500 mx-auto" />
          <p className="text-sm text-slate-400">Generando reportes consolidados...</p>
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
        <h1 className="text-2xl font-extrabold text-white">Reportes Bloqueados</h1>
        <p className="text-sm text-slate-455">
          El módulo de reportes consolidados, análisis de mermas e inventario avanzado requiere una suscripción comercial activa al plan **Pro** o **Premium**.
        </p>
        <div className="pt-4">
          <Link
            href="/dashboard/billing"
            className={buttonVariants({
              className: 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold'
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
      <div className="rounded-2xl bg-red-500/10 p-6 text-center text-sm text-red-400 border border-red-500/20 max-w-md mx-auto my-16 space-y-3">
        <AlertTriangle className="h-8 w-8 mx-auto" />
        <p className="font-bold">Error al generar reportes</p>
        <p className="text-xs text-slate-500">{error?.message || 'Error desconocido'}</p>
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
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center space-x-2">
            <FileText className="h-8 w-8 text-emerald-500" />
            <span>Módulo de Reportes</span>
          </h1>
          <p className="text-slate-455 mt-1">
            Exporta reportes de ventas, almacén y consumo de insumos por recetas.
          </p>
        </div>

        <Button
          onClick={handleExportCSV}
          className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold self-start sm:self-auto shrink-0 shadow-md shadow-emerald-500/10"
        >
          <Download className="h-4 w-4 mr-2" /> Exportar a CSV
        </Button>
      </div>

      {/* Tabs Selector */}
      <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-none border-b border-slate-900">
        <button
          onClick={() => setActiveTab('sales')}
          className={`pb-3 text-sm font-semibold transition-all px-4 border-b-2 ${
            activeTab === 'sales'
              ? 'border-emerald-500 text-emerald-400 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-350'
          }`}
        >
          Ventas y Tickets
        </button>
        <button
          onClick={() => setActiveTab('inventory')}
          className={`pb-3 text-sm font-semibold transition-all px-4 border-b-2 ${
            activeTab === 'inventory'
              ? 'border-emerald-500 text-emerald-400 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-350'
          }`}
        >
          Nivel de Inventario
        </button>
        <button
          onClick={() => setActiveTab('consumption')}
          className={`pb-3 text-sm font-semibold transition-all px-4 border-b-2 ${
            activeTab === 'consumption'
              ? 'border-emerald-500 text-emerald-400 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-350'
          }`}
        >
          Consumo e Insumos (Recetas)
        </button>
      </div>

      {/* Data Render Tables */}
      <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-sm">
        {activeTab === 'sales' && (
          <div>
            <CardHeader className="pb-3 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle className="text-base text-slate-200">Historial Comercial</CardTitle>
                <CardDescription className="text-xs text-slate-455">Listado detallado de transacciones registradas.</CardDescription>
              </div>
              <div className="flex items-center space-x-6 text-xs text-slate-400 border border-slate-850 bg-slate-950/20 px-4 py-2 rounded-xl">
                <span>Ventas Totales: <strong className="text-emerald-400">${salesReport.reduce((sum, r) => sum + r.Total, 0).toFixed(2)}</strong></span>
                <span>Tickets: <strong className="text-white">{salesReport.length}</strong></span>
              </div>
            </CardHeader>
            <CardContent>
              {salesReport.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500 space-y-2 border border-dashed border-slate-800/60 rounded-xl bg-slate-950/10">
                  <FileText className="h-8 w-8 text-slate-700" />
                  <p className="font-semibold text-slate-400 text-xs">No hay registros de ventas</p>
                  <p className="text-[10px] text-slate-600">Aún no se han cobrado comandas en este establecimiento.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="border-b border-slate-800">
                      <TableRow className="hover:bg-transparent border-slate-800">
                        <TableHead className="text-slate-400">Fecha y Hora</TableHead>
                        <TableHead className="text-slate-400">Pedido ID</TableHead>
                        <TableHead className="text-slate-400">Mesa</TableHead>
                        <TableHead className="text-slate-400">Estado</TableHead>
                        <TableHead className="text-slate-400 text-right">Monto Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-slate-850">
                      {salesReport.map((row, idx) => (
                        <TableRow key={idx} className="hover:bg-slate-900/15 border-slate-850">
                          <TableCell className="text-slate-300 text-xs font-semibold">{row.Fecha}</TableCell>
                          <TableCell className="text-slate-400 text-xs font-mono">{row.PedidoID}</TableCell>
                          <TableCell className="text-slate-200">{row.Mesa}</TableCell>
                          <TableCell>
                            <span className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-black uppercase border ${
                              row.Estado === 'paid'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-slate-800 text-slate-400 border-slate-700'
                            }`}>
                              {row.Estado === 'paid' ? 'pagado' : row.Estado}
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-slate-100 font-bold">${row.Total.toFixed(2)}</TableCell>
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
                <CardTitle className="text-base text-slate-200">Estado Físico de Almacén</CardTitle>
                <CardDescription className="text-xs text-slate-455">Niveles de stock y costos unitarios registrados.</CardDescription>
              </div>
              <div className="flex items-center space-x-6 text-xs text-slate-400 border border-slate-850 bg-slate-950/20 px-4 py-2 rounded-xl">
                <span>Alertas Críticas: <strong className="text-red-400">{inventoryReport.filter(r => r.Estado !== 'OK').length}</strong></span>
                <span>Insumos Totales: <strong className="text-white">{inventoryReport.length}</strong></span>
              </div>
            </CardHeader>
            <CardContent>
              {inventoryReport.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500 space-y-2 border border-dashed border-slate-800/60 rounded-xl bg-slate-950/10">
                  <AlertTriangle className="h-8 w-8 text-slate-700" />
                  <p className="font-semibold text-slate-400 text-xs">No hay insumos registrados</p>
                  <p className="text-[10px] text-slate-600">Registra insumos en el módulo de Inventario para ver el estado de almacén.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="border-b border-slate-800">
                      <TableRow className="hover:bg-transparent border-slate-800">
                        <TableHead className="text-slate-400">Insumo</TableHead>
                        <TableHead className="text-slate-400">Stock Actual</TableHead>
                        <TableHead className="text-slate-400">Mínimo Seguridad</TableHead>
                        <TableHead className="text-slate-400">Costo Unitario ($)</TableHead>
                        <TableHead className="text-slate-400 text-right">Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-slate-850">
                      {inventoryReport.map((row, idx) => (
                        <TableRow key={idx} className="hover:bg-slate-900/15 border-slate-850">
                          <TableCell className="text-slate-200 font-semibold">{row.Insumo}</TableCell>
                          <TableCell className="text-slate-300 font-bold">{row['Stock Actual'].toFixed(1)} {row.Unidad}</TableCell>
                          <TableCell className="text-slate-455">{row['Stock Mínimo'].toFixed(1)} {row.Unidad}</TableCell>
                          <TableCell className="text-slate-400">${row['Costo Unitario ($)'].toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            <span className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-black uppercase border ${
                              row.Estado === 'OK'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-red-500/10 text-red-400 border-red-500/20'
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
                <CardTitle className="text-base text-slate-200">Consumo Teórico de Cocina (Recetas)</CardTitle>
                <CardDescription className="text-xs text-slate-455">Deducciones automáticas estimadas por comandas cobradas.</CardDescription>
              </div>
              <div className="flex items-center space-x-6 text-xs text-slate-400 border border-slate-850 bg-slate-950/20 px-4 py-2 rounded-xl">
                <span>Costo Total Consumido: <strong className="text-amber-400">${consumptionReport.reduce((sum, r) => sum + r['Costo de Insumos ($)'], 0).toFixed(2)}</strong></span>
              </div>
            </CardHeader>
            <CardContent>
              {consumptionReport.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500 space-y-2 border border-dashed border-slate-800/60 rounded-xl bg-slate-950/10">
                  <FileText className="h-8 w-8 text-slate-700" />
                  <p className="font-semibold text-slate-400 text-xs">No hay consumo acumulado</p>
                  <p className="text-[10px] text-slate-600 max-w-xs">
                    Asegúrate de registrar recetas asociadas a tus platos del menú y cobrar comandas en el POS.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="border-b border-slate-800">
                      <TableRow className="hover:bg-transparent border-slate-800">
                        <TableHead className="text-slate-400">Ingrediente Consumido</TableHead>
                        <TableHead className="text-slate-400">Cantidad Total Deductible</TableHead>
                        <TableHead className="text-slate-400">Unidad de Medida</TableHead>
                        <TableHead className="text-slate-400 text-right">Costo Total de Consumo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-slate-850">
                      {consumptionReport.map((row, idx) => (
                        <TableRow key={idx} className="hover:bg-slate-900/15 border-slate-850">
                          <TableCell className="text-slate-200 font-semibold">{row.Insumo}</TableCell>
                          <TableCell className="text-slate-100 font-black">{row['Cantidad Consumida'].toFixed(1)}</TableCell>
                          <TableCell className="text-slate-455">{row.Unidad}</TableCell>
                          <TableCell className="text-right text-slate-200 font-bold">${row['Costo de Insumos ($)'].toFixed(2)}</TableCell>
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
