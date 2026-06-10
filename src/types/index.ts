export type UserRole = 'superadmin' | 'admin' | 'cashier' | 'waiter' | 'cook';

export interface Business {
  id: string;
  name: string;
  type: 'cafeteria' | 'restaurante' | 'polleria';
  address: string | null;
  subscription_plan: 'essential' | 'pro' | 'premium';
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
}

export interface Profile {
  id: string;
  business_id: string | null;
  role: UserRole;
  full_name: string;
  email: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}
