'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { AdminLogin } from '@/components/admin/admin-login'
import { UserManagement } from '@/components/admin/user-management'
import { MenuManagement } from '@/components/admin/menu-management'
import { OrderManagement } from '@/components/admin/order-management'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/toaster'
import { ChefHat, Users, ClipboardList, UtensilsCrossed, LogOut, LayoutDashboard, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

type Tab = 'dashboard' | 'users' | 'menu' | 'orders'

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalMenuItems: 0,
    totalOrders: 0,
    pendingOrders: 0,
  })

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      fetchStats()
    }
  }, [isAuthenticated])

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()

        if (profile?.role === 'admin') {
          setIsAuthenticated(true)
        }
      }
    } catch (error) {
      console.error('Auth check error:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const [usersResult, menuResult, ordersResult, pendingResult] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('menu_items').select('id', { count: 'exact', head: true }),
        supabase.from('orders').select('id', { count: 'exact', head: true }),
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      ])

      setStats({
        totalUsers: usersResult.count || 0,
        totalMenuItems: menuResult.count || 0,
        totalOrders: ordersResult.count || 0,
        pendingOrders: pendingResult.count || 0,
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setIsAuthenticated(false)
    setActiveTab('dashboard')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-amber-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <AdminLogin onLoginSuccess={() => setIsAuthenticated(true)} />
  }

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'menu', label: 'Menu', icon: UtensilsCrossed },
    { id: 'orders', label: 'Orders', icon: ClipboardList },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-amber-600 to-orange-600 p-2 rounded-lg">
                <ChefHat className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Bhojanalay</h1>
                <p className="text-sm text-gray-600">Kitchen Dashboard</p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="gap-2"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as Tab)}
                  className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'text-amber-600 border-b-2 border-amber-600 bg-amber-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Dashboard Overview</h2>
              <p className="text-gray-600">Monitor your restaurant operations at a glance</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-600 mb-1">Total Users</p>
                      <p className="text-3xl font-bold text-blue-900">{stats.totalUsers}</p>
                    </div>
                    <Users className="w-12 h-12 text-blue-600 opacity-80" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-amber-600 mb-1">Menu Items</p>
                      <p className="text-3xl font-bold text-amber-900">{stats.totalMenuItems}</p>
                    </div>
                    <UtensilsCrossed className="w-12 h-12 text-amber-600 opacity-80" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-600 mb-1">Total Orders</p>
                      <p className="text-3xl font-bold text-green-900">{stats.totalOrders}</p>
                    </div>
                    <TrendingUp className="w-12 h-12 text-green-600 opacity-80" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-red-50 to-pink-50 border-red-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-red-600 mb-1">Pending Orders</p>
                      <p className="text-3xl font-bold text-red-900">{stats.pendingOrders}</p>
                    </div>
                    <ClipboardList className="w-12 h-12 text-red-600 opacity-80" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mt-8">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setActiveTab('users')}>
                <CardContent className="p-6">
                  <Users className="w-10 h-10 text-blue-600 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">User Management</h3>
                  <p className="text-gray-600 text-sm">Manage staff accounts and assign roles</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setActiveTab('menu')}>
                <CardContent className="p-6">
                  <UtensilsCrossed className="w-10 h-10 text-amber-600 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Menu Control</h3>
                  <p className="text-gray-600 text-sm">Update menu items and pricing</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setActiveTab('orders')}>
                <CardContent className="p-6">
                  <ClipboardList className="w-10 h-10 text-green-600 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Order Tracking</h3>
                  <p className="text-gray-600 text-sm">Monitor and manage orders</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'users' && <UserManagement />}
        {activeTab === 'menu' && <MenuManagement />}
        {activeTab === 'orders' && <OrderManagement />}
      </main>

      <Toaster />
    </div>
  )
}
