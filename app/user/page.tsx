"use client";

import { useEffect, useState } from "react";

export const dynamic = 'force-dynamic';
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabaseClient";
import { ArrowLeftIcon, EnvelopeIcon, PhoneIcon, MapPinIcon, StarIcon } from "@heroicons/react/24/outline";
import UserAccountShell from "../components/UserAccountShell";

interface Order {
  id: string;
  date: string;
  amount: string;
  status: "Delivered" | "Processing" | "Shipped" | "Cancelled";
  items: number;
}

interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  country: string;
  address: string;
  avatarUrl: string;
  joinedDate: string;
  orders: Order[];
}

interface RawOrder {
  id?: string;
  order_number?: string;
  created_at?: string;
  total_amount?: number;
  status?: string;
  items?: unknown[];
}

// (Account settings moved to dedicated /settings page)

export default function UserPage() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [unreviewedOrder, setUnreviewedOrder] = useState<Order | null>(null);
  // Account settings were moved to the dedicated settings page
  const router = useRouter();

  const normalizeOrderStatus = (status?: string): Order["status"] => {
    const normalized = (status || "Processing").toLowerCase();
    if (normalized === "delivered") return "Delivered";
    if (normalized === "shipped") return "Shipped";
    if (normalized === "cancelled") return "Cancelled";
    return "Processing";
  };

  // helper to inspect orders for any unreviewed delivered order
  const checkForUnreviewedOrders = async (orders: Order[]) => {
    const deliveredOrders = orders.filter(order => order.status === 'Delivered');

    if (deliveredOrders.length === 0) return;

    for (const order of deliveredOrders) {
      try {
        const response = await fetch(`/api/reviews?order_id=${order.id}`);
        const reviews: unknown = await response.json();

        if (!Array.isArray(reviews) || reviews.length === 0) {
          setUnreviewedOrder(order);
          setShowReviewModal(true);
          break;
        }
      } catch (error) {
        console.error('Error checking reviews for order:', order.id, error);
      }
    }
  };

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!data.session) {
          router.replace('/login');
        } else {
          setUser(data.session.user);
          // populate both the read-only profile shown on the page and the editable form
          const metadata = data.session.user.user_metadata || {};

          // profile form lives on the dedicated settings page now

          // build a simplified view model for the profile section
          const builtProfile: UserProfile = {
            id: data.session.user.id,
            email: data.session.user.email || '',
            fullName: metadata.full_name || data.session.user.email || '',
            phone: metadata.phone || '',
            country: metadata.address?.country || '',
            address: metadata.address?.street || '',
            avatarUrl: metadata.avatar_url || metadata.picture || '',
            joinedDate: data.session.user.created_at
              ? new Date(data.session.user.created_at).toLocaleDateString()
              : '',
            orders: [],
          };

          console.log('=== USER SESSION INFO ===');
          console.log('User Email from session:', builtProfile.email);
          console.log('User ID:', builtProfile.id);
          console.log('Full Name:', builtProfile.fullName);

          // attempt to fetch recent orders for display
          console.log('Fetching orders for email:', builtProfile.email);
          fetch(`/api/customer-orders?email=${encodeURIComponent(builtProfile.email)}`)
            .then((res) => {
              console.log('Orders API response status:', res.status);
              if (!res.ok) {
                console.error('Failed to fetch orders:', res.status);
                return [];
              }
              return res.json();
            })
            .then((ordersData: RawOrder[]) => {
              console.log('Orders API response data:', ordersData);
              if (Array.isArray(ordersData) && ordersData.length > 0) {
                console.log(`Mapping ${ordersData.length} orders`);
                builtProfile.orders = ordersData.map((o) => ({
                  id: o.order_number || o.id || '',
                  date: o.created_at ? new Date(o.created_at).toLocaleDateString() : '',
                  amount: `GHS ${(o.total_amount || 0).toFixed(2)}`,
                  status: normalizeOrderStatus(o.status),
                  items: Array.isArray(o.items) ? o.items.length : 0,
                }));
                console.log('Mapped orders:', builtProfile.orders);
              } else {
                console.log('No orders returned or ordersData is not an array');
              }
            })
            .catch((err) => {
              console.error('Error fetching orders:', err);
              // ignore failure, profile will show empty orders
            })
            .finally(() => {
              console.log('Setting profile with orders:', builtProfile.orders);
              setUserProfile(builtProfile);
              setLoading(false);

              // Check for unreviewed delivered orders after loading
              setTimeout(() => {
                checkForUnreviewedOrders(builtProfile.orders || []);
              }, 1000); // Small delay to ensure page is fully loaded
            });
        }
      })
      .catch((err) => {
        console.error(err);
        router.replace('/login');
      });
  }, [router]);

  if (loading || !user || !userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-gray-600 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto"></div>
          <p className="mt-4">Loading...</p>
        </div>
      </div>
    );
  }
  const deliverySetupMessage = "Kindly set up your delivery details in settings to display your info.";

  // Profile save moved to the /settings page

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const handleReviewNow = () => {
    if (unreviewedOrder) {
      router.push(`/orders/${unreviewedOrder.id}/review`);
      setShowReviewModal(false);
    }
  };

  const handleReviewLater = () => {
    setShowReviewModal(false);
    setUnreviewedOrder(null);
  };

  return (
    <UserAccountShell
      userName={userProfile.fullName}
      title="My Profile"
      subtitle="Review your account details and recent activity."
    >
            {/* Back Button */}
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-yellow-600 hover:text-yellow-800 transition mb-3 sm:mb-4 font-medium text-sm"
            >
              <ArrowLeftIcon className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">Back</span>
            </button>

            {/* Profile Header */}
            <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 shadow-sm rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6 mb-3 sm:mb-4 border border-yellow-200">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-yellow-500 to-yellow-700 flex items-center justify-center text-white font-bold text-xl sm:text-2xl flex-shrink-0 shadow-lg overflow-hidden">
                  {userProfile.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={userProfile.avatarUrl} alt={userProfile.fullName || "Profile"} className="h-full w-full object-cover" />
                  ) : (
                    getInitials(userProfile?.fullName || '')
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">{userProfile?.fullName}</h1>
                      <p className="text-xs sm:text-sm text-yellow-600 font-medium mt-0.5">Member since {userProfile?.joinedDate}</p>
                    </div>
                    <span className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full font-semibold text-xs bg-green-100 text-green-700 border border-green-300 flex-shrink-0 whitespace-nowrap">
                      Active
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-white shadow-sm rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6 mb-3 sm:mb-4 border border-gray-200">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">Contact Information</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200 hover:border-gray-300 transition">
                  <label className="block text-xs uppercase font-semibold text-gray-600 mb-2 tracking-wider">Email Address</label>
                  <div className="flex items-center gap-2">
                    <EnvelopeIcon className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                    <p className="text-xs sm:text-sm text-gray-900 font-medium truncate">{userProfile?.email}</p>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200 hover:border-gray-300 transition">
                  <label className="block text-xs uppercase font-semibold text-gray-600 mb-2 tracking-wider">Phone Number</label>
                  <div className="flex items-center gap-2">
                    <PhoneIcon className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                    <p className="text-xs sm:text-sm text-gray-900 font-medium">{userProfile?.phone || "-"}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div className="bg-white shadow-sm rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6 mb-3 sm:mb-4 border border-gray-200">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">Address</h2>
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Country</label>
                  <div className="flex items-center gap-2 p-2.5 sm:p-3 bg-gray-50 rounded-lg">
                    <MapPinIcon className="h-4 w-4 text-gray-500 flex-shrink-0" />
                    <p className={`text-xs sm:text-sm ${userProfile?.country ? "text-gray-900" : "text-gray-500"}`}>
                      {userProfile?.country || deliverySetupMessage}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Street Address</label>
                  <div className="p-2.5 sm:p-3 bg-gray-50 rounded-lg">
                    <p className={`text-xs sm:text-sm break-words ${userProfile?.address ? "text-gray-900" : "text-gray-500"}`}>
                      {userProfile?.address || deliverySetupMessage}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Order History */}
            <div className="bg-white shadow-sm rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6 mb-3 sm:mb-4 border border-gray-200">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 sm:mb-6">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">Recent Orders</h2>
                <span className="px-2.5 py-1 bg-yellow-100 text-yellow-600 rounded-full text-xs font-semibold flex-shrink-0">
                  {userProfile?.orders?.length || 0} orders
                </span>
              </div>
              {userProfile?.orders && userProfile.orders.length > 0 ? (
                <>
                  {/* Desktop Table */}
                  <div className="hidden sm:block overflow-x-auto table-scroll">
                    <table className="w-full min-w-[500px]">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Order ID</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Date</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Items</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Amount</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userProfile.orders.map((order) => (
                          <tr key={order.id} className="border-b hover:bg-gray-50 transition">
                            <td className="px-3 py-2 text-xs font-medium text-gray-900 truncate">{order.id}</td>
                            <td className="px-3 py-2 text-xs text-gray-700">{order.date}</td>
                            <td className="px-3 py-2 text-xs text-gray-700">{order.items}</td>
                            <td className="px-3 py-2 text-xs font-medium text-gray-900">{order.amount}</td>
                            <td className="px-3 py-2 text-xs">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                                order.status === 'Delivered' ? 'bg-yellow-100 text-yellow-600' :
                                order.status === 'Processing' ? 'bg-yellow-100 text-yellow-700' :
                                order.status === 'Shipped' ? 'bg-purple-100 text-purple-600' :
                                'bg-red-100 text-red-600'
                              }`}>
                                {order.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="sm:hidden space-y-2">
                    {userProfile.orders.map((order) => (
                      <div key={order.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200 hover:border-gray-300 transition">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Order ID</label>
                              <p className="text-xs font-medium text-gray-900 mt-0.5 truncate">{order.id}</p>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 whitespace-nowrap ${
                              order.status === 'Delivered' ? 'bg-yellow-100 text-yellow-600' :
                              order.status === 'Processing' ? 'bg-yellow-100 text-yellow-700' :
                              order.status === 'Shipped' ? 'bg-purple-100 text-purple-600' :
                              'bg-red-100 text-red-600'
                            }`}>
                              {order.status}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-300">
                            <div>
                              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</label>
                              <p className="text-xs font-medium text-gray-900 mt-0.5">{order.date}</p>
                            </div>
                            <div>
                              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Items</label>
                              <p className="text-xs font-medium text-gray-900 mt-0.5">{order.items}</p>
                            </div>
                            <div>
                              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount</label>
                              <p className="text-xs font-medium text-gray-900 mt-0.5">{order.amount}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-6 sm:py-8">
                  <p className="text-xs sm:text-sm text-gray-500">No orders yet. Start shopping now!</p>
                </div>
              )}
            </div>

            {/* Account settings moved to dedicated /settings page */}
    {showReviewModal && unreviewedOrder && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <StarIcon className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Help us improve!</h3>
            <p className="text-sm text-gray-600 mb-6">
              Your order <span className="font-medium">#{unreviewedOrder.id}</span> has been delivered.
              Would you like to share your experience with this purchase?
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleReviewLater}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
              >
                Maybe Later
              </button>
              <button
                onClick={handleReviewNow}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-yellow-500 hover:bg-yellow-700 rounded-lg transition"
              >
                Review Now
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </UserAccountShell>
  );
}
