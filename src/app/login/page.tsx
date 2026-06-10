'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { UtensilsCrossed, Mail, Lock, AlertCircle, Loader2, Check } from 'lucide-react'

const loginSchema = z.object({
  email: z.string().email({ message: 'Introduce un correo electrónico válido' }),
  password: z.string().min(6, { message: 'La contraseña debe tener al menos 6 caracteres' }),
})

type LoginFormValues = z.infer<typeof loginSchema>

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true)
    setError(null)

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (authError) {
        setError(authError.message === 'Invalid login credentials' 
          ? 'Credenciales inválidas. Por favor verifica tu correo y contraseña.' 
          : authError.message
        )
        setIsLoading(false)
        return
      }

      // Successful login - the AuthProvider and root middleware will handle redirection
      router.refresh()
    } catch (err) {
      console.error(err)
      setError('Ocurrió un error inesperado al intentar iniciar sesión.')
      setIsLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen w-full overflow-hidden bg-[#FAFAFA] font-[family-name:var(--font-inter)]">
      {/* Two-column layout container */}
      <div className="flex w-full min-h-screen">
        {/* Left Column - Decorative Brand Panel (Desktop only) */}
        <div className="relative hidden w-1/2 flex-col justify-between bg-[#0F0F0F] p-16 md:flex h-full min-h-screen z-10">
          {/* Brand Logo Header */}
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F59E0B] text-black">
              <UtensilsCrossed className="h-5 w-5" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-white font-[family-name:var(--font-sora)]">GastroLedger</span>
          </div>

          {/* Main message */}
          <div className="my-auto max-w-md space-y-8">
            <div className="space-y-4">
              <h1 className="text-5xl font-extrabold tracking-tight text-white leading-[1.15] font-[family-name:var(--font-sora)]">
                Gestiona tu restaurante <span className="text-[#F59E0B]">con precisión total.</span>
              </h1>
              <p className="text-base text-[#71717A] leading-relaxed font-[family-name:var(--font-inter)]">
                La plataforma todo-en-uno para restaurantes que quieren crecer con datos reales.
              </p>
            </div>

            <ul className="space-y-4 text-white">
              <li className="flex items-center space-x-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F59E0B]/15 text-[#F59E0B]">
                  <Check className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium">POS en tiempo real para tu equipo</span>
              </li>
              <li className="flex items-center space-x-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F59E0B]/15 text-[#F59E0B]">
                  <Check className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium">Inventario y recetas automatizadas</span>
              </li>
              <li className="flex items-center space-x-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F59E0B]/15 text-[#F59E0B]">
                  <Check className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium">Reportes y analytics por turno</span>
              </li>
            </ul>
          </div>

          {/* Footer */}
          <div className="text-xs text-[#3F3F46]">
            GastroLedger SaaS · v1.0 · 2026
          </div>

          {/* Vertical divider line absolute to the right boundary of Left Column */}
          <div className="absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-zinc-700 to-transparent" />
        </div>

        {/* Right Column - Form Container */}
        <div className="flex w-full flex-col justify-center px-4 sm:px-12 md:w-1/2 md:px-16 lg:px-24 bg-[#FAFAFA] min-h-screen">
          <div className="mx-auto w-full max-w-sm space-y-8">
            
            {/* Mobile Header (Hidden on desktop) */}
            <div className="flex flex-col items-center text-center md:hidden mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F59E0B] text-black">
                <UtensilsCrossed className="h-5 w-5" />
              </div>
              <h1 className="mt-3 text-2xl font-bold tracking-tight text-zinc-900 font-[family-name:var(--font-sora)]">
                GastroLedger
              </h1>
            </div>

            {/* Form Container */}
            <div className="space-y-6">
              <div className="space-y-1.5">
                <h2 className="text-3xl font-bold tracking-tight text-zinc-900 font-[family-name:var(--font-sora)]">
                  Bienvenido de nuevo
                </h2>
                <p className="text-sm text-zinc-500 font-[family-name:var(--font-inter)]">
                  Ingresa tus credenciales para continuar.
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {error && (
                  <div className="flex items-center space-x-2 rounded-lg bg-red-50 p-3 text-sm text-red-650 border border-red-200 animate-in fade-in duration-200">
                    <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-zinc-700 font-[family-name:var(--font-inter)]">
                    Correo Electrónico
                  </Label>
                  <div className="relative">
                    <Mail className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="correo@negocio.com"
                      className="h-11 border-zinc-200 bg-white pl-10 text-zinc-900 placeholder:text-zinc-400 rounded-lg focus-visible:border-amber-500 focus-visible:ring-amber-500 focus-visible:ring-1 focus-visible:ring-offset-0 focus:border-amber-500 focus:ring-amber-500"
                      disabled={isLoading}
                      {...register('email')}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-zinc-700 font-[family-name:var(--font-inter)]">
                    Contraseña
                  </Label>
                  <div className="relative">
                    <Lock className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      className="h-11 border-zinc-200 bg-white pl-10 text-zinc-900 placeholder:text-zinc-400 rounded-lg focus-visible:border-amber-500 focus-visible:ring-amber-500 focus-visible:ring-1 focus-visible:ring-offset-0 focus:border-amber-500 focus:ring-amber-500"
                      disabled={isLoading}
                      {...register('password')}
                    />
                  </div>
                  {errors.password && (
                    <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="mt-2 h-11 w-full bg-[#F59E0B] font-semibold text-black hover:bg-[#D97706] transition-colors rounded-lg font-[family-name:var(--font-inter)]"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" />
                      Autenticando...
                    </span>
                  ) : (
                    'Ingresar al Sistema'
                  )}
                </Button>
              </form>
            </div>

            {/* Secure Footer */}
            <div className="text-xs text-zinc-400 text-center pt-2 font-[family-name:var(--font-inter)]">
              Acceso seguro · Datos encriptados · HTTPS
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

