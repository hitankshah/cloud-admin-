import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

export const supabase = createClient(supabaseUrl, supabaseKey)

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: 'admin' | 'user'
  created_at: string
  updated_at: string
}

export interface MenuItem {
  id: string
  name: string
  description: string | null
  price: number
  category: 'appetizer' | 'main' | 'dessert' | 'beverage'
  image_url: string | null
  available: boolean
  created_at: string
  updated_at: string
}

export interface Order {
  id: string
  customer_name: string
  customer_email: string | null
  items: any[]
  total_amount: number
  status: 'pending' | 'preparing' | 'completed' | 'cancelled'
  created_at: string
  updated_at: string
}
