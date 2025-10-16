import { useState, useEffect } from 'react';
import { Users, Plus, Edit, Trash2, Shield, User as UserIcon } from 'lucide-react';
import { supabase, User } from '../../lib/supabase';
import { useNotification } from '../../contexts/NotificationContext';

export const UserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const { addNotification } = useNotification();

  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    phone: '',
    password: '',
    role: 'customer' as 'customer' | 'admin' | 'superadmin',
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      // Try RPC function first (admin only, bypasses RLS)
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_all_users');

      if (!rpcError && rpcData) {
        console.log('Users fetched via RPC:', rpcData);
        setUsers(rpcData || []);
        return;
      }

      // RPC failed, likely because the function doesn't exist
      console.log('RPC failed, trying direct query:', rpcError);
      
      // Try direct query with fallback approach
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .or('role.eq.admin,role.eq.customer,role.eq.superadmin')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Direct query also failed:', error);
        throw error;
      }
      
      console.log('Users fetched via direct query:', data);
      setUsers(data || []);
    } catch (error: unknown) {
      console.error('Error fetching users:', error);
      
      // Try one more fallback with simpler query if all else fails
      try {
        const { data: fallbackData } = await supabase
          .from('users')
          .select('*');
        
        if (fallbackData && fallbackData.length > 0) {
          console.log('Users fetched via fallback query:', fallbackData);
          setUsers(fallbackData);
          addNotification('User data loaded with limited permissions', 'info');
        } else {
          addNotification(
            error instanceof Error ? error.message : 'Failed to fetch users. Make sure you have admin permissions.',
            'error'
          );
        }
      } catch (fallbackError) {
        console.error('All attempts to fetch users failed:', fallbackError);
        addNotification(
          error instanceof Error ? error.message : 'Failed to fetch users. Make sure you have admin permissions.',
          'error'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingUser) {
        // Update existing user
        const { error } = await supabase
          .from('users')
          .update({
            full_name: formData.full_name,
            phone: formData.phone,
            role: formData.role,
          })
          .eq('id', editingUser.id);

        if (error) throw error;
        addNotification('User updated successfully', 'success');
      } else {
        // Create new user
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: formData.email,
          password: formData.password,
          email_confirm: true,
        });

        if (authError) throw authError;

        if (authData.user) {
          const { error: profileError } = await supabase
            .from('users')
            .insert({
              id: authData.user.id,
              email: formData.email,
              full_name: formData.full_name,
              phone: formData.phone,
              role: formData.role,
            });

          if (profileError) throw profileError;
        }

        addNotification('User created successfully', 'success');
      }

      resetForm();
      fetchUsers();
    } catch (error: unknown) {
      addNotification(
        error instanceof Error ? error.message : 'Operation failed',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user: User) => {
    setFormData({
      email: user.email,
      full_name: user.full_name,
      phone: user.phone,
      password: '',
      role: user.role === 'superadmin' ? 'admin' : user.role,
    });
    setEditingUser(user);
    setShowAddUser(true);
  };

  const handleDelete = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to delete user "${userEmail}"? This action cannot be undone.`)) return;

    try {
      setLoading(true);
      
      // Delete from users table first
      const { error: dbError } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (dbError) {
        console.error('Database delete error:', dbError);
        throw new Error(`Failed to delete user from database: ${dbError.message}`);
      }

      // Note: Deleting from auth.users requires service_role key
      // In production, this should be done via a backend API endpoint
      // For now, the user is removed from the app's users table
      
      addNotification('User deleted successfully', 'success');
      fetchUsers();
    } catch (error: unknown) {
      console.error('Delete user error:', error);
      addNotification(
        error instanceof Error ? error.message : 'Failed to delete user',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleUserRole = async (userId: string, currentRole: 'customer' | 'admin') => {
    const newRole = currentRole === 'admin' ? 'customer' : 'admin';
    const roleText = newRole === 'admin' ? 'Admin' : 'Customer';

    if (!confirm(`Are you sure you want to make this user a ${roleText}?`)) return;

    try {
      // Use RPC function to update role safely
      const { error } = await supabase.rpc('update_user_role', {
        target_user_id: userId,
        new_role: newRole
      });

      if (error) throw error;
      addNotification(`User role updated to ${roleText}`, 'success');
      fetchUsers();
    } catch (error: unknown) {
      addNotification(
        error instanceof Error ? error.message : 'Failed to update role',
        'error'
      );
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      full_name: '',
      phone: '',
      password: '',
      role: 'customer',
    });
    setEditingUser(null);
    setShowAddUser(false);
  };

  if (loading && users.length === 0) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-100 p-2 rounded-lg">
            <Users className="text-blue-600" size={24} />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">User Management</h2>
        </div>
        <button
          onClick={() => setShowAddUser(true)}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus size={20} />
          <span>Add User</span>
        </button>
      </div>

      {/* Add/Edit User Form */}
      {showAddUser && (
        <div className="bg-white rounded-xl shadow-md p-6 border border-blue-100">
          <div className="flex items-center space-x-2 mb-6">
            <div className="bg-blue-50 p-2 rounded-lg">
              {editingUser ? <Edit className="text-blue-600" size={20} /> : <UserIcon className="text-blue-600" size={20} />}
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              {editingUser ? 'Edit User' : 'Add New User'}
            </h3>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  required
                  disabled={!!editingUser}
                />
                {editingUser && (
                  <p className="text-xs text-gray-500 mt-1">Email cannot be changed after user creation</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">User Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as 'customer' | 'admin' | 'superadmin' }))}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white appearance-none"
                >
                  <option value="customer">Customer</option>
                  <option value="admin">Admin</option>
                  <option value="superadmin">Super Admin</option>
                </select>
              </div>
            </div>

            {!editingUser && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  required
                  minLength={6}
                />
                <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
              </div>
            )}

            <div className="flex space-x-4 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : editingUser ? 'Update User' : 'Create User'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users List */}
      {users.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-16 text-center border border-gray-200">
          <div className="bg-blue-50 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4">
            <Users className="text-blue-400" size={32} />
          </div>
          <p className="text-xl font-medium text-gray-600 mb-1">No users found</p>
          <p className="text-sm text-gray-500">Create your first user to get started</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {users.map((user) => (
            <div key={user.id} className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:border-blue-200 hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-full ${
                    user.role === 'admin' || user.role === 'superadmin' ? 'bg-blue-100 border border-blue-200' : 'bg-gray-100 border border-gray-200'
                  }`}>
                    {user.role === 'admin' || user.role === 'superadmin' ? (
                      <Shield className="text-blue-600" size={22} />
                    ) : (
                      <UserIcon className="text-gray-600" size={22} />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{user.full_name}</h3>
                    <p className="text-gray-600">{user.email}</p>
                    <div className="flex items-center mt-1">
                      <p className="text-sm text-gray-500">{user.phone || 'No phone'}</p>
                      <span className="mx-2 text-gray-300">•</span>
                      <p className="text-xs text-gray-400">
                        Joined: {new Date(user.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    user.role === 'superadmin' 
                      ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                      : user.role === 'admin'
                        ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                        : 'bg-gray-100 text-gray-700 border border-gray-200'
                  }`}>
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </span>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(user)}
                      className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all border border-blue-100"
                      title="Edit User"
                    >
                      <Edit size={16} />
                    </button>

                    {user.role !== 'superadmin' && (
                      <button
                        onClick={() => toggleUserRole(user.id, user.role as 'customer' | 'admin')}
                        className="p-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-all border border-amber-100"
                        title={`Make ${user.role === 'admin' ? 'Customer' : 'Admin'}`}
                      >
                        <Shield size={16} />
                      </button>
                    )}

                    <button
                      onClick={() => handleDelete(user.id, user.email)}
                      className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all border border-red-100"
                      title="Delete User"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};