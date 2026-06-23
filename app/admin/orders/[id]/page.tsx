"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { parseCurrency } from "@/lib/currency";

const statusColors: Record<string, { bg: string; text: string }> = {
  Delivered: { bg: "bg-yellow-100", text: "text-yellow-600" },
  Processing: { bg: "bg-gray-100", text: "text-gray-600" },
  Shipped: { bg: "bg-gray-100", text: "text-gray-600" },
  Cancelled: { bg: "bg-red-100", text: "text-red-600" },
};

const paymentColors: Record<string, string> = {
  Paid: "text-green-600",
  Refunded: "text-red-600",
  Pending: "text-yellow-700",
};

interface OrderData {
  id: string;
  customer: string;
  email: string;
  phone: string;
  itemsDetail: Array<{ productId: string; quantity: number; price: number; name?: string; image?: string }>;
  amount: string;
  status: string;
  payment: string;
  date: string;
  shippingAddress: {
    street?: string;
    city?: string;
    postcode?: string;
    country?: string;
    region?: string;
  };
  total_amount?: number;
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [id, setId] = useState<string | null>(null);

  // Unwrap async params
  useEffect(() => {
    params.then((p) => setId(p.id));
  }, [params]);

  // Fetch order data from API
  useEffect(() => {
    if (!id) return;

    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/admin/orders`);
        if (res.ok) {
          const data = await res.json();
          const foundOrder = data.find((o: OrderData) => o.id === id);
          setOrder(foundOrder || null);
        }
      } catch (error) {
        console.error('Error fetching order:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [id]);

  if (loading) {
    return (
      <div className="p-4 sm:p-6 md:p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading order...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-4 sm:p-6 md:p-8">
        <button
          onClick={() => router.back()}
          className="text-yellow-600 hover:underline mb-4 inline-block"
        >
          &larr; Back
        </button>
        <p className="text-gray-600">Order not found.</p>
      </div>
    );
  }

  const subtotal = order.total_amount || parseCurrency(order.amount);
  const shippingCost = 0;
  const tax = 0;
  const total = subtotal;

  return (
    <div className="p-4 sm:p-6 md:p-8 overflow-x-auto">
      <button
        onClick={() => router.back()}
        className="text-yellow-600 hover:underline mb-4 inline-block"
      >
        &larr; Back
      </button>

      <h1 className="text-3xl font-bold mb-6 text-gray-900">Order {order.id}</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4 bg-white p-4 sm:p-6 rounded shadow-sm text-gray-900">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="font-semibold text-gray-700">Customer:</span>
              <p className="text-gray-900 mt-1">{order.customer}</p>
              <p className="text-sm text-gray-600">{order.email}</p>
            </div>
            <div>
              <span className="font-semibold text-gray-700">Phone:</span>
              <p className="text-gray-900 mt-1">{order.phone || '—'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="font-semibold text-gray-700">Order Date:</span>
              <p className="text-gray-900 mt-1">{order.date}</p>
            </div>
            <div>
              <span className="font-semibold text-gray-700">Status:</span>
              <div className="mt-1">
                <span
                  className={`inline-block px-3 py-1 rounded-full font-medium text-xs ${statusColors[order.status]?.bg || statusColors['Processing'].bg} ${statusColors[order.status]?.text || statusColors['Processing'].text}`}
                >
                  {order.status}
                </span>
              </div>
            </div>
          </div>

          <hr className="my-4" />

          <hr className="my-4" />

          <div>
            <h2 className="font-semibold mb-4 text-lg text-gray-900">Order Items</h2>
            <div className="space-y-4">
              {(order.itemsDetail || []).map((item, idx) => (
                <div key={idx} className="flex gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                  {/* Product Image */}
                  <div className="flex-shrink-0 w-20 h-20 bg-gray-100 rounded flex items-center justify-center overflow-hidden">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt="Product"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    )}
                  </div>

                  {/* Product Details */}
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-sm">
                      {item.name || `Product ${idx + 1}`}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">ID: {item.productId}</p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-sm">
                        <span className="font-semibold text-gray-900">Qty:</span>{" "}
                        <span className="text-gray-600">{item.quantity}</span>
                      </span>
                      <span className="font-semibold text-gray-900">
                        GHS {((item.price || 0) * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <hr className="my-4" />

          <div className="grid grid-cols-2 gap-6">
            <div>
              <h2 className="font-semibold mb-3 text-gray-900">Shipping Address</h2>
              <div className="text-gray-700 space-y-1 text-sm">
                {order.shippingAddress ? (
                  <>
                    <div className="font-medium">{order.shippingAddress.street}</div>
                    <div>{order.shippingAddress.city}, {order.shippingAddress.region}</div>
                    <div>{order.shippingAddress.postcode}, {order.shippingAddress.country}</div>
                  </>
                ) : (
                  <div className="text-gray-400">No shipping address provided</div>
                )}
              </div>
            </div>
            <div>
              <h2 className="font-semibold mb-3 text-gray-900">Contact Information</h2>
              <div className="text-gray-700 space-y-2 text-sm">
                <div>
                  <span className="font-medium">Phone:</span>
                  <div className="text-gray-600">{order.phone || '—'}</div>
                </div>
                <div>
                  <span className="font-medium">Email:</span>
                  <div className="text-gray-600 break-all">{order.email}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <aside className="bg-white p-6 rounded shadow-sm text-gray-900 h-fit sticky top-8">
          <h3 className="font-bold text-lg mb-4">Order Summary</h3>
          <div className="space-y-3 mb-4">
            <div className="flex justify-between text-gray-700 text-sm">
              <div>Subtotal</div>
              <div className="font-medium">GHS {subtotal.toFixed(2)}</div>
            </div>
            <div className="flex justify-between text-gray-700 text-sm">
              <div>Shipping</div>
              <div className="font-medium">GHS {shippingCost.toFixed(2)}</div>
            </div>
            <div className="flex justify-between text-gray-700 text-sm">
              <div>Tax</div>
              <div className="font-medium">GHS {tax.toFixed(2)}</div>
            </div>
          </div>

          <div className="border-t pt-4 flex justify-between font-bold text-gray-900 text-lg">
            <div>Total</div>
            <div className="text-yellow-600">GHS {total.toFixed(2)}</div>
          </div>

          <div className="mt-5 pt-4 border-t">
            <div className="text-sm mb-2">
              <span className="text-gray-600">Payment Status:</span>
            </div>
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${paymentColors[order.payment] || paymentColors['Pending']}`}>
              {order.payment}
            </span>
          </div>
        </aside>
      </div>
    </div>
  );
}
