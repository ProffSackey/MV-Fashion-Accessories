'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { useUserAuth } from '@/lib/useUserAuth';
import { StarIcon } from '@heroicons/react/24/solid';

interface OrderItem {
  productId?: string;
  product_id?: string;
  name?: string;
  image?: string;
  quantity: number;
  price: number;
}

interface OrderDetails {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  items: OrderItem[];
  status: string;
  total_amount: number;
  created_at: string;
}

interface ProductReview {
  product_id: string;
  rating: number;
  comment: string;
  title?: string;
}

export default function OrderReviewPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  const { user, loading: authLoading } = useUserAuth();

  // Previously the app redirected to /reviews via client-side state.
  // We no longer perform that redirect here — the reviews page detects
  // unreviewed delivered orders server-side and displays the form directly.

  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<{ [key: string]: ProductReview }>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch order details
  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}`);
        if (!res.ok) {
          throw new Error('Failed to fetch order');
        }
        const data = await res.json();
        setOrder(data);

        // Initialize review state for each product
        const initialReviews: { [key: string]: ProductReview } = {};
        (data.items || []).forEach((item: OrderItem) => {
          const productId = item.product_id || item.productId || '';
          initialReviews[productId] = {
            product_id: productId,
            rating: 0,
            comment: '',
            title: '',
          };
        });
        setReviews(initialReviews);
      } catch (error) {
        console.error('Failed to fetch order:', error);
        setErrorMessage('Failed to load order details. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      fetchOrder();
    }
  }, [orderId]);

  const updateReview = (productId: string, field: string, value: any) => {
    setReviews((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: value,
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate that all products have ratings
    const allRated = Object.values(reviews).every((review) => review.rating > 0);
    if (!allRated) {
      setErrorMessage('Please rate all products before submitting.');
      return;
    }

    if (!user?.id) {
      setErrorMessage('You must be signed in to submit reviews.');
      return;
    }

    setSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      // Submit all reviews
      const reviewPromises = Object.entries(reviews)
        .filter(([_, review]) => review.rating > 0)
        .map(async ([_, review]) => {
          const res = await fetch('/api/reviews', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...review,
              order_id: orderId,
              customer_id: user.id,
              customer_email: user?.email || null,
              customer_name: user?.name || (user?.email ? user.email.split('@')[0] : null),
            }),
          });

          if (!res.ok) {
            let body = null;
            try { body = await res.json(); } catch (e) { /* ignore */ }
            const msg = body?.error || body?.message || `Failed to submit review (${res.status})`;
            throw new Error(msg);
          }

          return res.json();
        });

      await Promise.all(reviewPromises);
      setSubmitStatus('success');
      
      // Redirect after success
      setTimeout(() => {
        router.push('/orders');
      }, 2000);
    } catch (error) {
      console.error('Error submitting reviews:', error);
      setSubmitStatus('error');
      setErrorMessage('Failed to submit reviews. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow">
          <p className="text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow max-w-md w-full">
          <p className="text-red-600 text-center">{errorMessage || 'Order not found'}</p>
          <button
            onClick={() => router.push('/orders')}
            className="mt-4 w-full bg-yellow-600 text-white py-2 rounded-lg hover:bg-yellow-700"
          >
            Back to Orders
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h1 className="mb-2 text-2xl font-bold text-gray-900">Rate Your Order</h1>
          <p className="text-gray-600 mb-4">
            Help us improve by rating the products in your order
          </p>
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            <div>
              <span className="font-semibold">Order #:</span> {order.order_number}
            </div>
            <div>
              <span className="font-semibold">Date:</span>{' '}
              {new Date(order.created_at).toLocaleDateString()}
            </div>
            <div>
              <span className="font-semibold">Items:</span> {order.items.length}
            </div>
          </div>
        </div>

        {submitStatus === 'success' ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="mb-4 text-3xl">✓</div>
            <h2 className="mb-2 text-xl font-bold text-gray-900">Thank You!</h2>
            <p className="text-gray-600 mb-6">
              Your reviews have been submitted successfully. We appreciate your feedback!
            </p>
            <button
              onClick={() => router.push('/orders')}
              className="bg-yellow-600 text-white px-6 py-2 rounded-lg hover:bg-yellow-700"
            >
              Back to Orders
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Error Message */}
            {errorMessage && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                {errorMessage}
              </div>
            )}

            {/* Product Review Cards */}
            <div className="space-y-6 mb-8">
              {order.items.map((item, index) => {
                const productId = item.product_id || item.productId || `item-${index}`;
                const review = reviews[productId];

                return (
                  <div key={productId} className="bg-white rounded-lg shadow p-6">
                    {/* Product Info */}
                    <div className="flex gap-4 mb-6 pb-6 border-b">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-24 h-24 object-cover rounded bg-gray-100"
                        />
                      ) : (
                        <div className="w-24 h-24 bg-gray-100 rounded flex items-center justify-center">
                          <span className="text-gray-400 text-sm">No image</span>
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {item.name || `Product ${index + 1}`}
                        </h3>
                        <p className="text-gray-600 text-sm">
                          Quantity: {item.quantity}
                        </p>
                        <p className="text-gray-700 font-semibold mt-2">
                          GHS {(item.price || 0).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* Review Form */}
                    <div className="space-y-4">
                      {/* Star Rating */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                          Your Rating *
                        </label>
                        <div className="flex gap-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => updateReview(productId, 'rating', star)}
                              className="transition-transform hover:scale-110"
                            >
                              <StarIcon
                                className={`w-8 h-8 ${
                                  star <= (review?.rating || 0)
                                    ? 'text-yellow-400 fill-current'
                                    : 'text-gray-300'
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                        {review?.rating > 0 && (
                          <p className="text-sm text-gray-600 mt-1">
                            You rated: {review.rating} star{review.rating !== 1 ? 's' : ''}
                          </p>
                        )}
                      </div>

                      {/* Title */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                          Review Title (Optional)
                        </label>
                        <input
                          type="text"
                          value={review?.title || ''}
                          onChange={(e) =>
                            updateReview(productId, 'title', e.target.value)
                          }
                          placeholder="E.g., Great quality!"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                        />
                      </div>

                      {/* Comment */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                          Your Review (Optional)
                        </label>
                        <textarea
                          value={review?.comment || ''}
                          onChange={(e) =>
                            updateReview(productId, 'comment', e.target.value)
                          }
                          placeholder="Share your experience with this product..."
                          rows={3}
                          className="w-full px-4 py-2 border border-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {(review?.comment || '').length}/500 characters
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Submit Button */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => router.push('/orders')}
                className="flex-1 bg-gray-200 text-gray-900 py-3 rounded-lg hover:bg-gray-300 font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-yellow-600 text-white py-3 rounded-lg hover:bg-yellow-700 font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting Reviews...' : 'Submit All Reviews'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
