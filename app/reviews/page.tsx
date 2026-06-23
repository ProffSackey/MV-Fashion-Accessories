"use client";

import React, { useState, useEffect } from "react";
import { useUserAuth } from "@/lib/useUserAuth";
import ReviewCard from "@/app/components/ReviewCard";
import { SparklesIcon } from "@heroicons/react/24/outline";
import UserAccountShell from "../components/UserAccountShell";

interface Review {
  id: string;
  product_id: string;
  product_name?: string;
  rating: number;
  comment?: string;
  customer_email: string;
  created_at: string;
  order_id?: string;
}

export default function UserReviewsPage() {
  const { user, loading: authLoading } = useUserAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"recent" | "rating">("recent");

  // Server-driven pending review detection: find first delivered order without reviews
  const [pendingOrder, setPendingOrder] = useState<any | null>(null);
  const [pendingReviews, setPendingReviews] = useState<{ [key: string]: { product_id: string; rating: number; comment: string; title?: string } }>({});
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingSubmitting, setPendingSubmitting] = useState(false);
  const [pendingError, setPendingError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user?.email) return;
    (async () => {
      setPendingLoading(true);
      try {
        const ordersRes = await fetch('/api/customer-orders');
        if (!ordersRes.ok) return;
        const orders = await ordersRes.json();

        for (const order of orders) {
          if (!order || order.status !== 'delivered') continue;
          const revRes = await fetch(`/api/reviews?order_id=${encodeURIComponent(order.id)}`);
          if (!revRes.ok) continue;
          const revs = await revRes.json();
          if (!revs || revs.length === 0) {
            // found an unreviewed delivered order — show form for this order
            setPendingOrder(order);
            const init: any = {};
            (order.items || []).forEach((item: any, idx: number) => {
              const productId = item.product_id || item.productId || `item-${idx}`;
              init[productId] = { product_id: productId, rating: 0, comment: '', title: '' };
            });
            setPendingReviews(init);
            break;
          }
        }
      } catch (err) {
        console.error('Error detecting unreviewed orders', err);
      } finally {
        setPendingLoading(false);
      }
    })();
  }, [authLoading, user?.email]);

  const updatePendingReview = (productId: string, field: string, value: any) => {
    setPendingReviews((prev) => ({ ...prev, [productId]: { ...prev[productId], [field]: value } }));
  };

  const submitPendingReviews = async () => {
    if (!pendingOrder) return;
    setPendingSubmitting(true);
    setPendingError(null);
    try {
      if (!user?.id) throw new Error('User not authenticated');
      const promises = Object.values(pendingReviews)
        .filter((r) => r.rating > 0)
        .map(async (r) => {
          const payload = {
            ...r,
            order_id: pendingOrder.id,
            customer_id: user.id,
            customer_email: user?.email || null,
            customer_name: user?.name || (user?.email ? user.email.split('@')[0] : null),
          };
          const res = await fetch('/api/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
          if (!res.ok) {
            let body = null;
            try { body = await res.json(); } catch (e) { /* ignore */ }
            const msg = body?.error || body?.message || `Failed to submit review (${res.status})`;
            throw new Error(msg);
          }
          return res.json();
        });

      await Promise.all(promises);
      setPendingOrder(null);
      setPendingReviews({});

      // refresh reviews
      const resp = await fetch(`/api/reviews?customer_email=${encodeURIComponent(user?.email || '')}`);
      if (resp.ok) {
        const data = await resp.json();
        setReviews(data || []);
      }
    } catch (err) {
      console.error(err);
      setPendingError('Failed to submit reviews.');
    } finally {
      setPendingSubmitting(false);
    }
  };

  useEffect(() => {
    const fetchReviews = async () => {
      if (!user?.email) {
        console.log("No user email available:", user);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        console.log("Fetching reviews for email:", user.email);
        const response = await fetch(
          `/api/reviews?customer_email=${encodeURIComponent(user.email)}`
        );

        console.log("Response status:", response.status);
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Response error:", errorText);
          throw new Error(`Failed to fetch reviews: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        console.log("Fetched reviews:", data);
        setReviews(data || []);
        setError(null);
      } catch (err) {
        console.error("Error fetching reviews:", err);
        setError("Failed to load your reviews. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchReviews();
    }
  }, [user?.email, authLoading]);

  const sortedReviews = [...reviews].sort((a, b) => {
    if (sortBy === "recent") {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    } else {
      return b.rating - a.rating;
    }
  });

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your reviews...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center py-12">
            <h1 className="text-3xl font-bold text-gray-900">Sign In Required</h1>
            <p className="mt-4 text-gray-600">
              Please sign in to view your reviews and ratings.
            </p>
            <a
              href="/login"
              className="mt-6 inline-block px-6 py-3 bg-yellow-700 hover:bg-yellow-800 text-white font-semibold rounded-lg transition"
            >
              Sign In
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <UserAccountShell
      userName={user.user_metadata?.full_name || user.email || "Account"}
      title="Ratings & Reviews"
      subtitle="Manage your product reviews and pending feedback."
    >
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Pending review form when redirected from an order review link */}
        {pendingLoading && (
          <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-gray-600">Loading review form…</p>
          </div>
        )}

        {pendingOrder && (
          <div className="mb-8 bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-2">Leave Reviews for Order #{pendingOrder.order_number || pendingOrder.id}</h2>
            {pendingError && <p className="text-sm text-red-600 mb-2">{pendingError}</p>}

            <div className="space-y-6 mb-6">
              {(pendingOrder.items || []).map((item: any, idx: number) => {
                const productId = item.product_id || item.productId || `item-${idx}`;
                const pr = pendingReviews[productId] || { rating: 0, comment: '', title: '' };
                return (
                  <div key={productId} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-4 mb-4">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-20 h-20 object-cover rounded" />
                      ) : (
                        <div className="w-20 h-20 bg-gray-100 rounded flex items-center justify-center text-gray-400">No image</div>
                      )}
                      <div>
                        <h3 className="font-semibold text-gray-900">{item.name || `Product ${idx+1}`}</h3>
                        <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">Your Rating *</label>
                        <div className="flex gap-2">
                          {[1,2,3,4,5].map((s) => (
                            <button key={s} type="button" onClick={() => updatePendingReview(productId, 'rating', s)} className={`transition-transform ${s <= (pr.rating||0) ? 'text-yellow-400' : 'text-gray-300'}`}>
                              <svg className="w-7 h-7" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.95a1 1 0 00.95.69h4.163c.969 0 1.372 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.95c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.175 0l-3.37 2.448c-.784.57-1.838-.197-1.539-1.118l1.286-3.95a1 1 0 00-.364-1.118L2.07 9.377c-.784-.57-.38-1.81.588-1.81h4.163a1 1 0 00.95-.69l1.286-3.95z"/></svg>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">Title (optional)</label>
                        <input value={pr.title} onChange={(e) => updatePendingReview(productId, 'title', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">Comment (optional)</label>
                        <textarea value={pr.comment} onChange={(e) => updatePendingReview(productId, 'comment', e.target.value)} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setPendingOrder(null); setPendingReviews({}); }} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
              <button onClick={submitPendingReviews} disabled={pendingSubmitting} className="px-4 py-2 bg-yellow-700 text-white rounded">{pendingSubmitting ? 'Submitting…' : 'Submit Reviews'}</button>
            </div>
          </div>
        )}

        {reviews.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200 shadow-sm px-4">
            <SparklesIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              No reviews yet
            </h2>
            <p className="text-gray-600 mb-6">
              You haven&apos;t submitted any product reviews yet. Start rating
              products from your orders to help other customers.
            </p>
            <a
              href="/orders"
              className="inline-block px-6 py-3 bg-yellow-700 hover:bg-yellow-800 text-white font-semibold rounded-lg transition"
            >
              View Your Orders
            </a>
          </div>
        ) : (
          <>
            {/* Stats and Sort Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
              <div className="flex flex-wrap gap-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3">
                  <p className="text-sm text-yellow-700 font-medium">
                    Total Reviews: <span className="font-bold">{reviews.length}</span>
                  </p>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg px-4 py-3">
                  <p className="text-sm text-purple-700 font-medium">
                    Average Rating:{" "}
                    <span className="font-bold">
                      {(
                        reviews.reduce((sum, r) => sum + r.rating, 0) /
                        reviews.length
                      ).toFixed(1)}
                      /5
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label htmlFor="sort" className="text-sm font-medium text-gray-700">
                  Sort by:
                </label>
                <select
                  id="sort"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as "recent" | "rating")}
                  className="px-3 py-2 border text-gray-700 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm"
                >
                  <option value="recent">Most Recent</option>
                  <option value="rating">Highest Rating</option>
                </select>
              </div>
            </div>

            {/* Reviews Grid */}
            <div className="grid gap-6">
              {sortedReviews.map((review) => (
                <ReviewCard key={review.id} review={review} showProductName={true} />
              ))}
            </div>
          </>
        )}
    </UserAccountShell>
  );
}
