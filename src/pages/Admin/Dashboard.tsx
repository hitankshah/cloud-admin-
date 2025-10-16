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

      if (todayError) {
        console.error('Error fetching today\'s orders:', todayError);
        // Continue with partial data instead of throwing
        addNotificationRef.current('Some data may be incomplete', 'warning');
      }

      // Calculate today's stats
      const todayOrdersCount = todayOrders?.length || 0;
      const todayRevenue = todayOrders?.reduce((sum, order) => sum + parseFloat(order.total_amount?.toString() || '0'), 0) || 0;
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
      pending: 'bg-amber-100 text-amber-700 border border-amber-200',
      confirmed: 'bg-blue-100 text-blue-700 border border-blue-200',
      preparing: 'bg-orange-100 text-orange-700 border border-orange-200',
      ready: 'bg-purple-100 text-purple-700 border border-purple-200',
      delivered: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
      cancelled: 'bg-red-100 text-red-700 border border-red-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-700 border border-gray-200';
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-gradient-to-br from-blue-50 to-white rounded-xl shadow-md p-6 border border-blue-100 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Today's Orders</p>
              <p className="text-3xl font-bold text-gray-900">{stats.todayOrders}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-xl border border-blue-200">
              <Package className="text-blue-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-white rounded-xl shadow-md p-6 border border-green-100 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Today's Revenue</p>
              <p className="text-3xl font-bold text-gray-900">${stats.todayRevenue.toFixed(2)}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-xl border border-green-200">
              <DollarSign className="text-green-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-white rounded-xl shadow-md p-6 border border-amber-100 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-amber-600">Pending Orders</p>
              <p className="text-3xl font-bold text-gray-900">{stats.pendingOrders}</p>
            </div>
            <div className="bg-amber-100 p-3 rounded-xl border border-amber-200">
              <Clock className="text-amber-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-white rounded-xl shadow-md p-6 border border-purple-100 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Total Customers</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalCustomers}</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-xl border border-purple-200">
              <Users className="text-purple-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Charts and Details Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-md p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <BarChart3 className="text-blue-600" size={20} />
              <h3 className="text-lg font-semibold text-gray-900">Weekly Revenue</h3>
            </div>
            <div className="bg-blue-50 text-blue-700 text-xs py-1 px-2 rounded-md font-medium border border-blue-100">
              Last 7 days
            </div>
          </div>
          
          <div className="h-64 flex items-end justify-between space-x-2">
            {stats.weeklyRevenue.map((revenue, index) => (
              <div key={index} className="flex flex-col items-center flex-1 group">
                <div 
                  className="bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-lg w-full transition-all duration-300 group-hover:from-blue-700 group-hover:to-blue-500 shadow-sm"
                  style={{ 
                    height: `${Math.max((revenue / maxRevenue) * 200, 4)}px`,
                    minHeight: '4px'
                  }}
                ></div>
                <div className="bg-blue-50 text-blue-800 font-medium text-xs px-2 py-1 rounded-md mt-2 opacity-0 group-hover:opacity-100 transition-opacity absolute -mt-10">
                  ${revenue.toFixed(2)}
                </div>
                <p className="text-xs font-medium text-gray-700 mt-2">{dayLabels[index]}</p>
                <p className="text-xs text-gray-500">${revenue.toFixed(0)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="text-blue-600" size={20} />
              <h3 className="text-lg font-semibold text-gray-900">Popular Items</h3>
            </div>
            <div className="bg-blue-50 text-blue-700 text-xs py-1 px-2 rounded-md font-medium border border-blue-100">
              Top 5
            </div>
          </div>
          
          <div className="space-y-4">
            {stats.popularItems.length > 0 ? (
              stats.popularItems.map((item, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 font-semibold text-xs">
                      #{index + 1}
                    </div>
                    <p className="text-sm font-medium text-gray-900 truncate max-w-[120px]">{item.name}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="bg-blue-50 text-blue-700 text-xs py-1 px-2 rounded-full font-medium">
                      {item.count} orders
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="bg-blue-50 p-4 rounded-full mb-3">
                  <TrendingUp className="text-blue-400" size={24} />
                </div>
                <p className="text-sm text-gray-500">No order data yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Recent Orders</h3>
          <button className="bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs py-1 px-3 rounded-md font-medium border border-blue-100 transition-colors">
            View All
          </button>
        </div>
        
        {stats.recentOrders.length > 0 ? (
          <div className="rounded-lg overflow-hidden border border-gray-200">
            {stats.recentOrders.map((order, index) => (
              <div 
                key={order.id} 
                className={`flex items-center justify-between p-4 hover:bg-gray-50 transition-colors ${
                  index !== stats.recentOrders.length - 1 ? 'border-b border-gray-200' : ''
                }`}
              >
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-blue-700 font-medium text-xs">{order.id.slice(-4)}</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Order #{order.id.slice(-8)}</p>
                    <div className="flex items-center space-x-2">
                      <p className="text-sm text-gray-600">{order.customer_name}</p>
                      <span className="text-gray-400">•</span>
                      <p className="text-xs text-gray-500">{new Date(order.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end">
                  <p className="font-bold text-gray-900">${parseFloat(order.total_amount.toString()).toFixed(2)}</p>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border border-dashed border-gray-200 rounded-xl">
            <div className="bg-blue-50 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4">
              <Package className="text-blue-400" size={28} />
            </div>
            <p className="text-xl font-medium text-gray-600 mb-1">No recent orders</p>
            <p className="text-sm text-gray-500">Orders will appear here once customers place them</p>
          </div>
        )}
      </div>
    </div>
  );
};