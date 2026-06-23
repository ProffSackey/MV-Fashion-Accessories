"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Image from "next/image";
import Link from "next/link";
import { useRouter } from 'next/navigation';
import HeroCarousel from "./components/HeroCarousel";
import { fetchPromotions, type Promotion as SupabasePromotion, type Product, addToCart } from '../lib/supabaseService';
import ProductCard from './components/ProductCard';
import { supabase } from '@/lib/supabaseClient';
import { Promotion as UIPromotion, getProductPromotions, calculateDiscount, getFeaturedPromotions, getDiscountBadgeText, formatPrice, parsePrice } from '../lib/promotionUtils';
import { addToGuestCart, subscribeToGuestCartChanges, subscribeToUserCartChanges, fetchGuestCartFromSupabase } from '@/lib/cartUtils';
import { useCart } from '@/lib/cartContext';
import { getUserCartCount } from '@/lib/supabaseService';

export default function Home() {
  const router = useRouter();
  const [categories, setCategories] = useState<string[]>([]);
  const [promotions, setPromotions] = useState<UIPromotion[]>([]);
  const [trendingProducts, setTrendingProducts] = useState<Product[]>([]);
  const [newStockProducts, setNewStockProducts] = useState<Product[]>([]);
  const [featuredPromotions, setFeaturedPromotions] = useState<UIPromotion[]>([]);
  const [user, setUser] = useState<any>(null);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const { setGuestCount, setUserCount } = useCart();

  const featuredCategories = [
    { name: "Necklace", image: "/hero.jpg", position: "object-center" },
    { name: "Cute Purse", image: "/hero5.jpg", position: "object-center" },
    { name: "African Print", image: "/hero7.jpg", position: "object-center" },
    { name: "Handbags", image: "/hero1.jpg", position: "object-center" },
    { name: "Bridal Earring", image: "/ear.jpg", position: "object-center" },
    { name: "Handbag", image: "/hero4.jpg", position: "object-center" },
  ];

  const categoryHref = (cat: string) =>
    `/category/${encodeURIComponent(cat.toLowerCase().replace(/ & /g, "-").replace(/\s+/g, "-"))}`;

  useEffect(() => {
    // Check auth status
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      setUser(data.session?.user || null);
    };
    checkAuth();
  }, []);

  const handleAddToCart = async (productId: string) => {
    console.log('[Cart] ===== START handleAddToCart =====');
    console.log('[Cart] handleAddToCart called with productId:', productId, 'user:', !!user, 'userEmail:', user?.email);
    // Find the product to get its details
    const product = [...trendingProducts, ...newStockProducts].find(p => p.id === productId);
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
        console.log('[Cart] ===== GUEST CART PATH =====');
        console.log('[Cart] Adding to guest cart');
        // Add to guest cart with stock validation
        await addToGuestCart({
          productId: productId.toString(),
          quantity: 1,
          name: product.name,
          price: product.price.toString(),
          image_url: product.image_url,
        }, stock); // Pass available stock

        // update context immediately as well (fetch authoritative count from Supabase)
        try {
          const items = await fetchGuestCartFromSupabase();
          const guestCount = Array.isArray(items) ? items.reduce((s: number, it: any) => s + (Number(it.quantity) || 0), 0) : 0;
          setGuestCount(guestCount);
          console.log('[Cart] context guest count set to', guestCount);
        } catch (e) {
          console.error('[Cart] failed to update guest count from Supabase', e);
        }

        // proactively notify navbar in case the listener misses the dispatched event
        try {
          const items = await fetchGuestCartFromSupabase();
          const guestCount = Array.isArray(items) ? items.reduce((s: number, it: any) => s + (Number(it.quantity) || 0), 0) : 0;
          console.log('[Cart] dispatching guestCartChange event explicitly with count', guestCount);
          window.dispatchEvent(new CustomEvent('guestCartChange', { detail: { count: guestCount } }));
        } catch (e) {
          console.error('[Cart] failed to manually dispatch guestCartChange', e);
        }

        let handled = false;
        const unsubscribe = subscribeToGuestCartChanges((count) => {
          if (handled) return;
          console.log('[Cart] Guest cart change callback received, count:', count);
          handled = true;
          try { unsubscribe(); } catch {};
          console.debug('[Cart] guest item added, count:', count);
        });
        // Fallback if event doesn't arrive in time
        setTimeout(() => { 
          if (!handled) { 
            console.log('[Cart] Guest cart fallback triggered');
            handled = true; 
            try { unsubscribe(); } catch {} 
            console.debug('[Cart] guest add fallback'); 
          } 
        }, 1500);
      } else {
        console.log('[Cart] ===== USER CART PATH =====');
        console.log('[Cart] Adding to user cart for email:', user.email);
        // Add to user cart with known stock and wait for server-side cart update
        const cartResult = await addToCart(user.email, productId, 1, stock);
        console.log('[Cart] addToCart result:', cartResult);
        // update context count regardless of success/failure, we'll fetch fresh total
        try {
          const total = await getUserCartCount(user.email);
          setUserCount(total);
          console.log('[Cart] context user count set to', total);
        } catch (e) {
          console.error('[Cart] failed to update user count context', e);
        }
        if (cartResult) {
          let handled = false;
          const unsubscribe = subscribeToUserCartChanges(user.email, () => {
            if (handled) return;
            console.log('[Cart] User cart change callback received');
            handled = true;
            try { unsubscribe(); } catch {}
            console.debug('[Cart] user item added (realtime)');
          });
          // Also proactively fetch updated cart total and notify Navbar immediately
          try {
            const total = await getUserCartCount(user.email);
            console.log('[Cart] Fetched updated cart count:', total, 'dispatching event to Navbar');
            try { 
              window.dispatchEvent(new CustomEvent('userCartCountUpdated', { detail: { count: total } }));
              console.log('[Cart] userCartCountUpdated event dispatched successfully');
            } catch (e) {
              console.error('[Cart] Failed to dispatch userCartCountUpdated event:', e);
            }
          } catch (e) { console.error('Failed to fetch user cart count after add:', e); }
          setTimeout(() => { 
            if (!handled) { 
              console.log('[Cart] User cart fallback triggered');
              handled = true; 
              try { unsubscribe(); } catch {} 
              console.debug('[Cart] user add fallback'); 
            } 
          }, 1500);
        } else {
          console.warn('addToCart returned null - possible supabase error');
          setNotice('Could not add item to cart. It may be out of stock.');
          setTimeout(() => setNotice(null), 4000);
        }
      }
    } catch (error) {
      console.warn('Error adding to cart (caught):', error);
      setNotice('Failed to add item to cart. Please try again.');
      setTimeout(() => setNotice(null), 4000);
    } finally {
      setAddingToCart(null);
    }
    console.log('[Cart] ===== END handleAddToCart =====');
  };

  const [productsError, setProductsError] = useState<string | null>(null);
  const [productsLoading, setProductsLoading] = useState(false);

  // unified loader that handles errors, retries, and pagination of subsets
  const loadProducts = async () => {
    setProductsLoading(true);
    setProductsError(null);
    try {
      const res = await fetch('/api/admin/products', { cache: 'no-store' });
      if (!res.ok) throw new Error(`api returned ${res.status}`);
      const prods: Product[] = await res.json();
      
      // Shuffle products to distribute them between trending and new stock
      const shuffled = [...prods].sort(() => Math.random() - 0.5);
      
      // Split into two groups: first half for trending, second half for new stock
      const midpoint = Math.ceil(shuffled.length / 2);
      const trendingSet = shuffled.slice(0, 6);
      const newStockSet = shuffled.slice(midpoint, midpoint + 6)
        .filter(p => (p.stock_quantity ?? 0) > 0); // Filter out out-of-stock products
      
      setTrendingProducts(trendingSet);
      // If new stock set is empty due to few products, use remaining products (also filtered)
      const fallbackNewStock = shuffled.slice(6, 12)
        .filter(p => (p.stock_quantity ?? 0) > 0); // Filter out out-of-stock products
      setNewStockProducts(newStockSet.length > 0 ? newStockSet : fallbackNewStock);
    } catch (error: any) {
      console.error('Error fetching products:', error);
      setProductsError(error?.message || 'Unknown error');
      // schedule a retry in 5 seconds
      setTimeout(loadProducts, 5000);
    } finally {
      setProductsLoading(false);
    }
  };

  useEffect(() => {
    // Helper to fetch products from the API (no cache)
    // `fetchProductsFromApi` is no longer needed; use loadProducts() instead

    const loadData = async () => {
      try {
        // Load promotions from Supabase
        const promos = await fetchPromotions();
        setPromotions(promos);
        setFeaturedPromotions(getFeaturedPromotions(promos));

        // Load products via API (respects RLS and uses service key server-side)
        await loadProducts();
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    // Fetch categories
    fetch('/api/categories')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const normalized = data.map((c: string) =>
            c === 'Electronics & Computing' ? 'Grocessories' : c
          );
          setCategories(normalized);
        }
      })
      .catch(console.error);

    loadData();
  }, []);

  // Subscribe to Supabase realtime changes so products refresh automatically
  useEffect(() => {
    const channel = supabase
      .channel('products-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        // refetch latest products when any change occurs
        loadProducts();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-b from-yellow-50 to-white">
      {/* Hero Section */}
      <HeroCarousel />
      {notice && (
        <div className="max-w-7xl mx-auto px-4 py-2">
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-950 px-4 py-2 rounded">
            {notice}
          </div>
        </div>
      )}

      {/* Featured Promotions Section */}
      {productsLoading && (
        <div className="w-full text-center py-4 text-gray-500">Loading products…</div>
      )}
      {featuredPromotions.length > 0 && (
        <div id="promotions" className="px-4 sm:px-6 md:px-8 py-8 sm:py-12 max-w-7xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-gray-800">Special Offers</h2>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-4 md:gap-8">
            {featuredPromotions.slice(0, 3).map((promo) => (
              <div
                key={promo.id}
                className="bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg shadow-lg p-3 sm:p-4 md:p-8 text-white text-center hover:shadow-xl transition transform hover:scale-105 h-32 sm:h-48 md:h-64 overflow-hidden flex flex-col items-center justify-center"
              >
                <h3 className="text-base sm:text-lg md:text-xl font-bold mb-2 truncate">{promo.name}</h3>
                <p className="text-xs sm:text-sm md:text-base opacity-90 line-clamp-1 mb-2">{promo.description}</p>

                {/* Discount Badge */}
                <div className="bg-white text-yellow-700 inline-block px-2 py-1 sm:px-3 sm:py-1 md:px-4 md:py-2 rounded-full font-bold text-xs sm:text-sm md:text-lg shadow-md">
                  {getDiscountBadgeText(promo)}
                </div>

                {/* Product Count */}
                <p className="text-xs sm:text-sm md:text-base mt-2">
                  💰 {(promo.product_ids || []).length} Products on Sale
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Featured Categories */}
      <div className="mx-auto max-w-7xl px-4 py-8 text-gray-900 sm:px-6 sm:py-12 md:px-8">
        <div className="mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-2xl md:text-3xl font-bold">Featured Categories</h2>
        </div>
        <div className="scrollbar-hide -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3 sm:-mx-6 sm:gap-5 sm:px-6 md:mx-0 md:grid md:grid-cols-3 md:gap-x-4 md:gap-y-8 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-6">
          {featuredCategories.map((category) => (
            <Link
              key={category.name}
              href={categoryHref(category.name)}
              className="group flex w-[104px] flex-none snap-start flex-col items-center rounded-lg text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 focus-visible:ring-offset-4 sm:w-32 md:w-auto"
            >
              <div className="relative h-24 w-24 rounded-full bg-white shadow-[0_10px_26px_rgba(15,23,42,0.12)] ring-1 ring-gray-100 transition duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_18px_45px_rgba(15,23,42,0.16)] sm:h-32 sm:w-32 lg:h-36 lg:w-36">
                <div className="absolute inset-2.5 overflow-hidden rounded-full bg-gray-50 sm:inset-3">
                  <Image
                    src={category.image}
                    alt={category.name}
                    fill
                    sizes="(min-width: 1024px) 144px, (min-width: 640px) 128px, 96px"
                    className={`object-cover ${category.position} transition duration-300 group-hover:scale-105`}
                  />
                </div>
              </div>
              <span className="mt-3 max-w-[104px] text-sm font-semibold leading-snug text-gray-900 sm:mt-4 sm:max-w-[11rem] sm:text-base">
                {category.name}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Trending Products */}
      <div id="featured-products" className="px-4 sm:px-6 text-gray-700 md:px-8 py-8 mt-8 sm:py-12 max-w-7xl mx-auto">
        <h2 className="text-2xl sm:text-2xl md:text-3xl font-bold mb-6 sm:mb-8">Trending Products</h2>
        <div className="flex overflow-x-auto gap-4 sm:gap-6 pb-4 scroll-smooth scrollbar-hide">
          {trendingProducts.length > 0 ? (
            trendingProducts.map((p) => (
              <div key={p.id} className="flex-shrink-0 w-1/2 sm:w-80">
                <ProductCard
                  product={p}
                  promotions={promotions}
                  user={user}
                  addingToCart={addingToCart}
                  onAddToCart={(id) => handleAddToCart(id || '')}
                />
              </div>
            ))
          ) : (
            <p className="text-gray-500">No trending products available yet.</p>
          )}
        </div>
      </div>

      {/* New Stock Alert */}
      <div className="px-4 sm:px-6 text-gray-700 md:px-8 py-8 sm:py-12 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-2xl md:text-3xl font-bold">New Stock Alert</h2>
        </div>
        <div className="flex overflow-x-auto gap-4 sm:gap-6 pb-4 scroll-smooth scrollbar-hide">
          {newStockProducts.length > 0 ? (
            newStockProducts.map((p) => (
              <div key={p.id} className="flex-shrink-0 w-1/2 sm:w-80">
                <ProductCard
                  product={p}
                  promotions={promotions}
                  user={user}
                  addingToCart={addingToCart}
                  onAddToCart={(id) => handleAddToCart(id || '')}
                />
              </div>
            ))
          ) : (
            <p className="text-gray-500">No new stock available yet.</p>
          )}
        </div>
      </div>

      {/* Featured Products */}
      <div className="px-4 sm:px-6 text-gray-700 md:px-8 py-8 sm:py-12 max-w-7xl mx-auto">
        <h2 className="text-2xl sm:text-2xl md:text-3xl font-bold mb-6 sm:mb-8">Featured Products</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-4 md:gap-6">
          {trendingProducts.length > 0 ? (
            trendingProducts.slice(0, 12).map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                promotions={promotions}
                user={user}
                addingToCart={addingToCart}
                onAddToCart={(id) => handleAddToCart(id || '')}
              />
            ))
          ) : (
            <p className="text-gray-500">No featured products available yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
