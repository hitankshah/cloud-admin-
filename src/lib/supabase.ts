import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Database types
export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  category: 'morning' | 'afternoon' | 'dinner';
  is_vegetarian: boolean;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  user_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  delivery_address: string;
  total_amount: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  special_instructions?: string;
  order_items: OrderItem[];
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  item_name: string;
  quantity: number;
  price: number;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  role: 'customer' | 'admin' | 'superadmin';
  created_at: string;
  updated_at: string;
}