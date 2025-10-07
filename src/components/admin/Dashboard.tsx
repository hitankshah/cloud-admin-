import { useState, useEffect, useCallback, useRef } from 'react';
import { BarChart3, TrendingUp, Package, Users, DollarSign, Clock } from 'lucide-react';
import { supabase, Order } from '../../lib/supabase';
import { useNotification } from '../../contexts/NotificationContext';

interface DashboardStats {
  todayOrders: number;
  todayRevenue: number;
  pendingOrders: number;
  totalCustomers: number;
  totalMenuItems: number;
  weeklyRevenue: number[];
  popularItems: Array<{ name: string; count: number }>;
  recentOrders: Order[];
}

export const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    todayOrders: 0,
    todayRevenue: 0,
    pendingOrders: 0,
    totalCustomers: 0,
    totalMenuItems: 0,
    weeklyRevenue: [],
    popularItems: [],
    recentOrders: [],
  });
  const [loading, setLoading] = useState(true);
  const { addNotification } = useNotification();
  const isFetchingRef = useRef(false);
  const mountedRef = useRef(true);
  const addNotificationRef = useRef(addNotification);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Keep notification ref updated
  useEffect(() => {
    addNotificationRef.current = addNotification;
  }, [addNotification]);

  const fetchDashboardData = useCallback(async () => {
    // Prevent concurrent fetches
    if (isFetchingRef.current || !mountedRef.current) return;
    
    isFetchingRef.current = true;
    
    try {
      // Get today's date range
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStart = today.toISOString();
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const todayEnd = tomorrow.toISOString();

      // Fetch today's orders
      const { data: todayOrders, error: todayError } = await supabase
        .from('orders')
        .select('total_amount, status')
        .gte('created_at', todayStart)
        .lt('created_at', todayEnd);

      if (todayError) throw todayError;

      // Calculate today's stats
      const todayOrdersCount = todayOrders?.length || 0;
      const todayRevenue = todayOrders?.reduce((sum, order) => sum + parseFloat(order.total_amount.toString()), 0) || 0;
      const pendingCount = todayOrders?.filter(o => o.status === 'pending').length || 0;

      // Fetch total customers
      const { count: customersCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'customer');

      // Fetch total menu items
      const { count: menuCount } = await supabase
        .from('menu_items')
        .select('*', { count: 'exact', head: true });

      // Fetch last 7 days revenue for chart
      const weeklyRevenue: number[] = [];
      for (let i = 6; i >= 0; i--) {
        const dayStart = new Date(today);
        dayStart.setDate(dayStart.getDate() - i);
        dayStart.setHours(0, 0, 0, 0);
        
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);

        const { data: dayOrders } = await supabase
          .from('orders')
          .select('total_amount')
          .gte('created_at', dayStart.toISOString())
          .lt('created_at', dayEnd.toISOString());

        const dayRevenue = dayOrders?.reduce((sum, order) => sum + parseFloat(order.total_amount.toString()), 0) || 0;
        weeklyRevenue.push(dayRevenue);
      }

      // Fetch popular items (from order_items)
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('item_name')
        .limit(1000);

      const itemCounts: { [key: string]: number } = {};
      orderItems?.forEach(item => {
        itemCounts[item.item_name] = (itemCounts[item.item_name] || 0) + 1;
      });

      const popularItems = Object.entries(itemCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));

      // Fetch recent orders
      const { data: recentOrders } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (!mountedRef.current) return;

      setStats({
        todayOrders: todayOrdersCount,
        todayRevenue,
        pendingOrders: pendingCount,
        totalCustomers: customersCount || 0,
        totalMenuItems: menuCount || 0,
        weeklyRevenue,
        popularItems,
        recentOrders: recentOrders || [],
      });

    } catch (error: unknown) {
      console.error('Error fetching dashboard data:', error);
      if (mountedRef.current) {
        addNotificationRef.current('Failed to fetch dashboard data', 'error');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
      isFetchingRef.current = false;
    }
  }, []); // No dependencies - stable function

  useEffect(() => {
    mountedRef.current = true;
    fetchDashboardData();
    
    // Only create channel if it doesn't exist
    if (!channelRef.current) {
      const channelName = `dashboard-orders-${Date.now()}`;
      console.log('Dashboard: Creating channel', channelName);
      
      channelRef.current = supabase
        .channel(channelName)
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'orders' }, 
          (payload) => {
            console.log('Dashboard: Order change detected', payload);
            
            // Debounce the refresh to avoid too many calls
            if (debounceTimerRef.current) {
              clearTimeout(debounceTimerRef.current);
            }
            
            debounceTimerRef.current = setTimeout(() => {
              if (mountedRef.current) {
                fetchDashboardData();
              }
            }, 1000);
          }
        )
        .subscribe((status) => {
          console.log('Dashboard channel status:', status);
        });
    }

    return () => {
      console.log('Dashboard: Cleaning up');
      mountedRef.current = false;
      
      // Clear debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      
      // Unsubscribe channel
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, []); // Empty dependencies - only run once

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      preparing: 'bg-orange-100 text-orange-800',
      ready: 'bg-purple-100 text-purple-800',
      delivered: 'bg-emerald-100 text-emerald-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const maxRevenue = Math.max(...stats.weeklyRevenue, 1);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const todayIndex = new Date().getDay();
  const dayLabels: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const dayIndex = (todayIndex - i + 7) % 7;
    dayLabels.push(days[dayIndex]);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard Overview</h2>
        <p className="text-gray-600">Monitor your restaurant&apos;s performance</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Today&apos;s Orders</p>
              <p className="text-2xl font-bold text-gray-900">{stats.todayOrders}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <Package className="text-blue-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Today&apos;s Revenue</p>
              <p className="text-2xl font-bold text-gray-900">${stats.todayRevenue.toFixed(2)}</p>
            </div>
            <div className="bg-emerald-100 p-3 rounded-lg">
              <DollarSign className="text-emerald-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Orders</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingOrders}</p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-lg">
              <Clock className="text-yellow-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Customers</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalCustomers}</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <Users className="text-purple-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Charts and Details Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center space-x-2 mb-6">
            <BarChart3 className="text-red-600" size={24} />
            <h3 className="text-lg font-bold text-gray-900">Weekly Revenue</h3>
          </div>
          
          <div className="h-64 flex items-end justify-between space-x-2">
            {stats.weeklyRevenue.map((revenue, index) => (
              <div key={index} className="flex flex-col items-center flex-1">
                <div 
                  className="bg-red-500 rounded-t-lg w-full transition-all duration-300 hover:bg-red-600"
                  style={{ 
                    height: `${Math.max((revenue / maxRevenue) * 200, 4)}px`,
                    minHeight: '4px'
                  }}
                ></div>
                <p className="text-xs text-gray-600 mt-2">{dayLabels[index]}</p>
                <p className="text-xs text-gray-500">${revenue.toFixed(0)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center space-x-2 mb-6">
            <TrendingUp className="text-red-600" size={24} />
            <h3 className="text-lg font-bold text-gray-900">Popular Items</h3>
          </div>
          
          <div className="space-y-3">
            {stats.popularItems.length > 0 ? (
              stats.popularItems.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                  </div>
                  <p className="text-sm text-gray-600">{item.count} orders</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No orders yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-xl shadow-sm p-6 border">
        <h3 className="text-lg font-bold text-gray-900 mb-6">Recent Orders</h3>
        
        {stats.recentOrders.length > 0 ? (
          <div className="space-y-4">
            {stats.recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Order #{order.id.slice(-8)}</p>
                  <p className="text-sm text-gray-600">{order.customer_name}</p>
                  <p className="text-xs text-gray-500">{new Date(order.created_at).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">${parseFloat(order.total_amount.toString()).toFixed(2)}</p>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Package className="mx-auto text-gray-300 mb-4" size={64} />
            <p className="text-xl text-gray-600">No recent orders</p>
          </div>
        )}
      </div>
    </div>
  );
};