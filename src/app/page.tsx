'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/auth-provider'

export default function Home() {
  const { profile, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading) {
      if (!profile) {
        router.push('/login')
      } else {
        const role = profile.role
        if (role === 'superadmin') {
          router.push('/superadmin/dashboard')
        } else if (role === 'admin') {
          router.push('/dashboard')
        } else if (role === 'cashier' || role === 'waiter') {
          router.push('/pos')
        } else if (role === 'cook') {
          router.push('/kitchen')
        }
      }
    }
  }, [profile, isLoading, router])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-slate-100">
      <div className="relative flex items-center justify-center">
        {/* Outer glowing ring */}
        <div className="absolute h-16 w-16 animate-ping rounded-full bg-emerald-500/20 opacity-75"></div>
        {/* Inner spinning gradient */}
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-transparent border-t-emerald-500 border-r-emerald-500/50"></div>
      </div>
      <p className="mt-6 text-sm font-medium tracking-widest text-slate-400 uppercase animate-pulse">
        Cargando Gastroledger...
      </p>
    </div>
  )
}
