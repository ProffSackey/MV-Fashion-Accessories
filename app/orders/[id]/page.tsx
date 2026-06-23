"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUserAuth } from "@/lib/useUserAuth";
import { CheckCircleIcon, ClockIcon, TruckIcon, CubeIcon, ArrowLeftIcon, QuestionMarkCircleIcon } from "@heroicons/react/24/outline";
import ProductRatingModal from "@/app/components/ProductRatingModal";

interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
  name?: string;
  image?: string;
}

interface OrderData {
  id: string;
  order_number: string;
  customer_email: string;
  customer_name: string;
  customer_phone: string;
  total_amount: number;
  status: string;
  payment_status: string;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
  shipping_address: {
    street?: string;
    city?: string;
    postcode?: string;
    country?: string;
    region?: string;
  };
}

const statusSteps = [
  { key: "pending", label: "Order Placed", icon: CubeIcon, description: "We've received your order" },
  { key: "processing", label: "Processing", icon: ClockIcon, description: "We're preparing your items" },
  { key: "shipped", label: "Shipped", icon: TruckIcon, description: "Your order is on the way" },
  { key: "delivered", label: "Delivered", icon: CheckCircleIcon, description: "Order has arrived" },
];

const getStatusStepIndex = (status: string): number => {
  const statusMap: Record<string, number> = {
    pending: 0,
    processing: 1,
    shipped: 2,
    delivered: 3,
    cancelled: -1,
  };
  return statusMap[status.toLowerCase()] ?? 0;
};

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case "delivered":
      return "bg-green-100 text-green-800";
    case "shipped":
      return "bg-yellow-100 text-yellow-800";
    case "processing":
      return "bg-yellow-100 text-yellow-900";
    case "pending":
      return "bg-gray-100 text-gray-800";
    case "cancelled":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { user, loading: authLoading } = useUserAuth();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [id, setId] = useState<string | null>(null);
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [currentProductRating, setCurrentProductRating] = useState<OrderItem | null>(null);
  const [ratedProductIds, setRatedProductIds] = useState<Set<string>>(new Set());

  // Unwrap async params
  useEffect(() => {
    params.then((p) => setId(p.id));
  }, [params]);

  // Fetch order data
  useEffect(() => {
    if (!id || !user) return;

    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/customer-orders?email=${encodeURIComponent(user.email || '')}`);
        if (res.ok) {
          const data = await res.json();
          const foundOrder = data.find((o: OrderData) => o.id === id || o.order_number === id);
          setOrder(foundOrder || null);
        }
      } catch (error) {
        console.error('Error fetching order:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [id, user]);

  // Auto-open rating modal for delivered or shipped orders
  useEffect(() => {
    if (order && (order.status.toLowerCase() === "delivered" || order.status.toLowerCase() === "shipped") && order.items.length > 0) {
      // Find the first unrated product (check DB to avoid re-showing after submit)
      (async () => {
        for (const item of order.items) {
          if (ratedProductIds.has(item.productId)) continue;

          try {
            // Check if a review exists for this product tied to this order
            const res = await fetch(`/api/reviews?product_id=${encodeURIComponent(item.productId)}&order_id=${encodeURIComponent(order.id)}&customer_email=${encodeURIComponent(order.customer_email)}`);
            if (!res.ok) {
              // If the reviews endpoint fails, skip this item to avoid blocking the UI
              console.warn('Could not check existing review for product', item.productId);
              continue;
            }
            const existing = await res.json();
            if (Array.isArray(existing) && existing.length > 0) {
              // mark as already reviewed
              setRatedProductIds((prev) => new Set(prev).add(item.productId));
              continue;
            }

            // No existing review — open modal for this item
            setCurrentProductRating(item);
            setRatingModalOpen(true);
            break;
          } catch (e) {
            console.warn('Error checking review existence for item', item.productId, e);
            continue;
          }
        }
      })();
    }
  }, [order, ratedProductIds]);

  // Handle review submission
  const handleSubmitReview = async (rating: number, comment: string) => {
    if (!currentProductRating || !order || !user?.id) return;

    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: currentProductRating.productId,
          rating,
          comment,
          customer_id: user.id,
          customer_email: user?.email || null,
          customer_name: user?.name || (user?.email ? user.email.split('@')[0] : null),
          order_id: order.id,
        }),
      });

      // try to extract server error message when present
      if (!response.ok) {
        let body: any = null;
        try {
          body = await response.json();
        } catch (e) {
          // ignore json parse errors
        }
        const serverMessage = body?.error || body?.message || `Request failed (${response.status})`;
        console.error("Review submit failed:", serverMessage, body);
        throw new Error(serverMessage);
      }

      // success
      const newReview = await response.json();
      const newRatedSet = new Set(ratedProductIds);
      newRatedSet.add(currentProductRating.productId);
      setRatedProductIds(newRatedSet);
      setRatingModalOpen(false);
      return newReview;
    } catch (error) {
      console.error("Error submitting review:", error);
      throw error;
    }
  };



  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-white p-8">
        <button
          onClick={() => router.back()}
          className="text-yellow-700 hover:text-yellow-800 flex items-center gap-2 mb-6 font-medium"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          Back to Orders
        </button>
        <div className="text-center py-16">
          <p className="text-gray-600 text-lg">Order not found.</p>
        </div>
      </div>
    );
  }

  const statusIndex = getStatusStepIndex(order.status);
  const subtotal = order.total_amount || 0;
  const shippingCost = 0;
  const tax = 0;
  const total = subtotal;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-6 shadow-sm">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={() => router.back()}
            className="text-yellow-700 hover:text-yellow-800 flex items-center gap-2 mb-4 font-medium"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            Back to Orders
          </button>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">{order.order_number}</h1>
              <p className="text-sm text-gray-600 mt-1">
                Order placed on {new Date(order.created_at).toLocaleDateString("en-GB", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            <span
              className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(
                order.status
              )}`}
            >
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Order Tracking Timeline */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-8">Order Status</h2>
          
          {order.status.toLowerCase() === "cancelled" ? (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
              <p className="text-red-800 font-semibold">This order has been cancelled</p>
              <p className="text-red-700 text-sm mt-1">Please contact support if you have any questions.</p>
            </div>
          ) : (
            <div className="relative">
              {/* Progress Line */}
              <div className="absolute top-8 left-0 right-0 h-1 bg-gray-200 z-0">
                <div
                  className="h-full bg-yellow-500 transition-all duration-500"
                  style={{ width: `${(statusIndex / (statusSteps.length - 1)) * 100}%` }}
                />
              </div>

              {/* Status Steps */}
              <div className="relative z-10 grid grid-cols-4 gap-4">
                {statusSteps.map((step, index) => {
                  const Icon = step.icon;
                  const isCompleted = index <= statusIndex;
                  const isCurrent = index === statusIndex;

                  return (
                    <div key={step.key} className="flex flex-col items-center">
                      <div
                        className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 transition-all duration-300 ${
                          isCompleted
                            ? "bg-yellow-600 text-white shadow-lg"
                            : "bg-gray-200 text-gray-400"
                        } ${isCurrent ? "ring-4 ring-yellow-300" : ""}`}
                      >
                        <Icon className="w-8 h-8" />
                      </div>
                      <h3
                        className={`font-semibold text-sm text-center ${
                          isCompleted ? "text-gray-900" : "text-gray-600"
                        }`}
                      >
                        {step.label}
                      </h3>
                      <p className="text-xs text-gray-500 text-center mt-1 max-w-[100px]">
                        {step.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Items */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Order Items</h2>
              <div className="space-y-4">
                {(order.items || []).map((item, idx) => (
                  <div
                    key={idx}
                    className="flex gap-4 pb-4 border-b border-gray-200 last:border-b-0 last:pb-0"
                  >
                    {/* Product Image */}
                    <div className="flex-shrink-0 w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name || "Product"}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <svg
                          className="w-8 h-8 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      )}
                    </div>

                    {/* Product Details */}
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">
                        {item.name || `Product ${idx + 1}`}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">ID: {item.productId}</p>
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-3">
                          <span className="text-sm">
                            <span className="font-semibold text-gray-700">Qty:</span>
                            <span className="text-gray-600 ml-1">{item.quantity}</span>
                          </span>
                          <span className="text-sm">
                            <span className="font-semibold text-gray-700">Price:</span>
                            <span className="text-gray-600 ml-1">GHS {(item.price || 0).toFixed(2)}</span>
                          </span>
                        </div>
                        <span className="font-bold text-gray-900">
                          GHS {((item.price || 0) * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Shipping Address */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Shipping Address</h2>
              <div className="text-gray-700 space-y-2">
                {order.shipping_address ? (
                  <>
                    <div className="font-semibold">{order.shipping_address.street}</div>
                    <div>
                      {order.shipping_address.city}
                      {order.shipping_address.region && `, ${order.shipping_address.region}`}
                    </div>
                    <div>
                      {order.shipping_address.postcode}
                      {order.shipping_address.country && `, ${order.shipping_address.country}`}
                    </div>
                  </>
                ) : (
                  <div className="text-gray-400">No shipping address provided</div>
                )}
              </div>
            </div>

          </div>

          {/* Order Summary Sidebar */}
          <div>
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-8">
              <h3 className="font-bold text-lg text-gray-900 mb-6">Order Summary</h3>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-700">Subtotal</span>
                  <span className="font-medium text-gray-900">GHS {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Shipping</span>
                  <span className="font-medium text-gray-900">GHS {shippingCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Tax</span>
                  <span className="font-medium text-gray-900">GHS {tax.toFixed(2)}</span>
                </div>
              </div>

              <div className="border-t pt-4 mb-6">
                <div className="flex justify-between">
                  <span className="font-bold text-gray-900">Total</span>
                  <span className="font-bold text-lg text-yellow-700">GHS {total.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Status */}
              <div className="bg-gray-50 rounded p-4">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                  Payment Status
                </p>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                      order.payment_status.toLowerCase() === "paid"
                        ? "bg-green-100 text-green-800"
                        : order.payment_status.toLowerCase() === "refunded"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-900"
                    }`}
                  >
                    {order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1)}
                  </span>
                </div>
              </div>

              {/* Contact Information */}
              <div className="mt-6 pt-6 border-t">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">
                  Contact Information
                </p>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-semibold text-gray-700">Name:</span>
                    <p className="text-gray-600">{order.customer_name}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">Email:</span>
                    <p className="text-gray-600 break-all">{order.customer_email}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">Phone:</span>
                    <p className="text-gray-600">{order.customer_phone || '—'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Product Rating Modal */}
      <ProductRatingModal
        isOpen={ratingModalOpen}
        product={
          currentProductRating
            ? {
                id: currentProductRating.productId,
                name: currentProductRating.name || `Product ${order?.items.indexOf(currentProductRating) + 1 || 'Unknown'}`,
                image: currentProductRating.image,
              }
            : null
        }
        onClose={() => {
          setRatingModalOpen(false);
          setCurrentProductRating(null);
        }}
        onSubmit={handleSubmitReview}
        customerId={user?.id}
      />
    </div>
  );
}
