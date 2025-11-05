import { supabase } from "@/lib/supabase"

// Restaurant Management System Types

export type MenuItem = {
  id: string
  name: string
  description: string
  price: number
  image_url: string
  category: 'morning' | 'afternoon' | 'dinner'
  is_vegetarian: boolean
  is_available: boolean
  created_at: string
  updated_at: string
}

export type Order = {
  id: string
  customer_id: string | null
  customer_name: string
  customer_email: string
  customer_phone: string
  delivery_address: string
  total_amount: number
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled'
  special_instructions: string
  is_read: boolean
  created_at: string
  updated_at: string
}

export type OrderItem = {
  id: string
  order_id: string
  menu_item_id: string
  quantity: number
  price_at_order: number
  created_at: string
}

export type User = {
  id: string
  email: string
  full_name: string
  phone: string
  role: 'customer' | 'admin'
  created_at: string
}

export type MenuItemImage = {
  id: string
  menu_item_id: string
  image_url: string
  image_order: number
  created_at: string
}

// Menu Item API
export const menuItemApi = {
  getMenuItems: async () => {
    const { data, error } = await supabase
      .from("menu_items")
      .select("*")
      .order("created_at", { ascending: false })
    if (error) throw error
    return data || []
  },

  getMenuItem: async (itemId: string) => {
    const { data, error } = await supabase
      .from("menu_items")
      .select("*")
      .eq("id", itemId)
      .single()
    if (error) throw error
    return data
  },

  createMenuItem: async (item: Omit<MenuItem, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase
      .from("menu_items")
      .insert(item)
      .select()
    if (error) throw error
    return data?.[0]
  },

  updateMenuItem: async (itemId: string, item: Partial<Omit<MenuItem, 'id' | 'created_at' | 'updated_at'>>) => {
    const { data, error } = await supabase
      .from("menu_items")
      .update(item)
      .eq("id", itemId)
      .select()
    if (error) throw error
    return data?.[0]
  },

  deleteMenuItem: async (itemId: string) => {
    const { error } = await supabase
      .from("menu_items")
      .delete()
      .eq("id", itemId)
    if (error) throw error
    return true
  },
}

// Order API
export const orderApi = {
  getOrders: async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
    if (error) throw error
    return data || []
  },

  getOrder: async (orderId: string) => {
    const { data, error } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", orderId)
      .single()
    if (error) throw error
    return data
  },

  createOrder: async (order: Omit<Order, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase
      .from("orders")
      .insert(order)
      .select()
    if (error) throw error
    return data?.[0]
  },

  updateOrder: async (orderId: string, order: Partial<Omit<Order, 'id' | 'created_at' | 'updated_at'>>) => {
    const { data, error } = await supabase
      .from("orders")
      .update(order)
      .eq("id", orderId)
      .select()
    if (error) throw error
    return data?.[0]
  },

  deleteOrder: async (orderId: string) => {
    const { error } = await supabase
      .from("orders")
      .delete()
      .eq("id", orderId)
    if (error) throw error
    return true
  },
}

// Order Item API
export const orderItemApi = {
  getOrderItems: async (orderId: string) => {
    const { data, error } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", orderId)
    if (error) throw error
    return data || []
  },

  createOrderItem: async (item: Omit<OrderItem, 'id' | 'created_at'>) => {
    const { data, error } = await supabase
      .from("order_items")
      .insert(item)
      .select()
    if (error) throw error
    return data?.[0]
  },

  deleteOrderItem: async (itemId: string) => {
    const { error } = await supabase
      .from("order_items")
      .delete()
      .eq("id", itemId)
    if (error) throw error
    return true
  },
}

// User API
export const userApi = {
  getUsers: async () => {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false })
    if (error) throw error
    return data || []
  },

  getUser: async (userId: string) => {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single()
    if (error) throw error
    return data
  },

  updateUser: async (userId: string, user: Partial<Omit<User, 'id' | 'created_at'>>) => {
    const { data, error } = await supabase
      .from("users")
      .update(user)
      .eq("id", userId)
      .select()
    if (error) throw error
    return data?.[0]
  },

  deleteUser: async (userId: string) => {
    const { error } = await supabase
      .from("users")
      .delete()
      .eq("id", userId)
    if (error) throw error
    return true
  },
}

// Menu Item Images API
export const menuItemImageApi = {
  getMenuItemImages: async (menuItemId: string) => {
    const { data, error } = await supabase
      .from("menu_item_images")
      .select("*")
      .eq("menu_item_id", menuItemId)
      .order("image_order", { ascending: true })
    if (error) throw error
    return data || []
  },

  createMenuItemImage: async (image: Omit<MenuItemImage, 'id' | 'created_at'>) => {
    const { data, error } = await supabase
      .from("menu_item_images")
      .insert(image)
      .select()
    if (error) throw error
    return data?.[0]
  },

  updateMenuItemImage: async (imageId: string, image: Partial<Omit<MenuItemImage, 'id' | 'created_at' | 'menu_item_id'>>) => {
    const { data, error } = await supabase
      .from("menu_item_images")
      .update(image)
      .eq("id", imageId)
      .select()
    if (error) throw error
    return data?.[0]
  },

  deleteMenuItemImage: async (imageId: string) => {
    const { error } = await supabase
      .from("menu_item_images")
      .delete()
      .eq("id", imageId)
    if (error) throw error
    return true
  },

  deleteAllMenuItemImages: async (menuItemId: string) => {
    const { error } = await supabase
      .from("menu_item_images")
      .delete()
      .eq("menu_item_id", menuItemId)
    if (error) throw error
    return true
  },
}
