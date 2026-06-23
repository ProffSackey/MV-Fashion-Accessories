"use client";

export const dynamic = 'force-dynamic';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { addToCart } from '@/lib/supabaseService';
import type { Product } from '@/lib/supabaseService';
import ProductCard from '../../components/ProductCard';
import { addToGuestCart, subscribeToGuestCartChanges, subscribeToUserCartChanges, fetchGuestCartFromSupabase } from '@/lib/cartUtils';
import { useCart } from '@/lib/cartContext';
import { getUserCartCount } from '@/lib/supabaseService';
import { useUserAuth } from '../../../lib/useUserAuth';


export default function CategoryPage() {
  const { slug } = useParams();
  const router = useRouter();
  const { user } = useUserAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const { setGuestCount, setUserCount } = useCart();

  const categoryName = typeof slug === 'string' ? slug.replace(/-/g, ' ').toUpperCase() : 'Category';
  const categorySlug = typeof slug === 'string' ? slug.replace(/-/g, ' ') : '';

  const handleAddToCart = async (productId: string) => {
    // Find the product to get its details
    const product = products.find(p => p.id === productId);
    if (!product) {
      setNotice('Product not found');
      setTimeout(() => setNotice(null), 4000);
      return;
    }

    // Check stock availability
    const stock = product.stock_quantity ?? 0;
    if (stock <= 0) {
      setNotice('Product is out of stock');
      setTimeout(() => setNotice(null), 4000);
      return;
    }

    setAddingToCart(productId);
    try {
      if (!user) {
        // Add to guest cart with stock validation
        addToGuestCart({
          productId: productId.toString(),
          quantity: 1,
          name: product.name,
          price: product.price.toString(),
          image_url: product.image_url,
        }, stock); // Pass available stock
        // also update context immediately (fetch authoritative count from Supabase)
        try {
          const items = await fetchGuestCartFromSupabase();
          const guestCount = Array.isArray(items) ? items.reduce((s: number, it: any) => s + (Number(it.quantity) || 0), 0) : 0;
          setGuestCount(guestCount);
          console.log('[Cart] context guest count set to', guestCount);
        } catch (e) {
          console.error('[Cart] failed to update guest count from Supabase', e);
        }
        // proactively notify navbar in case the listener missed the dispatched event
        try {
          const items = await fetchGuestCartFromSupabase();
          const guestCount = Array.isArray(items) ? items.reduce((s: number, it: any) => s + (Number(it.quantity) || 0), 0) : 0;
          window.dispatchEvent(new CustomEvent('guestCartChange', { detail: { count: guestCount } }));
          console.log('[Cart] manual guestCartChange dispatch with', guestCount);
        } catch (e) {
          console.error('[Cart] failed manual guestCartChange dispatch', e);
        }

        let handled = false;
        const unsubscribe = subscribeToGuestCartChanges((count) => {
          if (handled) return;
          handled = true;
          try { unsubscribe(); } catch {}
          console.debug('[Cart] guest item added, count:', count);
        });
        setTimeout(() => { if (!handled) { handled = true; try { unsubscribe(); } catch {} console.debug('[Cart] guest add fallback'); } }, 1500);
      } else {
        // Add to user cart with known stock and wait for server-side cart update
        const result = await addToCart(user.email, productId, 1, stock);
        // update context count immediately after attempting the add
        try {
          const total = await getUserCartCount(user.email);
          setUserCount(total);
          console.log('[Cart] context user count set to', total);
        } catch (e) {
          console.error('[Cart] failed to update user count context', e);
        }
        if (result) {
          let handled = false;
          const unsubscribe = subscribeToUserCartChanges(user.email, () => {
            if (handled) return;
            handled = true;
            try { unsubscribe(); } catch {}
            console.debug('[Cart] user item added (realtime)');
          });
          try {
            const total = await getUserCartCount(user.email);
            try { window.dispatchEvent(new CustomEvent('userCartCountUpdated', { detail: { count: total } })); } catch {}
          } catch (e) { console.error('Failed to fetch user cart count after add:', e); }
          setTimeout(() => { if (!handled) { handled = true; try { unsubscribe(); } catch {} console.debug('[Cart] user add fallback'); } }, 1500);
        } else {
          console.warn('Error adding to cart: addToCart returned falsy');
          setNotice('Could not add item to cart. It may be out of stock.');
          setTimeout(() => setNotice(null), 4000);
        }
      }
    } catch (error) {
      console.warn('Error adding to cart:', error);
      setNotice('Failed to add item to cart. Please try again.');
      setTimeout(() => setNotice(null), 4000);
    } finally {
      setAddingToCart(null);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/admin/products');
      if (!res.ok) throw new Error('Failed to fetch products');
      const data = await res.json();
      // console.log('Fetched products from API:', data); // Removed for security
      
      // Filter products by category
      const filtered = data.filter((p: Product) => 
        p.category.toLowerCase() === categorySlug.toLowerCase()
      );
      // console.log('Filtered products for category:', categorySlug, filtered); // Removed for security
      setProducts(filtered);
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (categorySlug) {
      fetchProducts();
    }
  }, [categorySlug]);

  // Subscribe to Supabase realtime changes so category product lists update automatically
  useEffect(() => {
    const channel = supabase
      .channel('category-products-' + (categorySlug || 'all'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        // refetch and re-filter for this category
        fetchProducts();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [categorySlug]);

  return (
    <div className="min-h-screen bg-gray-50 px-4 sm:px-6 md:px-8 py-8 sm:py-12">
      <div className="max-w-7xl mx-auto">
        {notice && (
          <div className="mb-4">
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-950 px-4 py-2 rounded">
              {notice}
            </div>
          </div>
        )}
        {/* Products Grid - Responsive */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {loading ? (
            <p className="text-gray-500">Loading products...</p>
          ) : products.length > 0 ? (
            products.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                promotions={[]}
                user={user}
                addingToCart={addingToCart}
                onAddToCart={(id) => handleAddToCart(id || '')}
              />
            ))
          ) : (
            <p className="text-gray-500">No products found in this category.</p>
          )}
        </div>
      </div>
    </div>
  );
}