import { useAuth } from '@/components/providers/auth-provider'

export type SubscriptionPlan = 'essential' | 'pro' | 'premium'

export function usePlanGuard(requiredPlan: SubscriptionPlan) {
  const { plan } = useAuth()

  // Map the auth-provider plan ('básico' | 'medio' | 'premium') to levels
  const planLevels: Record<'básico' | 'medio' | 'premium', number> = {
    'básico': 1,
    'medio': 2,
    'premium': 3,
  }

  const requiredLevels: Record<SubscriptionPlan, number> = {
    'essential': 1,
    'pro': 2,
    'premium': 3,
  }

  // Fallback to basic (level 1) if plan is not loaded/found
  const currentLevel = plan ? planLevels[plan] : 1
  const requiredLevel = requiredLevels[requiredPlan]

  return {
    hasAccess: currentLevel >= requiredLevel
  }
}
