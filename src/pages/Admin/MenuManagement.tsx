import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Edit, Trash2, Upload, X, Eye, EyeOff } from 'lucide-react';
import { supabase, MenuItem, MenuItemImage } from '../../lib/supabase';
import { useNotification } from '../../contexts/NotificationContext';
import { AdminRouteGuard } from '../../components/AdminRouteGuard';

export const MenuManagement = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]); // Changed to array
  const [imagePreviews, setImagePreviews] = useState<string[]>([]); // Changed to array
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
    image_url: '', // Primary image
    category: 'morning' as MenuItem['category'],
    is_vegetarian: false,
  });

  const sortByCreatedAtDesc = useCallback((items: MenuItem[]) => {
    return [...items].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, []);

  const mergeItem = useCallback((items: MenuItem[], incoming: MenuItem) => {
    const filtered = items.filter(item => item.id !== incoming.id);
    return sortByCreatedAtDesc([incoming, ...filtered]);
  }, [sortByCreatedAtDesc]);

  const fetchMenuItems = useCallback(async () => {
    if (isFetchingRef.current || !mountedRef.current) return;
    
    isFetchingRef.current = true;
    
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching menu items:', error);
        addNotificationRef.current('Error loading menu items. Will retry...', 'warning');
        
        // Try fallback query with simpler approach
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('menu_items')
          .select('*');
          
        if (fallbackError || !fallbackData) {
          throw error; // If fallback also fails, throw original error
        }
        
        // Use fallback data
        if (mountedRef.current) {
          setMenuItems(sortByCreatedAtDesc(fallbackData));
          addNotificationRef.current('Menu items loaded with limited data', 'info');
        }
        return;
      }
      
      if (mountedRef.current) {
        setMenuItems(sortByCreatedAtDesc(data || []));
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
  }, [sortByCreatedAtDesc]);

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
              setMenuItems(prev => mergeItem(prev, payload.new as MenuItem));
            }
          }
        )
        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'menu_items' },
          (payload) => {
            console.log('MenuManagement: Item updated', payload);
            if (mountedRef.current) {
              setMenuItems(prev => mergeItem(prev, payload.new as MenuItem));
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

      // Upload with optimized settings for speed
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type, // Explicitly set content type for faster processing
        });

      if (uploadError) {
        const status = (uploadError as any)?.status;
        const message = `Failed to upload ${file.name}${status ? ` (status ${status})` : ''}`;
        addNotificationRef.current(message, 'error');
        
        if (status === 404) {
          throw new Error(`Storage bucket "${bucket}" not found. Please create it in Supabase.`);
        }
        if (status === 403) {
          throw new Error(`Permission denied. Check storage policies for bucket "${bucket}".`);
        }
        throw new Error(message);
      }

      // Get public URL
      const { data } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      if (!data || !data.publicUrl) {
        throw new Error(`Failed to get public URL for "${filePath}"`);
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
      let primaryImageUrl = formData.image_url;
      const uploadedImageUrls: string[] = [];

      // Upload all new images IN PARALLEL for much faster performance
      if (imageFiles.length > 0) {
        setUploading(true);
        addNotificationRef.current(`Uploading ${imageFiles.length} image(s)...`, 'info');
        
        try {
          // Upload all images simultaneously
          const uploadPromises = imageFiles.map(file => uploadImage(file));
          const results = await Promise.all(uploadPromises);
          uploadedImageUrls.push(...results);
          
          addNotificationRef.current(`${uploadedImageUrls.length} image(s) uploaded successfully`, 'success');
          
          // Use first uploaded image as primary if no primary was set
          if (!primaryImageUrl && uploadedImageUrls.length > 0) {
            primaryImageUrl = uploadedImageUrls[0];
          }
        } finally {
          // Always clear uploading state after images are done
          setUploading(false);
        }
      }

      const data = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        image_url: primaryImageUrl, // Primary/thumbnail image
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
        
        // Save additional images to menu_item_images table IN PARALLEL
        if (uploadedImageUrls.length > 0) {
          const imageInsertPromises = uploadedImageUrls.map((url, i) =>
            supabase
              .from('menu_item_images')
              .upsert({
                menu_item_id: editingId,
                image_url: url,
                image_order: i,
              })
          );
          await Promise.all(imageInsertPromises);
        }
        
        addNotificationRef.current('Menu item updated successfully', 'success');
        // Don't call fetchMenuItems - real-time subscription will update the list
      } else {
        const { error, data: insertedData } = await supabase
          .from('menu_items')
          .insert([data])
          .select();
        if (error) throw error;
        
        const newItemId = insertedData?.[0]?.id;
        
        // Save additional images to menu_item_images table IN PARALLEL
        if (newItemId && uploadedImageUrls.length > 0) {
          const imageInsertPromises = uploadedImageUrls.map((url, i) =>
            supabase
              .from('menu_item_images')
              .insert({
                menu_item_id: newItemId,
                image_url: url,
                image_order: i,
              })
          );
          await Promise.all(imageInsertPromises);
        }
        
        addNotificationRef.current('Menu item added successfully', 'success');
        // Don't call fetchMenuItems - real-time subscription will update the list
      }

      // Reset form BEFORE clearing loading states to prevent UI issues
      resetForm();
    } catch (error: unknown) {
      addNotificationRef.current(
        error instanceof Error ? error.message : 'Operation failed',
        'error'
      );
    } finally {
      // Clear loading states - this must happen to unlock the UI
      setUploading(false);
      setActionLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Maximum 4 images per item
    if (files.length + imageFiles.length > 4) {
      addNotification('Maximum 4 images per item allowed', 'error');
      return;
    }
    
    const newPreviews: string[] = [];
    const validFiles: File[] = [];
    
    for (const file of files) {
      if (file.size > 5242880) {
        addNotification(`${file.name} is larger than 5MB`, 'error');
        continue;
      }
      if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
        addNotification(`${file.name} is not JPG or PNG`, 'error');
        continue;
      }
      
      validFiles.push(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImagePreviews(prev => [...prev, event.target?.result as string]);
        }
      };
      reader.readAsDataURL(file);
    }
    
    if (validFiles.length > 0) {
      setImageFiles(prev => [...prev, ...validFiles]);
      addNotification(`${validFiles.length} image(s) selected`, 'success');
    }
  };

  const handleEdit = async (item: MenuItem) => {
    try {
      setFormData({
        name: item.name,
        description: item.description,
        price: item.price.toString(),
        image_url: item.image_url,
        category: item.category,
        is_vegetarian: item.is_vegetarian,
      });
      
      // Load existing images (if table exists)
      try {
        const { data: existingImages, error } = await supabase
          .from('menu_item_images')
          .select('*')
          .eq('menu_item_id', item.id)
          .order('image_order', { ascending: true });
        
        if (!error && existingImages && existingImages.length > 0) {
          setImagePreviews(existingImages.map(img => img.image_url));
        } else {
          // If no additional images or table doesn't exist, just show primary image
          if (item.image_url) {
            setImagePreviews([item.image_url]);
          } else {
            setImagePreviews([]);
          }
        }
      } catch (imageError) {
        // Table might not exist yet, just use primary image
        console.warn('Could not load additional images:', imageError);
        if (item.image_url) {
          setImagePreviews([item.image_url]);
        } else {
          setImagePreviews([]);
        }
      }
      
      setEditingId(item.id);
      setShowAddForm(true);
    } catch (error) {
      console.error('Error in handleEdit:', error);
      addNotificationRef.current('Failed to load item for editing', 'error');
    }
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
    setImageFiles([]);
    setImagePreviews([]);
    setEditingId(null);
    setShowAddForm(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const itemsForCategory = useCallback(
    (category: Exclude<MenuItem['category'], 'all'>) => {
      return menuItems.filter(item => item.category === category || item.category === 'all');
    },
    [menuItems]
  );

  const groupedItems = {
    morning: itemsForCategory('morning'),
    afternoon: itemsForCategory('afternoon'),
    dinner: itemsForCategory('dinner'),
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
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as MenuItem['category'] }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="morning">Morning</option>
                  <option value="afternoon">Afternoon</option>
                  <option value="dinner">Dinner</option>
                  <option value="all">All Day</option>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Images (Up to 4) - {imagePreviews.length}/4
              </label>
              <div className="space-y-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  disabled={imagePreviews.length >= 4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                <p className="text-xs text-gray-500">
                  Accepted formats: JPG or PNG. Maximum 4 images per item. Max 5MB per file.
                </p>
                
                {imagePreviews.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg border border-gray-200"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setImagePreviews(prev => prev.filter((_, i) => i !== index));
                            setImageFiles(prev => prev.filter((_, i) => i !== index));
                          }}
                          className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={14} />
                        </button>
                        <span className="absolute bottom-1 left-1 bg-black text-white text-xs px-2 py-1 rounded">
                          {index + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              {uploading && (
                <div className="flex items-center space-x-2 text-blue-600 bg-blue-50 px-4 py-2 rounded-lg">
                  <Upload className="animate-spin" size={16} />
                  <span className="text-sm font-medium">Uploading images in parallel... This will only take a few seconds!</span>
                </div>
              )}
              
              <div className="flex space-x-4">
                <button
                  type="submit"
                  disabled={actionLoading || uploading}
                  className="flex items-center space-x-2 bg-red-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading && <Upload className="animate-spin" size={16} />}
                  <span>{uploading ? 'Uploading...' : (editingId ? 'Update Item' : 'Add Item')}</span>
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={uploading}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
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
                      disabled={actionLoading || uploading}
                      className="flex items-center space-x-1 bg-blue-100 text-blue-600 px-3 py-1 rounded-lg text-sm hover:bg-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Edit size={14} />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={actionLoading || uploading}
                      className="flex items-center space-x-1 bg-red-100 text-red-600 px-3 py-1 rounded-lg text-sm hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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