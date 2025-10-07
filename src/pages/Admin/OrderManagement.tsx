import { useState, useEffect, useCallback, useRef } from 'react';
import { Package, Bell } from 'lucide-react';
import { supabase, Order } from '../../lib/supabase';
import { useNotification } from '../../contexts/NotificationContext';

export const OrderManagement = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { addNotification } = useNotification();
  const mountedRef = useRef(true);
  const isFetchingRef = useRef(false);
  const addNotificationRef = useRef(addNotification);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Keep notification ref updated
  useEffect(() => {
    addNotificationRef.current = addNotification;
  }, [addNotification]);

  const fetchOrders = useCallback(async () => {
    if (isFetchingRef.current || !mountedRef.current) return;
    
    isFetchingRef.current = true;
    
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      if (mountedRef.current) {
        setOrders(data || []);
        setUnreadCount(data?.filter(o => !o.is_read).length || 0);
      }
    } catch (error) {
      console.error('Error:', error);
      if (mountedRef.current) {
        addNotificationRef.current('Failed to fetch orders', 'error');
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
    fetchOrders();
    
    // Only create channel if it doesn't exist
    if (!channelRef.current) {
      const channelName = `orders-${Date.now()}`;
      console.log('OrderManagement: Creating channel', channelName);
      
      channelRef.current = supabase
        .channel(channelName)
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'orders' },
          (payload) => {
            console.log('OrderManagement: New order received', payload);
            if (mountedRef.current) {
              addNotificationRef.current('New order received!', 'info');
              setOrders(prev => [payload.new as Order, ...prev]);
              setUnreadCount(prev => prev + 1);
            }
          }
        )
        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'orders' },
          (payload) => {
            console.log('OrderManagement: Order updated', payload);
            if (mountedRef.current) {
              setOrders(prev => {
                const updated = prev.map(order => 
                  order.id === payload.new.id ? payload.new as Order : order
                );
                // Recalculate unread count
                setUnreadCount(updated.filter(o => !o.is_read).length);
                return updated;
              });
            }
          }
        )
        .on('postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'orders' },
          (payload) => {
            console.log('OrderManagement: Order deleted', payload);
            if (mountedRef.current) {
              setOrders(prev => prev.filter(order => order.id !== payload.old.id));
            }
          }
        )
        .subscribe((status) => {
          console.log('OrderManagement channel status:', status);
        });
    }

    return () => {
      console.log('OrderManagement: Cleaning up');
      mountedRef.current = false;
      
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, []); // Empty dependencies - only run once

  const updateOrderStatus = async (id: string, status: string) => {
    if (actionLoading) return;
    
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status, is_read: true })
        .eq('id', id);

      if (error) throw error;
      addNotificationRef.current('Order status updated', 'success');
      // Real-time subscription will update the list automatically
    } catch (error: unknown) {
      addNotificationRef.current(
        error instanceof Error ? error.message : 'Failed to update',
        'error'
      );
    } finally {
      setActionLoading(false);
    }
  };

  const statusOptions = [
    { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'confirmed', label: 'Confirmed', color: 'bg-blue-100 text-blue-800' },
    { value: 'preparing', label: 'Preparing', color: 'bg-orange-100 text-orange-800' },
    { value: 'ready', label: 'Ready', color: 'bg-purple-100 text-purple-800' },
    { value: 'delivered', label: 'Delivered', color: 'bg-emerald-100 text-emerald-800' },
    { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800' },
  ];

  if (loading) {
    return <div className="flex justify-center py-12">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Order Management</h2>
        {unreadCount > 0 && (
          <div className="flex items-center space-x-2 bg-red-100 text-red-800 px-4 py-2 rounded-lg">
            <Bell size={20} />
            <span className="font-semibold">{unreadCount} New Order{unreadCount > 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      {orders.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-16 text-center">
          <Package className="mx-auto text-gray-300 mb-4" size={64} />
          <p className="text-xl text-gray-600">No orders yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className={`bg-white rounded-xl shadow-sm p-6 border-2 ${
                !order.is_read ? 'border-red-300' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Order #{order.id.slice(-8)}</h3>
                  <p className="text-gray-600">{order.customer_name}</p>
                  <p className="text-sm text-gray-500">{order.customer_email} • {order.customer_phone}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(order.created_at).toLocaleDateString()} at {new Date(order.created_at).toLocaleTimeString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-emerald-600">${parseFloat(order.total_amount.toString()).toFixed(2)}</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                    statusOptions.find(s => s.value === order.status)?.color || 'bg-gray-100 text-gray-800'
                  }`}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-sm font-medium text-gray-700 mb-1">Delivery Address:</p>
                <p className="text-sm text-gray-900">{order.delivery_address}</p>
                {order.special_instructions && (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-gray-700 mb-1">Special Instructions:</p>
                    <p className="text-sm text-gray-900">{order.special_instructions}</p>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {statusOptions.map((status) => (
                  <button
                    key={status.value}
                    onClick={() => updateOrderStatus(order.id, status.value)}
                    disabled={actionLoading || order.status === status.value}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      order.status === status.value
                        ? `${status.color} cursor-not-allowed`
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50'
                    }`}
                  >
                    {status.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};