'use client'

import { Check, X } from 'lucide-react'

interface FeatureRow {
  name: string
  essential: 'yes' | 'no' | string
  pro: 'yes' | 'no' | string
  premium: 'yes' | 'no' | string
}

export default function UpgradePrompt() {
  const cssVars = {
    '--accent': '#10b981', // Emerald green
    '--text-dim': '#a1a1aa', // Dimmed gray
    '--text-muted': '#71717a', // Muted gray
    '--bg-card': '#ffffff',
    '--border-default': '#e4e4e7',
  } as React.CSSProperties

  const features: FeatureRow[] = [
    { name: 'POS + Gestión de Mesas', essential: 'yes', pro: 'yes', premium: 'yes' },
    { name: 'Cobro QR o Efectivo', essential: 'yes', pro: 'yes', premium: 'yes' },
    { name: 'Menú Digital + Inventario Básico', essential: 'yes', pro: 'yes', premium: 'yes' },
    { name: 'Facturación con NIT/CI (PDF)', essential: 'no', pro: 'yes', premium: 'yes' },
    { name: 'Kitchen Display Realtime (KDS)', essential: 'no', pro: 'yes', premium: 'yes' },
    { name: 'Dashboard con Gráficos', essential: 'Básico', pro: 'Completo', premium: 'Completo' },
    { name: 'Reportes Detallados + Exportar CSV', essential: 'no', pro: 'yes', premium: 'yes' },
    { name: 'Consumo de Insumos y Mermas (Recetas)', essential: 'no', pro: 'no', premium: 'yes' },
    { name: 'Costeo Automático de Platos', essential: 'no', pro: 'no', premium: 'yes' },
    { name: 'Alertas Inteligentes de Stock', essential: 'Básicas', pro: 'Avanzadas', premium: 'Avanzadas' },
    { name: 'Acceso a Reportes Avanzados', essential: 'no', pro: 'Limitado', premium: 'yes' },
  ]

  const renderValue = (val: string) => {
    if (val === 'yes' || val === 'Sí') {
      return (
        <div className="flex justify-center">
          <Check className="h-5 w-5" style={{ color: 'var(--accent)' }} strokeWidth={3} />
        </div>
      )
    }
    if (val === 'no' || val === 'No') {
      return (
        <div className="flex justify-center">
          <X className="h-5 w-5" style={{ color: 'var(--text-dim)' }} strokeWidth={2.5} />
        </div>
      )
    }
    return (
      <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
        {val}
      </span>
    )
  }

  return (
    <div style={cssVars} className="w-full max-w-5xl mx-auto space-y-6 font-[family-name:var(--font-inter)]">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-black text-zinc-900 font-[family-name:var(--font-sora)]">
          Elige el plan ideal para tu negocio
        </h2>
        <p className="text-sm text-zinc-500 max-w-xl mx-auto">
          Compara las características de nuestros planes y haz crecer tu restaurante con las mejores herramientas del mercado.
        </p>
      </div>

      <div 
        className="rounded-2xl overflow-hidden"
        style={{ 
          background: 'var(--bg-card)', 
          border: '0.5px solid var(--border-default)'
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ borderBottom: '0.5px solid var(--border-default)' }} className="bg-zinc-50/50">
                <th className="p-5 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider min-w-[240px]">
                  Funcionalidad
                </th>
                <th className="p-5 text-center min-w-[140px]" style={{ borderLeft: '0.5px solid var(--border-default)' }}>
                  <div className="space-y-1">
                    <span className="text-xs uppercase tracking-wider font-extrabold text-zinc-400">Esencial</span>
                    <div className="text-lg font-black text-zinc-900 font-[family-name:var(--font-sora)]">140 BOB</div>
                    <span className="text-[10px] text-zinc-500 block font-medium">al mes</span>
                  </div>
                </th>
                <th className="p-5 text-center min-w-[140px] bg-amber-500/5" style={{ borderLeft: '0.5px solid var(--border-default)' }}>
                  <div className="space-y-1">
                    <span className="text-xs uppercase tracking-wider font-extrabold text-amber-600">Pro</span>
                    <div className="text-lg font-black text-zinc-900 font-[family-name:var(--font-sora)]">280 BOB</div>
                    <span className="text-[10px] text-zinc-500 block font-medium">al mes</span>
                  </div>
                </th>
                <th className="p-5 text-center min-w-[140px]" style={{ borderLeft: '0.5px solid var(--border-default)' }}>
                  <div className="space-y-1">
                    <span className="text-xs uppercase tracking-wider font-extrabold text-zinc-400">Premium</span>
                    <div className="text-lg font-black text-zinc-900 font-[family-name:var(--font-sora)]">450 BOB</div>
                    <span className="text-[10px] text-zinc-500 block font-medium">al mes</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border-default)' }}>
              {features.map((feature, idx) => (
                <tr key={idx} className="hover:bg-zinc-50/40 transition-colors">
                  <td className="p-4 text-sm font-semibold text-zinc-800">
                    {feature.name}
                  </td>
                  <td className="p-4 text-center" style={{ borderLeft: '0.5px solid var(--border-default)' }}>
                    {renderValue(feature.essential)}
                  </td>
                  <td className="p-4 text-center bg-amber-500/[0.01]" style={{ borderLeft: '0.5px solid var(--border-default)' }}>
                    {renderValue(feature.pro)}
                  </td>
                  <td className="p-4 text-center" style={{ borderLeft: '0.5px solid var(--border-default)' }}>
                    {renderValue(feature.premium)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
