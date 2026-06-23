"use client";

export const dynamic = 'force-dynamic';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { addToCart, getUserCartCount, type Product } from '@/lib/supabaseService';
import { addToGuestCart, subscribeToGuestCartChanges, subscribeToUserCartChanges, fetchGuestCartFromSupabase } from '@/lib/cartUtils';
import { useCart } from '@/lib/cartContext';
import { useUserAuth } from '@/lib/useUserAuth';
import ProductCard from '../../components/ProductCard';
import { ChevronLeftIcon, ShoppingCartIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import ReviewCard, { Review } from '../../components/ReviewCard';
import ProductRatingModal from '@/app/components/ProductRatingModal';
import { parseCurrency } from '@/lib/currency';

export default function ProductDetailPage() {
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : null;
  const router = useRouter();
  const { user } = useUserAuth();
  const { setGuestCount, setUserCount } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [currentProductRating, setCurrentProductRating] = useState<any | null>(null);
  const [hasReviewed, setHasReviewed] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) {
        console.log('[ProductDetail] No ID provided');
        setLoading(false);
        return;
      }

      console.log('[ProductDetail] Fetching product with ID:', id);

      try {
        setLoading(true);

        // Fetch product using the public API endpoint for consistency
        const response = await fetch(`/api/admin/products?id=${encodeURIComponent(id)}`);
        console.log('[ProductDetail] API response status:', response.status);
        
        if (!response.ok) {
          throw new Error('Failed to fetch product');
        }

        const products = await response.json();
        console.log('[ProductDetail] API returned:', {
          isArray: Array.isArray(products),
          length: Array.isArray(products) ? products.length : 'N/A',
          data: products
        });
        
        const productData = Array.isArray(products) ? products[0] : products;
        
        console.log('[ProductDetail] Extracted product data:', {
          id: productData?.id,
          name: productData?.name,
          hasAllFields: !!productData && Object.keys(productData).length > 0
        });
        
        if (!productData) {
          console.log('[ProductDetail] Product not found in response');
          setNotice('Product not found');
          setLoading(false);
          return;
        }

        console.log('[ProductDetail] Product found:', productData);
        setProduct(productData);

        // Fetch approved reviews for this product
        console.log('[ProductDetail] Fetching approved reviews');
        fetchReviews(productData.id);

        // If user is signed in, detect if they have a delivered order containing
        // this product that they haven't reviewed yet. If so, open the rating modal.
        (async () => {
          try {
            if (!user?.email) return;
            const ordersRes = await fetch(`/api/customer-orders?email=${encodeURIComponent(user.email)}`);
            if (!ordersRes.ok) return;
            const orders = await ordersRes.json();

            for (const ord of orders) {
              if (!ord || (ord.status || '').toLowerCase() !== 'delivered') continue;
              const items = ord.items || [];
              const found = items.find((it: any) => (it.product_id || it.productId || it.productId === productData.id) || (it.product_id === productData.id));
              // normalize check
              const containsProduct = items.some((it: any) => (it.product_id === productData.id) || (it.productId === productData.id));
              if (!containsProduct) continue;

              // Check whether a review already exists for this product by this user
              const revRes = await fetch(`/api/reviews?product_id=${encodeURIComponent(productData.id)}&customer_email=${encodeURIComponent(user.email)}`);
              if (!revRes.ok) continue; // fallback: don't prompt
              const revs = await revRes.json();
              if (Array.isArray(revs) && revs.length === 0 && !hasReviewed) {
                // open modal for this product
                setCurrentProductRating({ productId: productData.id, name: productData.name, image: productData.image_url });
                setRatingModalOpen(true);
                break;
              }
            }
          } catch (e) {
            console.error('[ProductDetail] error detecting unreviewed order for product:', e);
          }
        })();

        // Fetch recommended products - show similar products based on category, price, and keywords
        console.log('[ProductDetail] Fetching similar recommended products');
        
        const allResponse = await fetch('/api/admin/products');
        if (allResponse.ok) {
          const allProducts = await allResponse.json();
          console.log('[ProductDetail] All products count:', allProducts.length);
          
          // Calculate similarity score for each product
          const currentPrice = parseCurrency(productData.price);
          const currentName = productData.name.toLowerCase();
          const currentCategory = productData.category;
          
          const scoredProducts = allProducts
            .filter((p: Product) => p.id !== id && (p.stock_quantity ?? 0) > 0)
            .map((p: Product) => {
              let score = 0;
              
              // Category match (highest weight)
              if (p.category === currentCategory) {
                score += 50;
              }
              
              // Price similarity (within 20% range)
              const productPrice = parseCurrency(p.price);
              const priceDiff = Math.abs(currentPrice - productPrice);
              const priceRange = Math.max(currentPrice * 0.2, 10); // 20% or minimum GHS 10 range
              
              if (priceDiff <= priceRange) {
                score += 30 * (1 - priceDiff / priceRange); // Higher score for closer prices
              }
              
              // Name keyword similarity
              const productName = p.name.toLowerCase();
              const currentWords = currentName.split(/\s+/).filter((word: string) => word.length > 2);
              const productWords = productName.split(/\s+/).filter((word: string) => word.length > 2);
              
              let keywordMatches = 0;
              currentWords.forEach((word: string) => {
                if (productWords.some((pWord: string) => pWord.includes(word) || word.includes(pWord))) {
                  keywordMatches++;
                }
              });
              
              if (keywordMatches > 0) {
                score += 20 * (keywordMatches / Math.max(currentWords.length, 1));
              }
              
              // Rating bonus (slight preference for higher rated products)
              const rating = p.rating ?? 0;
              score += rating * 2;
              
              return { product: p, score };
            })
            .sort((a: { product: Product; score: number }, b: { product: Product; score: number }) => b.score - a.score)
            .slice(0, 6)
            .map((item: { product: Product; score: number }) => item.product);
          
          console.log('[ProductDetail] Recommended products count:', scoredProducts.length);
          setRecommendedProducts(scoredProducts);
        }
      } catch (error) {
        console.error('[ProductDetail] Error fetching product:', error);
        setNotice('Error loading product');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, user?.email, hasReviewed]);

  const fetchReviews = async (productId: string) => {
    try {
      setReviewsLoading(true);
      const response = await fetch(`/api/reviews?product_id=${encodeURIComponent(productId)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch reviews');
      }
      const allReviews = await response.json();
      // Filter only approved reviews or reviews without status (treat as approved)
      // For now, show all reviews since status column may not exist yet
      const displayReviews = allReviews.filter((review: Review) =>
        !review.status || review.status === 'approved'
      );
      setReviews(displayReviews);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setReviewsLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!product) {
      setNotice('Product not found');
      setTimeout(() => setNotice(null), 4000);
      return;
    }

    const stock = product.stock_quantity ?? 0;
    if (stock <= 0) {
      setNotice('Product is out of stock');
      setTimeout(() => setNotice(null), 4000);
      return;
    }

    setAddingToCart(true);
    try {
      if (!user) {
        // Add to guest cart
        addToGuestCart({
          productId: product.id?.toString() || '',
          quantity: 1,
          name: product.name,
          price: product.price,
          image_url: product.image_url,
        }, stock);

        try {
          const items = await fetchGuestCartFromSupabase();
          const guestCount = Array.isArray(items) ? items.reduce((s: number, it: any) => s + (Number(it.quantity) || 0), 0) : 0;
          setGuestCount(guestCount);
        } catch (e) {
          console.error('[Cart] failed to update guest count from Supabase', e);
        }

        let handled = false;
        const unsubscribe = subscribeToGuestCartChanges((count) => {
          if (handled) return;
          handled = true;
          try { unsubscribe(); } catch {}
          console.debug('[Cart] guest item added, count:', count);
        });
        setTimeout(() => { if (!handled) { handled = true; try { unsubscribe(); } catch {} } }, 1500);

        setNotice('Added to cart');
        setTimeout(() => setNotice(null), 4000);
      } else {
        // Add to user cart
        const result = await addToCart(user.email, product.id || '', 1, stock);
        
        try {
          const total = await getUserCartCount(user.email);
          setUserCount(total);
        } catch (e) {
          console.error('[Cart] failed to update user count context', e);
        }

        if (result) {
          let handled = false;
          const unsubscribe = subscribeToUserCartChanges(user.email, () => {
            if (handled) return;
            handled = true;
            try { unsubscribe(); } catch {}
          });
          setTimeout(() => { if (!handled) { handled = true; try { unsubscribe(); } catch {} } }, 1500);

          setNotice('Added to cart');
          setTimeout(() => setNotice(null), 4000);
        }
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      setNotice('Failed to add to cart');
      setTimeout(() => setNotice(null), 4000);
    } finally {
      setAddingToCart(false);
    }
  };

  const handleRecommendedAddToCart = async (recProductId: string) => {
    const rec = recommendedProducts.find(p => p.id === recProductId);
    if (!rec) {
      setNotice('Product not found');
      setTimeout(() => setNotice(null), 4000);
      return;
    }

    const stock = rec.stock_quantity ?? 0;
    if (stock <= 0) {
      setNotice('Product is out of stock');
      setTimeout(() => setNotice(null), 4000);
      return;
    }

    try {
      if (!user) {
        addToGuestCart({
          productId: rec.id?.toString() || '',
          quantity: 1,
          name: rec.name,
          price: rec.price,
          image_url: rec.image_url,
        }, stock);

        try {
          const items = await fetchGuestCartFromSupabase();
          const guestCount = Array.isArray(items) ? items.reduce((s: number, it: any) => s + (Number(it.quantity) || 0), 0) : 0;
          setGuestCount(guestCount);
        } catch (e) {
          console.error('[Cart] failed to update guest count from Supabase', e);
        }

        let handled = false;
        const unsubscribe = subscribeToGuestCartChanges((count) => {
          if (handled) return;
          handled = true;
          try { unsubscribe(); } catch {}
        });
        setTimeout(() => { if (!handled) { handled = true; try { unsubscribe(); } catch {} } }, 1500);

        setNotice('Added to cart');
        setTimeout(() => setNotice(null), 4000);
      } else {
        const result = await addToCart(user.email, rec.id || '', 1, stock);
        
        try {
          const total = await getUserCartCount(user.email);
          setUserCount(total);
        } catch (e) {
          console.error('[Cart] failed to update user count context', e);
        }

        if (result) {
          let handled = false;
          const unsubscribe = subscribeToUserCartChanges(user.email, () => {
            if (handled) return;
            handled = true;
            try { unsubscribe(); } catch {}
          });
          setTimeout(() => { if (!handled) { handled = true; try { unsubscribe(); } catch {} } }, 1500);

          setNotice('Added to cart');
          setTimeout(() => setNotice(null), 4000);
        }
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      setNotice('Failed to add to cart');
      setTimeout(() => setNotice(null), 4000);
    }
  };

  const handleChatNow = () => {
    if (product?.id) {
      window.location.href = `/messages?productId=${product.id}`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
          <p className="mt-4 text-gray-600">Loading product...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-lg text-gray-600 mb-2">Product not found</p>
          {id && <p className="text-sm text-gray-500 mb-4">ID: {id}</p>}
          <button 
            onClick={() => router.back()} 
            className="text-yellow-700 hover:text-yellow-800 font-medium inline-block mb-2"
          >
            Go back
          </button>
          <p className="text-xs text-gray-400 mt-4">Check browser console for more details</p>
        </div>
      </div>
    );
  }

  // Get all images - combine image_url and images array
  const allImages = [];
  if (product.image_url) allImages.push(product.image_url);
  if (product.images && Array.isArray(product.images)) {
    allImages.push(...product.images.filter((img: string) => img !== product.image_url));
  }
  const displayImages = allImages.length > 0 ? allImages : ['/placeholder-image.png'];
  const currentImage = displayImages[selectedImageIndex];

  const stock = product.stock_quantity ?? 0;
  const stockThreshold = 100;
  const stockPercent = Math.min(100, Math.round((stock / stockThreshold) * 100));
  const stockColor = stock <= 5 ? 'bg-red-500' : stock <= 20 ? 'bg-yellow-500' : 'bg-yellow-400';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Notification */}
      {notice && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-4 py-3 rounded-lg shadow-lg">
          {notice}
        </div>
      )}

      {/* Header with back button */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mr-4"
          >
            <ChevronLeftIcon className="w-5 h-5" />
            Back
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex-1 line-clamp-1">{product.name}</h1>
        </div>
      </div>
      {/* Product Rating Modal (open when user is eligible to review) */}
      <ProductRatingModal
        isOpen={ratingModalOpen}
        product={
          currentProductRating
            ? {
                id: currentProductRating.productId,
                name: currentProductRating.name || product?.name || 'Product',
                image: currentProductRating.image || product?.image_url,
              }
            : null
        }
        onClose={() => {
          setRatingModalOpen(false);
          setCurrentProductRating(null);
        }}
        onSubmit={async (rating: number, comment: string) => {
          try {
            if (!user?.id) throw new Error('You must be signed in to submit a review');
            const res = await fetch('/api/reviews', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                product_id: product?.id || currentProductRating?.productId,
                rating,
                comment,
                customer_id: user.id,
                customer_email: user?.email || null,
                customer_name: user?.name || (user?.email ? user.email.split('@')[0] : null),
              }),
            });
            if (!res.ok) {
              let body = null;
              try { body = await res.json(); } catch (e) {}
              const msg = body?.error || body?.message || `Failed to submit review (${res.status})`;
              throw new Error(msg);
            }
            // refresh reviews
            await fetchReviews(product?.id || currentProductRating?.productId);
            // mark as reviewed so modal won't re-open
            setHasReviewed(true);
            setRatingModalOpen(false);
            setCurrentProductRating(null);
          } catch (e) {
            console.error('Error submitting review from product page:', e);
            throw e;
          }
        }}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Images Section */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="bg-white rounded-lg overflow-hidden h-96 sm:h-[500px] flex items-center justify-center border border-gray-200">
              {currentImage ? (
                <img 
                  src={currentImage} 
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-gray-400">No image available</div>
              )}
            </div>

            {/* Thumbnail Gallery */}
            {displayImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {displayImages.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                      index === selectedImageIndex
                        ? 'border-yellow-500'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <img
                      src={image}
                      alt={`${product.name} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info Section */}
          <div className="space-y-6">
            {/* Title and Basic Info */}
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">{product.name}</h1>
              
              {/* Rating */}
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center">
                  <span className="text-yellow-400 text-lg">
                    {'\u2605'.repeat(Math.floor((product.rating && product.rating > 0) ? product.rating : 3))}
                    {((product.rating && product.rating > 0) ? product.rating : 3) % 1 ? '\u2606' : ''}
                  </span>
                </div>
                <span className="text-gray-600 font-medium">
                  {((product.rating && product.rating > 0) ? product.rating : 3).toFixed(1)} out of 5
                </span>
              </div>

              {/* Price */}
              <div className="text-4xl font-bold text-yellow-700 mb-4">
                {product.price}
              </div>

              {/* Stock Status */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-medium ${stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {stock > 0 ? `${stock} items in stock` : 'Out of stock'}
                  </span>
                </div>
                <div className="w-full bg-gray-300 rounded-full h-2">
                  <div className={`${stockColor} h-2 rounded-full transition-all`} style={{ width: `${stockPercent}%` }} />
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">About this product</h2>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {product.about || product.description || 'No description available'}
              </p>
            </div>

            {/* Category */}
            {product.category && (
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Category</h3>
                <p className="text-lg text-gray-900 font-medium">{product.category}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleAddToCart}
                disabled={addingToCart || stock <= 0}
                className="flex-1 bg-yellow-500 hover:bg-yellow-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-bold text-lg transition-colors flex items-center justify-center gap-2"
              >
                <ShoppingCartIcon className="w-6 h-6" />
                {addingToCart ? 'Adding...' : 'Add to Cart'}
              </button>
              <button
                onClick={handleChatNow}
                className="flex-1 border-2 border-yellow-500 text-yellow-700 hover:bg-yellow-50 px-6 py-3 rounded-lg font-bold text-lg transition-colors flex items-center justify-center gap-2"
              >
                <EnvelopeIcon className="w-6 h-6" />
                Chat Now
              </button>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="mt-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8">Customer Reviews</h2>
          
          {reviewsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
              <span className="ml-3 text-gray-600">Loading reviews...</span>
            </div>
          ) : reviews.length > 0 ? (
            <div className="space-y-6">
              {reviews.map((review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  showProductName={false}
                  showApprovalControls={false}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <p className="text-gray-500 text-lg">No reviews yet</p>
              <p className="text-gray-400 text-sm mt-2">Be the first to review this product!</p>
            </div>
          )}
        </div>

        {/* Recommended Products Section */}
        {recommendedProducts.length > 0 && (
          <div className="mt-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8">Recommended For You</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {recommendedProducts.map((rec) => (
                <ProductCard
                  key={rec.id}
                  product={rec}
                  promotions={[]}
                  user={user}
                  addingToCart={undefined}
                  onAddToCart={handleRecommendedAddToCart}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
