import { useState, useEffect } from 'react';
import { Menu, X, Package, Utensils, Users, LogOut, Home, LayoutDashboard, Bell, Search } from 'lucide-react';
import { Dashboard } from './Dashboard';
import { MenuManagement } from './MenuManagement';
import { OrderManagement } from './OrderManagement';
import { UserManagement } from './UserManagement';  // Import from same directory
import { useAuth } from '../../contexts/AuthContext';
import { AdminRouteGuard, useAdminPermissions } from '../../components/AdminRouteGuard';

export const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'menu' | 'users'>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const { signOut, userProfile } = useAuth();
  const { hasPermission } = useAdminPermissions();

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    
    return () => clearInterval(timer);
  }, []);

  const handleBackToHome = () => {
    window.location.href = '/';
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex overflow-hidden">
      {/* Modern Sidebar */}
      <aside 
        className={`bg-gradient-to-b from-blue-900 to-blue-800 text-white w-72 min-h-screen flex flex-col 
        transition-all duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
        fixed md:sticky top-0 z-30 md:translate-x-0 shadow-xl`}
      >
        <div className="p-6">
          {/* Logo area */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 h-10 w-10 rounded-lg flex items-center justify-center">
                <LayoutDashboard size={22} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Cloud Kitchen</h1>
                <div className="text-xs text-blue-100 opacity-80">Management Dashboard</div>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="md:hidden text-white/80 hover:text-white">
              <X size={20} />
            </button>
          </div>
          
          {/* User info */}
          <div className="mb-8 bg-white/10 rounded-xl p-4">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-sm font-semibold">
                {userProfile?.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{userProfile?.email}</p>
                <p className="text-xs text-blue-200/80">
                  {userProfile?.role === 'superadmin' ? 'Super Admin' : 'Admin'}
                </p>
              </div>
            </div>
          </div>
          
          {/* Navigation */}
          <nav className="space-y-1.5">
            <div className="text-xs text-blue-300/70 font-medium uppercase px-4 pb-2">Main</div>
            
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all 
              ${activeTab === 'dashboard' 
                ? 'bg-blue-600/30 text-white font-medium shadow-md' 
                : 'text-blue-100/80 hover:bg-white/10'}`}
            >
              <LayoutDashboard size={18} className={activeTab === 'dashboard' ? 'text-blue-200' : ''} />
              <span>Dashboard</span>
              {activeTab === 'dashboard' && <div className="ml-auto w-1.5 h-6 bg-blue-400 rounded-full"></div>}
            </button>

            <button
              onClick={() => setActiveTab('orders')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all 
              ${activeTab === 'orders' 
                ? 'bg-blue-600/30 text-white font-medium shadow-md' 
                : 'text-blue-100/80 hover:bg-white/10'}`}
            >
              <Package size={18} className={activeTab === 'orders' ? 'text-blue-200' : ''} />
              <span>Orders</span>
              {activeTab === 'orders' && <div className="ml-auto w-1.5 h-6 bg-blue-400 rounded-full"></div>}
            </button>

            <button
              onClick={() => setActiveTab('menu')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all 
              ${activeTab === 'menu' 
                ? 'bg-blue-600/30 text-white font-medium shadow-md' 
                : 'text-blue-100/80 hover:bg-white/10'}`}
            >
              <Utensils size={18} className={activeTab === 'menu' ? 'text-blue-200' : ''} />
              <span>Menu</span>
              {activeTab === 'menu' && <div className="ml-auto w-1.5 h-6 bg-blue-400 rounded-full"></div>}
            </button>

            {/* User Management is now visible to all admin users */}
            <button
              onClick={() => setActiveTab('users')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all 
              ${activeTab === 'users' 
                ? 'bg-blue-600/30 text-white font-medium shadow-md' 
                : 'text-blue-100/80 hover:bg-white/10'}`}
            >
              <Users size={18} className={activeTab === 'users' ? 'text-blue-200' : ''} />
              <span>Users</span>
              {activeTab === 'users' && <div className="ml-auto w-1.5 h-6 bg-blue-400 rounded-full"></div>}
            </button>
            
            {/* System section removed as per request */}
          </nav>
        </div>
        
        {/* Footer/Logout */}
        <div className="mt-auto p-6 border-t border-blue-700/50">
          <button
            onClick={handleBackToHome}
            className="w-full flex items-center space-x-3 px-4 py-2.5 mb-4 rounded-xl transition-all text-blue-100/80 hover:bg-white/10 border border-blue-700/50"
          >
            <Home size={18} />
            <span>Back to Website</span>
          </button>
          
          <button
            onClick={async () => {
              try {
                await signOut();
                // Hard redirect to admin login page to break any potential loops
                window.location.replace('/admin');
              } catch (error) {
                console.error('Sign out error:', error);
              }
            }}
            className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-700 hover:bg-blue-600 rounded-xl transition-all shadow-lg text-white"
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <header className="bg-white h-16 px-6 flex items-center justify-between border-b border-gray-200 sticky top-0 z-20 shadow-sm">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className={`md:hidden p-2 text-gray-600 hover:text-gray-900 ${sidebarOpen ? 'hidden' : 'block'}`}
            >
              <Menu size={22} />
            </button>
            
            <div className="text-lg font-medium text-gray-800">
              {activeTab === 'dashboard' && 'Dashboard Overview'}
              {activeTab === 'orders' && 'Order Management'}
              {activeTab === 'menu' && 'Menu Management'}
              {activeTab === 'users' && 'User Management'}
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Search */}
            <div className="relative hidden md:block">
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-64"
              />
              <Search size={18} className="absolute left-3 top-2.5 text-gray-500" />
            </div>
            
            {/* Time */}
            <div className="hidden md:block text-sm text-gray-600">
              {currentTime.toLocaleString('en-US', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              })}
            </div>
            
            {/* Notification bell - removed mock notifications */}
            <button className="relative p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
              <Bell size={20} />
            </button>
          </div>
        </header>
        
        {/* Main content area */}
        <main className="flex-1 p-6">
          {/* Greeting bar */}
          <div className="mb-6 bg-gradient-to-r from-blue-50 to-white p-4 rounded-xl border border-blue-100">
            <h2 className="text-xl font-semibold text-gray-800">
              {getGreeting()}, {userProfile?.email?.split('@')[0]}
            </h2>
            <p className="text-sm text-gray-600">
              Welcome to your cloud kitchen management dashboard
            </p>
          </div>
        
          {/* Content for each tab */}
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'orders' && <OrderManagement />}
          {activeTab === 'menu' && <MenuManagement />}
          {activeTab === 'users' && <UserManagement />}
        </main>
      </div>
    </div>
  );
};

// Export the protected version as default
export default function ProtectedAdminPanel() {
  return (
    <AdminRouteGuard requiredRole="admin">
      <AdminPanel />
    </AdminRouteGuard>
  );
}