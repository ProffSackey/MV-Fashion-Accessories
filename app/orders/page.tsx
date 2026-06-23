"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, Bars3Icon } from "@heroicons/react/24/outline";
import { formatPrice } from "@/lib/promotionUtils";
import { parseCurrency } from "@/lib/currency";
import { useUserAuth } from "../../lib/useUserAuth";
import UserSidebar from "../components/UserSidebar";

interface OrderItem {
  price?: string | number;
  quantity?: number;
  name?: string;
}

interface Order {
  id: string;
  order_number: string;
  customer_email: string;
  total_amount: number;
  status: string;
  created_at: string;
  items: OrderItem[];
}

export default function OrdersPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useUserAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchOrders = async () => {
      try {
        const userEmail = user.email || "";
        const res = await fetch(`/api/customer-orders?email=${encodeURIComponent(userEmail)}`);
        if (res.ok) {
          const data = await res.json();
          setOrders(data);
        } else {
          setError("Failed to load orders");
        }
      } catch (err) {
        console.error("Error fetching orders:", err);
        setError("Failed to load orders");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [user]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "delivered":
        return "bg-green-100 text-green-800";
      case "shipped":
        return "bg-yellow-100 text-yellow-800";
      case "processing":
        return "bg-yellow-100 text-yellow-900";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const userName = user?.user_metadata?.full_name || user?.email || "Account";
  const initials = userName.slice(0, 2).toUpperCase();
  const isBusy = authLoading || loading;

  return (
    <div className="flex min-h-screen w-full bg-gray-100">
      <UserSidebar userName={userName} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <section className="min-w-0 flex-1">
        <div className="sticky top-0 z-30 border-b border-gray-200 bg-white px-4 py-3 md:hidden">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-gray-200 text-gray-700"
              aria-label="Open account menu"
            >
              <Bars3Icon className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-yellow-700">Account</p>
              <p className="truncate text-sm font-semibold text-gray-900">My Orders</p>
            </div>
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-yellow-600 text-sm font-bold text-white">
              {initials}
            </div>
          </div>
        </div>

        <main className="w-full px-4 py-5 sm:px-6 md:px-8 lg:px-10">
          <div className="mx-auto w-full max-w-5xl">
            <button
              type="button"
              onClick={() => router.back()}
              className="mb-4 inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:border-yellow-300 hover:text-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              Back
            </button>
            <header className="mb-5 hidden md:block">
              <p className="text-sm font-semibold text-yellow-700">Account</p>
              <h1 className="mt-1 text-2xl font-bold text-gray-950">My Orders</h1>
              <p className="mt-1 text-sm text-gray-600">Track purchases, delivery status, and order details.</p>
            </header>

            {isBusy ? (
              <div className="rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
                <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-yellow-500"></div>
                <p className="mt-4 text-gray-600">Loading orders...</p>
              </div>
            ) : (
              <>
                {error && (
                  <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
                    {error}
                  </div>
                )}

                {orders.length === 0 ? (
                  <div className="rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
                    <p className="mb-4 text-gray-600">You have not placed any orders yet.</p>
                    <button
                      type="button"
                      onClick={() => router.push("/")}
                      className="rounded-lg bg-yellow-600 px-6 py-2 font-semibold text-white transition hover:bg-yellow-700"
                    >
                      Start Shopping
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <article
                        key={order.id}
                        className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md sm:p-6"
                      >
                        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <h2 className="truncate text-base font-semibold text-gray-900 sm:text-lg">
                              {order.order_number}
                            </h2>
                            <p className="text-sm text-gray-500">
                              {new Date(order.created_at).toLocaleDateString("en-GB", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            </p>
                          </div>
                          <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold sm:text-sm ${getStatusColor(order.status)}`}>
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </span>
                        </div>

                        {Array.isArray(order.items) && order.items.length > 0 && (
                          <div className="mb-4 rounded-md border border-gray-100 bg-gray-50 p-3">
                            <p className="mb-2 text-sm font-semibold text-gray-700">Items</p>
                            <ul className="space-y-1 text-sm text-gray-600">
                              {order.items.map((item, idx) => {
                                const itemPrice = parseCurrency(item.price);
                                return (
                                  <li key={`${order.id}-${idx}`} className="flex justify-between gap-3">
                                    <span>{item.quantity || 1}x {item.name || "Item"}</span>
                                    <span className="font-medium text-gray-800">
                                      {formatPrice(isNaN(itemPrice) ? 0 : itemPrice)}
                                    </span>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        )}

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-lg font-bold text-gray-900">
                            {formatPrice(Number(order.total_amount || 0))}
                          </p>
                          <button
                            type="button"
                            onClick={() => router.push(`/orders/${order.order_number}`)}
                            className="w-full rounded-lg border border-yellow-700 px-4 py-2 font-semibold text-yellow-700 transition hover:bg-yellow-50 sm:w-auto"
                          >
                            View Details
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </section>
    </div>
  );
}
