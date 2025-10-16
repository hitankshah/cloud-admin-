import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Edit, Trash2, Upload, X, Eye, EyeOff } from 'lucide-react';
import { supabase, MenuItem } from '../../lib/supabase';
import { useNotification } from '../../contexts/NotificationContext';
import { AdminRouteGuard } from '../../components/AdminRouteGuard';

export const MenuManagement = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addNotification } = useNotification();
  const mountedRef = useRef(true);
  const isFetchingRef = useRef(false);
  const addNotificationRef = useRef(addNotification);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Keep notification ref updated
  useEffect(() => {
    addNotificationRef.current = addNotification;
  }, [addNotification]);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    image_url: '',
    category: 'morning' as 'morning' | 'afternoon' | 'dinner',
    is_vegetarian: false,
  });

  const fetchMenuItems = useCallback(async () => {
    if (isFetchingRef.current || !mountedRef.current) return;
    
    isFetchingRef.current = true;
    
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      if (mountedRef.current) {
        setMenuItems(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
      if (mountedRef.current) {
        addNotificationRef.current('Failed to fetch menu items', 'error');
      }
    } finally {
      if (mountedRef.current) {
        // No setLoading call needed since we removed the loading state
      }
      isFetchingRef.current = false;
    }
  }, []); // No dependencies - stable function

  useEffect(() => {
    mountedRef.current = true;
    fetchMenuItems();

    // Only create channel if it doesn't exist
    if (!channelRef.current) {
      const channelName = `menu-items-${Date.now()}`;
      console.log('MenuManagement: Creating channel', channelName);
      
      channelRef.current = supabase
        .channel(channelName)
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'menu_items' },
          (payload) => {
            console.log('MenuManagement: New item added', payload);
            if (mountedRef.current) {
              setMenuItems(prev => [payload.new as MenuItem, ...prev]);
            }
          }
        )
        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'menu_items' },
          (payload) => {
            console.log('MenuManagement: Item updated', payload);
            if (mountedRef.current) {
              setMenuItems(prev => prev.map(item => 
                item.id === payload.new.id ? payload.new as MenuItem : item
              ));
            }
          }
        )
        .on('postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'menu_items' },
          (payload) => {
            console.log('MenuManagement: Item deleted', payload);
            if (mountedRef.current) {
              setMenuItems(prev => prev.filter(item => item.id !== payload.old.id));
            }
          }
        )
        .subscribe((status) => {
          console.log('MenuManagement channel status:', status);
        });
    }

    return () => {
      console.log('MenuManagement: Cleaning up');
      mountedRef.current = false;
      
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, []); // Empty dependencies - only run once

  const uploadImage = async (file: File): Promise<string> => {
    try {
      const bucket = 'restaurant-images';
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        const status = (uploadError as any)?.status;
        addNotificationRef.current(`Upload error${status ? ` (status ${status})` : ''}.`, 'error');
        if (status === 404) {
          throw new Error(`Storage bucket "${bucket}" not found. Create it in Supabase or update your .env.local.`);
        }
        if (status === 403) {
          throw new Error(`Permission denied uploading to bucket "${bucket}". Check storage policies.`);
        }
        throw uploadError;
      }

      const { data } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      if (!data || !data.publicUrl) {
        const message = `Uploaded to bucket "${bucket}" but failed to get public URL.`;
        addNotificationRef.current(message, 'error');
        throw new Error(`Uploaded but failed to obtain public URL for "${filePath}" in bucket "${bucket}".`);
      }

      return data.publicUrl;
    } catch (error: unknown) {
      console.error('Image upload error:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission
    if (actionLoading || uploading) return;
    
    setActionLoading(true);

    try {
      let imageUrl = formData.image_url;

      if (imageFile) {
        setUploading(true);
        imageUrl = await uploadImage(imageFile);
      }

      const data = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        image_url: imageUrl,
        category: formData.category,
        is_vegetarian: formData.is_vegetarian,
        is_available: true,
      };

      if (editingId) {
        const { error } = await supabase
          .from('menu_items')
          .update(data)
          .eq('id', editingId);
        if (error) throw error;
        addNotificationRef.current('Menu item updated successfully', 'success');
      } else {
        const { error } = await supabase
          .from('menu_items')
          .insert([data]);
        if (error) throw error;
        addNotificationRef.current('Menu item added successfully', 'success');
      }

      resetForm();
      // Real-time subscription will update the list automatically
    } catch (error: unknown) {
      addNotificationRef.current(
        error instanceof Error ? error.message : 'Operation failed',
        'error'
      );
    } finally {
      setActionLoading(false);
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5242880) {
        addNotification('File size should be less than 5MB', 'error');
        return;
      }
      if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
        addNotification('Please select a valid image file', 'error');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setImagePreview(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEdit = (item: MenuItem) => {
    setFormData({
      name: item.name,
      description: item.description,
      price: item.price.toString(),
      image_url: item.image_url,
      category: item.category,
      is_vegetarian: item.is_vegetarian,
    });
    setImagePreview(item.image_url);
    setEditingId(item.id);
    setShowAddForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    if (actionLoading) return;

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
      addNotificationRef.current('Menu item deleted successfully', 'success');
      // Real-time subscription will update the list automatically
    } catch (error: unknown) {
      addNotificationRef.current(
        error instanceof Error ? error.message : 'Failed to delete item',
        'error'
      );
    } finally {
      setActionLoading(false);
    }
  };

  const toggleAvailability = async (id: string, currentStatus: boolean) => {
    if (actionLoading) return;
    
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('menu_items')
        .update({ is_available: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      addNotificationRef.current('Item availability updated', 'success');
      // Real-time subscription will update the list automatically
    } catch (error: unknown) {
      addNotificationRef.current(
        error instanceof Error ? error.message : 'Failed to update availability',
        'error'
      );
    } finally {
      setActionLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      image_url: '',
      category: 'morning',
      is_vegetarian: false,
    });
    setImageFile(null);
    setImagePreview('');
    setEditingId(null);
    setShowAddForm(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const groupedItems = {
    morning: menuItems.filter(item => item.category === 'morning'),
    afternoon: menuItems.filter(item => item.category === 'afternoon'),
    dinner: menuItems.filter(item => item.category === 'dinner'),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Menu Management</h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 transition-colors"
        >
          <Plus size={20} />
          <span>Add Item</span>
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white rounded-xl shadow-sm p-6 border-2 border-red-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">
              {editingId ? 'Edit Menu Item' : 'Add New Menu Item'}
            </h3>
            <button onClick={resetForm} className="text-gray-500 hover:text-gray-700">
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                rows={3}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as 'morning' | 'afternoon' | 'dinner' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="morning">Morning</option>
                  <option value="afternoon">Afternoon</option>
                  <option value="dinner">Dinner</option>
                </select>
              </div>

              <div className="flex items-center space-x-2 pt-6">
                <input
                  type="checkbox"
                  id="vegetarian"
                  checked={formData.is_vegetarian}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_vegetarian: e.target.checked }))}
                  className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                />
                <label htmlFor="vegetarian" className="text-sm font-medium text-gray-700">
                  Vegetarian
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Image</label>
              <div className="space-y-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                {imagePreview && (
                  <div className="relative w-32 h-32">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-full object-cover rounded-lg"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={actionLoading || uploading}
                className="flex items-center space-x-2 bg-red-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {uploading && <Upload className="animate-spin" size={16} />}
                <span>{editingId ? 'Update Item' : 'Add Item'}</span>
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {Object.entries(groupedItems).map(([category, items]) => (
        <div key={category} className="bg-white rounded-xl shadow-sm p-6 border">
          <h3 className="text-lg font-bold text-gray-900 mb-4 capitalize">
            {category} Menu ({items.length} items)
          </h3>
          
          {items.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No items in this category</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((item) => (
                <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="relative">
                    <img
                      src={item.image_url || '/placeholder-food.jpg'}
                      alt={item.name}
                      className="w-full h-32 object-cover rounded-lg mb-3"
                    />
                    <button
                      onClick={() => toggleAvailability(item.id, item.is_available)}
                      className={`absolute top-2 right-2 p-1 rounded-full ${
                        item.is_available ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                      }`}
                    >
                      {item.is_available ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                  </div>
                  
                  <h4 className="font-semibold text-gray-900 mb-1">{item.name}</h4>
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">{item.description}</p>
                  <p className="text-lg font-bold text-red-600 mb-3">${item.price}</p>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(item)}
                      className="flex items-center space-x-1 bg-blue-100 text-blue-600 px-3 py-1 rounded-lg text-sm hover:bg-blue-200 transition-colors"
                    >
                      <Edit size={14} />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="flex items-center space-x-1 bg-red-100 text-red-600 px-3 py-1 rounded-lg text-sm hover:bg-red-200 transition-colors"
                    >
                      <Trash2 size={14} />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// Wrap with admin protection
export default function ProtectedMenuManagement() {
  return (
    <AdminRouteGuard requiredRole="admin">
      <MenuManagement />
    </AdminRouteGuard>
  );
}