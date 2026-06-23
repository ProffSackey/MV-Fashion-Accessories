import { supabase, supabaseAdmin } from './supabaseClient';

/**
 * Promotion Interface
 */
export interface Promotion {
  id?: string;
  name: string;
  type: "Percentage" | "Fixed";
  discount: string;
  deadline: string;
  description?: string;
  code: string;
  product_ids: string[];
  is_active: boolean;
  start_date: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Product Interface
 */
export interface Product {
  id?: string;
  name: string;
  description?: string;
  price: string;
  category: string;
  image_url?: string;
  images?: string[];
  status: string;
  stock_quantity?: number;
  rating?: number;
  about?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Category Interface
 */
export interface Category {
  id?: string;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Review Interface
 */
export interface Review {
  id?: string;
  product_id: string;
  rating: number;
  comment?: string;
  created_at?: string;
  // future: customer_id, status, etc.
}

/**
 * Notification Interface
 */
export interface Notification {
  id?: string;
  type: string;                // e.g. 'order_status', 'promotion', 'system', 'alert'
  title: string;
  message: string;
  recipient_type: string;      // 'admin' | 'customer' | 'all'
  recipient_email?: string;    // null for all
  is_read?: boolean;
  action_url?: string;
  metadata?: any;
  created_at?: string;
  updated_at?: string;
}


/**
 * Fetch all promotions
 */
export const fetchPromotions = async (): Promise<Promotion[]> => {
  try {
    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching promotions:', error);
      return [];
    }

    return (data || []).map((p) => ({
      ...p,
      product_ids: p.product_ids || [],
    }));
  } catch (error) {
    console.error('Error fetching promotions:', error);
    return [];
  }
};

/**
 * Fetch a single promotion by ID
 */
export const fetchPromotion = async (id: string): Promise<Promotion | null> => {
  try {
    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching promotion:', error);
      return null;
    }

    return data || null;
  } catch (error) {
    console.error('Error fetching promotion:', error);
    return null;
  }
};

/**
 * Create a new promotion
 */
export const createPromotion = async (promotion: Promotion): Promise<Promotion | null> => {
  try {
    // Log the promotion data being sent for debugging
    console.log('[createPromotion] Sending promotion data:', {
      name: promotion.name,
      code: promotion.code,
      type: promotion.type,
      discount: promotion.discount,
      deadline: promotion.deadline,
      deadlineType: typeof promotion.deadline,
      is_active: promotion.is_active,
      product_ids: promotion.product_ids,
      start_date: promotion.start_date
    });

    if (!supabaseAdmin) {
      console.error('supabaseAdmin is not configured (missing SUPABASE_SERVICE_ROLE_KEY)');
      return null;
    }

    const { data, error } = await supabaseAdmin
      .from('promotions')
      .insert([promotion])
      .select()
      .single();

    if (error) {
      console.error('Error creating promotion:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        promotionData: promotion
      });
      return null;
    }

    console.log('[createPromotion] Promotion created successfully:', data);
    return data || null;
  } catch (error) {
    console.error('Error creating promotion - Caught Exception:', {
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : undefined,
      errorType: typeof error,
      fullError: error
    });
    return null;
  }
};

/**
 * Update a promotion
 */
export const updatePromotion = async (id: string, updates: Partial<Promotion>): Promise<Promotion | null> => {
  try {
    console.log('[updatePromotion] Updating promotion:', { id, updates });

    if (!supabaseAdmin) {
      console.error('supabaseAdmin is not configured (missing SUPABASE_SERVICE_ROLE_KEY)');
      return null;
    }

    const { data, error } = await supabaseAdmin
      .from('promotions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating promotion:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        id,
        updates
      });
      return null;
    }

    return data || null;
  } catch (error) {
    console.error('Error updating promotion:', error);
    return null;
  }
};

/**
 * Delete a promotion
 */
export const deletePromotion = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('promotions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting promotion:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deleting promotion:', error);
    return false;
  }
};

// ============= REVIEWS =============

/**
 * Fetch reviews for a given product (or all if no id provided)
 */
export const fetchReviews = async (productId?: string): Promise<Review[]> => {
  try {
    let query = supabase.from('reviews').select('*');
    if (productId) {
      query = query.eq('product_id', productId);
    }
    const { data, error } = await query;
    if (error) {
      console.error('Error fetching reviews:', error);
      return [];
    }
    return data || [];
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return [];
  }
};

/**
 * Submit a new review and update product rating average
 */
export const submitReview = async (
  review: Review
): Promise<Review | null> => {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .insert([review])
      .select()
      .single();
    if (error) {
      console.error('Error creating review:', error);
      return null;
    }
    return data || null;
  } catch (error) {
    console.error('Error creating review:', error);
    return null;
  }
};

// ============= NOTIFICATIONS =============

/**
 * Fetch notifications. Optionally filter by recipient_type or email.
 */
export const fetchNotifications = async (
  recipientType?: string,
  recipientEmail?: string
): Promise<Notification[]> => {
  try {
    const res = await fetch('/api/admin/notifications');
    if (!res.ok) {
      console.error('Error fetching notifications:', await res.text());
      return [];
    }
    const data = await res.json();
    return (data || []).map((n: any) => ({ ...n, is_read: n.is_read ?? false }));
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
};

/**
 * Mark single notification as read
 */
export const markNotificationRead = async (id: string): Promise<boolean> => {
  try {
    const res = await fetch('/api/admin/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) {
      console.error('Error marking notification read:', await res.text());
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error marking notification read:', error);
    return false;
  }
};

/**
 * Mark all notifications read (optionally filtered)
 */
export const markAllNotificationsRead = async (
  recipientType?: string,
  recipientEmail?: string
): Promise<boolean> => {
  try {
    const res = await fetch('/api/admin/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAll: true }),
    });
    if (!res.ok) {
      console.error('Error marking all notifications read:', await res.text());
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error marking all notifications read:', error);
    return false;
  }
};

/**
 * Create a new notification record
 */
export const createNotification = async (
  notification: Notification
): Promise<Notification | null> => {
  try {
    const res = await fetch('/api/admin/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notification),
    });
    if (!res.ok) {
      console.error('Error creating notification:', await res.text());
      return null;
    }
    const data = await res.json();
    return data;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};

// ============= PRODUCTS =============

/**
 * Fetch all products
 */
export const fetchProducts = async (): Promise<Product[]> => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching products:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
};

/**
 * Fetch products by category
 */
export const fetchProductsByCategory = async (category: string): Promise<Product[]> => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('category', category)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching products:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
};

/**
 * Fetch a single product
 */
export const fetchProduct = async (id: string): Promise<Product | null> => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching product:', error);
      return null;
    }

    return data || null;
  } catch (error) {
    console.error('Error fetching product:', error);
    return null;
  }
};

/**
 * Create a new product
 */
export const createProduct = async (product: Product): Promise<Product | null> => {
  try {
    const { data, error } = await supabase
      .from('products')
      .insert([product])
      .select()
      .single();

    if (error) {
      console.error('Error creating product:', error);
      return null;
    }

    return data || null;
  } catch (error) {
    console.error('Error creating product:', error);
    return null;
  }
};

/**
 * Update a product
 */
export const updateProduct = async (id: string, updates: Partial<Product>): Promise<Product | null> => {
  try {
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating product:', error);
      return null;
    }

    return data || null;
  } catch (error) {
    console.error('Error updating product:', error);
    return null;
  }
};

/**
 * Delete a product
 */
export const deleteProduct = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting product:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deleting product:', error);
    return false;
  }
};

// ============= CATEGORIES =============

/**
 * Fetch all categories
 */
export const fetchCategories = async (): Promise<Category[]> => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching categories:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
};

/**
 * Create a new category
 */
export const createCategory = async (category: Category): Promise<Category | null> => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .insert([category])
      .select()
      .single();

    if (error) {
      console.error('Error creating category:', error);
      return null;
    }

    return data || null;
  } catch (error) {
    console.error('Error creating category:', error);
    return null;
  }
};

/**
 * Update a category
 */
export const updateCategory = async (id: string, updates: Partial<Category>): Promise<Category | null> => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating category:', error);
      return null;
    }

    return data || null;
  } catch (error) {
    console.error('Error updating category:', error);
    return null;
  }
};

/**
 * Delete a category
 */
export const deleteCategory = async (name: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('name', name);

    if (error) {
      console.error('Error deleting category:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deleting category:', error);
    return false;
  }
};

/**
 * Shipping Zone Interface
 */
export interface ShippingZone {
  id?: string;
  name: string;
  country: string;
  region?: string;
  base_fee: number;
  per_km_fee: number;
  min_delivery_days: number;
  max_delivery_days: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * Calculate shipping fee based on location (zone name, region code, or country)
 */
export const calculateShippingFee = async (location: string): Promise<{ fee: number; minDays: number; maxDays: number } | null> => {
  try {
    const query = location.toUpperCase();

    // First, try to find by zone name
    let { data, error } = await supabase
      .from('shipping_zones')
      .select('base_fee, per_km_fee, min_delivery_days, max_delivery_days')
      .ilike('name', `%${query}%`)
      .eq('is_active', true)
      .limit(1)
      .single();

    if (!error && data) {
      return {
        fee: parseFloat(data.base_fee),
        minDays: data.min_delivery_days,
        maxDays: data.max_delivery_days,
      };
    }

    // If not found by name, try by region
    ({ data, error } = await supabase
      .from('shipping_zones')
      .select('base_fee, per_km_fee, min_delivery_days, max_delivery_days')
      .ilike('region', `%${query}%`)
      .eq('is_active', true)
      .limit(1)
      .single());

    if (!error && data) {
      return {
        fee: parseFloat(data.base_fee),
        minDays: data.min_delivery_days,
        maxDays: data.max_delivery_days,
      };
    }

    // If not found by region, try by country
    ({ data, error } = await supabase
      .from('shipping_zones')
      .select('base_fee, per_km_fee, min_delivery_days, max_delivery_days')
      .eq('country', query)
      .eq('is_active', true)
      .limit(1)
      .single());

    if (!error && data) {
      return {
        fee: parseFloat(data.base_fee),
        minDays: data.min_delivery_days,
        maxDays: data.max_delivery_days,
      };
    }

    // If still not found, try country-wide (region = NULL)
    ({ data, error } = await supabase
      .from('shipping_zones')
      .select('base_fee, per_km_fee, min_delivery_days, max_delivery_days')
      .eq('country', query)
      .is('region', null)
      .eq('is_active', true)
      .limit(1)
      .single());

    if (error || !data) {
      console.error('Shipping zone not found for location:', location);
      return null;
    }

    return {
      fee: parseFloat(data.base_fee),
      minDays: data.min_delivery_days,
      maxDays: data.max_delivery_days,
    };
  } catch (error) {
    console.error('Error calculating shipping fee:', error);
    return null;
  }
};

/**
 * Get all active shipping zones
 */
export const getShippingZones = async (): Promise<ShippingZone[]> => {
  try {
    const { data, error } = await supabase
      .from('shipping_zones')
      .select('*')
      .eq('is_active', true)
      .order('country', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching shipping zones:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching shipping zones:', error);
    return [];
  }
};

/**
 * Create a new shipping zone
 */
export const createShippingZone = async (zone: ShippingZone): Promise<ShippingZone | null> => {
  try {
    const client = supabaseAdmin || supabase;
    const { data, error } = await client
      .from('shipping_zones')
      .insert([zone])
      .select();

    if (error) {
      console.error('Error creating shipping zone:', error);
      return null;
    }

    return data?.[0] || null;
  } catch (error) {
    console.error('Error creating shipping zone:', error);
    return null;
  }
};

/**
 * Update a shipping zone
 */
export const updateShippingZone = async (id: string, updates: Partial<ShippingZone>): Promise<ShippingZone | null> => {
  try {
    const client = supabaseAdmin || supabase;
    const { data, error } = await client
      .from('shipping_zones')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) {
      console.error('Error updating shipping zone:', error);
      return null;
    }

    return data?.[0] || null;
  } catch (error) {
    console.error('Error updating shipping zone:', error);
    return null;
  }
};

/**
 * Delete a shipping zone
 */
export const deleteShippingZone = async (id: string): Promise<boolean> => {
  try {
    const client = supabaseAdmin || supabase;
    const { error } = await client
      .from('shipping_zones')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting shipping zone:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deleting shipping zone:', error);
    return false;
  }
};

/**
 * Customer Interface
 */
export interface Customer {
  id?: string;
  email: string;
  name: string;
  phone?: string;
  address?: { street?: string; city?: string; postcode?: string; country?: string };
  total_orders?: number;
  total_spent?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * Fetch all customers
 */
export const fetchCustomers = async (): Promise<Customer[]> => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching customers:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching customers:', error);
    return [];
  }
};

/**
 * Fetch a single customer by ID
 */
export const fetchCustomer = async (id: string): Promise<Customer | null> => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching customer:', error);
      return null;
    }

    return data || null;
  } catch (error) {
    console.error('Error fetching customer:', error);
    return null;
  }
};

/**
 * Create a new customer
 */
export const createCustomer = async (customer: Customer): Promise<Customer | null> => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .insert([customer])
      .select();

    if (error) {
      console.error('Error creating customer:', error);
      return null;
    }

    return data?.[0] || null;
  } catch (error) {
    console.error('Error creating customer:', error);
    return null;
  }
};

/**
 * Cart Items - Supabase-backed shopping cart
 */
export interface CartItem {
  id: string;
  customer_email: string;
  product_id: string;
  quantity: number;
  product?: Product;
  added_at: string;
}

/**
 * Get all cart items for a customer
 */
export const getCartItems = async (email: string): Promise<CartItem[]> => {
  try {
    console.log('[getCartItems] Fetching cart items for email:', email);
    const { data, error } = await supabase
      .from('cart_items')
      .select(`
        *,
        product:product_id (*)
      `)
      .eq('customer_email', email)
      .order('added_at', { ascending: false });

    if (error) {
      console.error('[getCartItems] Error fetching cart items for', email, '- Error:', {
        message: error.message,
        code: error.code,
        hint: error.hint
      });
      return [];
    }

    // Filter out items where product is null (orphaned cart items)
    const validItems = (data || []).filter(item => item.product != null);
    console.log('[getCartItems] Fetched', (data || []).length, 'items for', email, ', valid items:', validItems.length);

    // If there were orphaned items, clean them up
    if (validItems.length !== (data || []).length) {
      const orphanedIds = (data || [])
        .filter(item => item.product == null)
        .map(item => item.id);

      if (orphanedIds.length > 0) {
        console.warn('Cleaning up orphaned cart items:', orphanedIds);
        await supabase
          .from('cart_items')
          .delete()
          .in('id', orphanedIds);
      }
    }

    return validItems;
  } catch (error) {
    console.error('Error fetching cart items:', error);
    return [];
  }
};

/**
 * Get total cart quantity for a customer (sums quantities, includes orphaned rows)
 */
export const getUserCartCount = async (email: string): Promise<number> => {
  try {
    if (!email) {
      console.warn('getUserCartCount called with empty email');
      return 0;
    }

    // Fetch cart rows for this customer (count all items regardless of product status)
    const { data, error } = await supabase
      .from('cart_items')
      .select(`quantity`)
      .eq('customer_email', email);

    if (error) {
      console.error('Error fetching cart count for email:', email, 'Error:', error);
      // Log additional context
      if (error.message && error.message.includes('401')) {
        console.error('Cart count fetch returned 401 - possible RLS permission issue');
      }
      return 0;
    }

    const rows = (data || []) as any[];
    console.debug('[getUserCartCount] Raw rows fetched:', rows.length, 'for email:', email);
    
    // Count all cart items regardless of whether product exists
    const count = rows.reduce((sum: number, r: any) => sum + (Number(r.quantity) || 0), 0);
    
    console.debug('[getUserCartCount] Total rows counted:', rows.length, 'Total quantity count:', count);
    return count;
  } catch (error) {
    console.error('Exception in getUserCartCount:', error);
    return 0;
  }
};

/**
 * Add item to cart (or update quantity if exists)
 */
export const addToCart = async (
  email: string,
  productId: string,
  quantity: number = 1,
  knownStock?: number // Optional: client can pass known stock to avoid DB fetch
): Promise<CartItem | null> => {
  try {
    let available = knownStock;

    // Only fetch stock if not provided by client
    if (available === undefined) {
      const { data: prodData, error: prodErr } = await supabase
        .from('products')
        .select('id, stock_quantity')
        .eq('id', productId)
        .limit(1)
        .single();

      if (prodErr) {
        console.debug('Failed to fetch product for stock check (will allow add, backend validation applies):', productId);
        // Don't block the add if we can't fetch - backend will validate
        available = Number.MAX_SAFE_INTEGER;
      } else {
        available = prodData?.stock_quantity != null ? Number(prodData.stock_quantity) : 0;
      }
    }
    
    // Check if cart item already exists for this user/product
    const { data: existingData, error: fetchError } = await supabase
      .from('cart_items')
      .select('id,quantity')
      .eq('customer_email', email)
      .eq('product_id', productId)
      .limit(1)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 may mean no rows found depending on client; log other errors
      console.error('Error checking existing cart item:', fetchError);
    }

    let result: any = null;

    if (existingData && existingData.id) {
      // Update existing row by incrementing quantity, but cap at available stock
      const currentQty = Number(existingData.quantity) || 0;
      let newQuantity = currentQty + quantity;
      if (available <= 0) {
        console.warn('Product out of stock, cannot add to cart:', productId);
        return null;
      }
      if (newQuantity > available) newQuantity = available;
      const { data: updated, error: updateError } = await supabase
        .from('cart_items')
        .update({ quantity: newQuantity })
        .eq('id', existingData.id)
        .select();

      if (updateError) {
        console.error('Error updating cart item quantity:', updateError);
        return null;
      }

      result = updated?.[0] || null;
    } else {
      // Insert new cart item. First validate quantity against available stock.
      if (available <= 0) {
        console.warn('Product out of stock, cannot add to cart:', productId);
        return null;
      }
      let insertQuantity = quantity;
      if (insertQuantity > available) {
        console.warn('Requested quantity exceeds stock, capping to available:', { productId, requested: quantity, available });
        insertQuantity = available;
      }

      // Insert new cart item. If a unique-constraint error occurs (race), fall back to incrementing.
      const { data: inserted, error: insertError } = await supabase
        .from('cart_items')
        .insert([
          {
            customer_email: email,
            product_id: productId,
            quantity: insertQuantity,
          },
        ])
        .select();

      if (insertError) {
        // Handle duplicate key (concurrent insert) by updating the existing row's quantity
        const errMsg = JSON.stringify(insertError || {});
        const isDuplicate = (insertError && ((insertError.code === '23505') || (insertError.message && String(insertError.message).includes('duplicate key'))));
        if (isDuplicate) {
          console.debug('Duplicate insert detected for cart item, handling by incrementing existing row:', { email, productId, insertError: errMsg });
        } else {
          console.error('Error inserting cart item:', insertError, errMsg);
        }

        if (isDuplicate) {
          try {
            const { data: existingRow, error: fetchErr } = await supabase
              .from('cart_items')
              .select('id, quantity')
              .eq('customer_email', email)
              .eq('product_id', productId)
              .limit(1)
              .single();

            if (fetchErr) {
              console.error('Failed to fetch existing cart row after duplicate insert:', fetchErr);
              return null;
            }

            // Cap new quantity at available stock
            const currentRowQty = Number(existingRow.quantity) || 0;
            let targetQty = currentRowQty + quantity;
            if (available <= 0) {
              console.warn('Product out of stock during duplicate-insert handling:', productId);
              return null;
            }
            if (targetQty > available) targetQty = available;

            const { data: updated, error: updateError } = await supabase
              .from('cart_items')
              .update({ quantity: targetQty })
              .eq('id', existingRow.id)
              .select();

            if (updateError) {
              console.error('Error updating cart item after duplicate insert:', updateError);
              return null;
            }

            result = updated?.[0] || null;
          } catch (e) {
            console.error('Exception handling duplicate insert for cart item:', e);
            return null;
          }
        } else {
          return null;
        }
      } else {
        result = inserted?.[0] || null;
      }
    }

    // Dispatch custom event for UI updates (similar to guest cart)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('userCartChange', {
        detail: { email: email },
      }));
    }

    // Also proactively dispatch updated count so UI can update immediately
    try {
      if (typeof window !== 'undefined') {
        const count = await getUserCartCount(email);
        window.dispatchEvent(new CustomEvent('userCartCountUpdated', { detail: { count } }));
      }
    } catch (e) {
      // non-fatal
      console.error('Failed to dispatch userCartCountUpdated:', e);
    }

    return result;
  } catch (error) {
    console.error('Error adding to cart:', error);
    return null;
  }
};

/**
 * Update cart item quantity
 */
export const updateCartItemQuantity = async (
  email: string,
  productId: string,
  quantity: number,
  knownStock?: number // Optional: client can pass known stock to avoid DB fetch
): Promise<CartItem | null> => {
  try {
    if (quantity <= 0) {
      // remove item instead of returning boolean
      await removeFromCart(email, productId);
      return null;
    }

    // Ensure requested quantity does not exceed available stock
    let available = knownStock;
    
    // Only fetch stock if not provided by client
    if (available === undefined) {
      try {
        const { data: prodData, error: prodErr } = await supabase
          .from('products')
          .select('id, stock_quantity')
          .eq('id', productId)
          .limit(1)
          .single();
        if (prodErr) {
          console.error('Failed to fetch product for stock check (update):', prodErr);
        }
        available = prodData?.stock_quantity != null ? Number(prodData.stock_quantity) : 0;
      } catch (e) {
        console.error('Error checking stock before update:', e);
        available = 0;
      }
    }
    
    if (available <= 0) {
      // nothing available
      console.warn('Product out of stock on update:', productId);
      await removeFromCart(email, productId);
      return null;
    }
    if (quantity > available) {
      console.warn('Requested quantity exceeds stock, capping to available:', { productId, requested: quantity, available });
      quantity = available;
    }

    const { data, error } = await supabase
      .from('cart_items')
      .update({ quantity })
      .eq('customer_email', email)
      .eq('product_id', productId)
      .select();

    if (error) {
      console.error('Error updating cart item:', error);
      return null;
    }

    // Dispatch custom event for UI updates
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('userCartChange', {
        detail: { email: email },
      }));
    }

    // Dispatch updated count
    try {
      if (typeof window !== 'undefined') {
        const count = await getUserCartCount(email);
        window.dispatchEvent(new CustomEvent('userCartCountUpdated', { detail: { count } }));
      }
    } catch (e) {
      console.error('Failed to dispatch userCartCountUpdated (updateQuantity):', e);
    }

    return data?.[0] || null;
  } catch (error) {
    console.error('Error updating cart item:', error);
    return null;
  }
};

/**
 * Remove item from cart
 */
export const removeFromCart = async (
  email: string,
  productId: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('customer_email', email)
      .eq('product_id', productId);

    if (error) {
      console.error('Error removing from cart:', error);
      return false;
    }

    // Dispatch custom event for UI updates
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('userCartChange', {
        detail: { email: email },
      }));
    }

    // Dispatch updated count
    try {
      if (typeof window !== 'undefined') {
        const count = await getUserCartCount(email);
        window.dispatchEvent(new CustomEvent('userCartCountUpdated', { detail: { count } }));
      }
    } catch (e) {
      console.error('Failed to dispatch userCartCountUpdated (remove):', e);
    }

    return true;
  } catch (error) {
    console.error('Error removing from cart:', error);
    return false;
  }
};

/**
 * Clear entire cart for a customer
 */
export const clearCart = async (email: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('customer_email', email);

    if (error) {
      console.error('Error clearing cart:', error);
      return false;
    }

    // Dispatch updated count (cleared -> zero)
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('userCartCountUpdated', { detail: { count: 0 } }));
      }
    } catch (e) {
      console.error('Failed to dispatch userCartCountUpdated (clear):', e);
    }

    return true;
  } catch (error) {
    console.error('Error clearing cart:', error);
    return false;
  }
};

