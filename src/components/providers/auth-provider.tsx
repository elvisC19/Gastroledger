'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { type User } from '@supabase/supabase-js'
import { type Profile } from '@/types'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  isLoading: boolean
  signOut: () => Promise<void>
  plan: 'básico' | 'medio' | 'premium' | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [plan, setPlan] = useState<'básico' | 'medio' | 'premium' | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function getInitialSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          setUser(session.user)
          // Fetch profile
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
          setProfile(profileData as Profile)

          let resolvedPlan: 'básico' | 'medio' | 'premium' | null = null
          if (profileData?.business_id) {
            const { data: businessData } = await supabase
              .from('businesses')
              .select('subscription_plan')
              .eq('id', profileData.business_id)
              .single()
            if (businessData?.subscription_plan) {
              const subPlan = businessData.subscription_plan
              resolvedPlan = subPlan === 'essential' ? 'básico' : subPlan === 'pro' ? 'medio' : 'premium'
            }
          }
          setPlan(resolvedPlan)
        }
      } catch (error) {
        console.error('Error fetching initial session:', error)
      } finally {
        setIsLoading(false)
      }
    }

    getInitialSession()

    // Listen to changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setIsLoading(true)
        if (session?.user) {
          setUser(session.user)
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
          setProfile(profileData as Profile)

          let resolvedPlan: 'básico' | 'medio' | 'premium' | null = null
          if (profileData?.business_id) {
            const { data: businessData } = await supabase
              .from('businesses')
              .select('subscription_plan')
              .eq('id', profileData.business_id)
              .single()
            if (businessData?.subscription_plan) {
              const subPlan = businessData.subscription_plan
              resolvedPlan = subPlan === 'essential' ? 'básico' : subPlan === 'pro' ? 'medio' : 'premium'
            }
          }
          setPlan(resolvedPlan)
          
          if (event === 'SIGNED_IN') {
            router.refresh()
          }
        } else {
          setUser(null)
          setProfile(null)
          setPlan(null)
          if (event === 'SIGNED_OUT') {
            router.push('/login')
            router.refresh()
          }
        }
        setIsLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, router])

  const signOut = async () => {
    setIsLoading(true)
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.error('Sign out error:', err)
    } finally {
      setUser(null)
      setProfile(null)
      setPlan(null)
      router.push('/login')
      router.refresh()
      setIsLoading(false)
    }
  }

  return (
    <AuthContext.Provider value={{ user, profile, plan, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
