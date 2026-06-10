import UpgradePrompt from '@/components/UpgradePrompt'

export default function BillingPage() {
  return (
    <div className="py-6 px-4 md:px-8 space-y-8 animate-in fade-in duration-500 pb-16">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-zinc-900 font-[family-name:var(--font-sora)]">
          Planes y Facturación
        </h1>
        <p className="text-sm text-zinc-500">
          Administra la suscripción de tu establecimiento gastronómico y revisa tus límites operativos.
        </p>
      </div>

      <div className="border border-zinc-100 bg-white shadow-sm rounded-2xl p-6 md:p-10">
        <UpgradePrompt />
      </div>
    </div>
  )
}
