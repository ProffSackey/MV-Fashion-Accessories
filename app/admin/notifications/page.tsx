"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AdminNavbar from "../../components/AdminNavbar";
import { HomeIcon, UserGroupIcon, ShoppingCartIcon, CubeIcon, CreditCardIcon, ChartBarIcon, StarIcon, GiftIcon, BellIcon, EnvelopeIcon, CogIcon } from "@heroicons/react/24/outline";
import { useAdminSession } from "../../../lib/useAdminSession";

import { Notification, fetchNotifications, markNotificationRead, markAllNotificationsRead } from "../../../lib/supabaseService";

// local-only utility to convert timestamp to "n mins ago"
const relativeTime = (iso?: string) => {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} min${mins !== 1 ? 's' : ''} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days !== 1 ? 's' : ''} ago`;
}

export default function NotificationsPage() {
  const router = useRouter();
  const { sessionChecked } = useAdminSession();
  const [filter, setFilter] = useState("All");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (sessionChecked) {
      loadNotifications();
    }
  }, [sessionChecked]);

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  const filtered = notifications.filter((n) => {
    if (filter === "All") return true;
    if (filter === "Unread") return !n.is_read;
    return n.type === filter;
  });

  const loadNotifications = async () => {
    const notifs = await fetchNotifications('admin');
    setNotifications(notifs);
  };

  const markAllRead = async () => {
    await markAllNotificationsRead('admin');
    setNotifications((n) => n.map((x) => ({ ...x, is_read: true })));
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminNavbar />
      <div className="flex">
        {/* Sidebar */}
        <div className="hidden md:block w-64 bg-white shadow-lg">
          <nav className="space-y-3 text-gray-700 text-base px-4 py-6">
            <a href="/admin/dashboard" className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100 font-medium transition"><HomeIcon className="h-5 w-5" />Dashboard Overview</a>
            <a href="/admin/customers" className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100 font-medium transition"><UserGroupIcon className="h-5 w-5" />Customers</a>
            <a href="/admin/orders" className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100 font-medium transition"><ShoppingCartIcon className="h-5 w-5" />Orders</a>
            <a href="/admin/products" className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100 font-medium transition"><CubeIcon className="h-5 w-5" />Products</a>
            <a href="/admin/transactions" className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100 font-medium transition"><CreditCardIcon className="h-5 w-5" />Transactions</a>
            <a href="/admin/analytics" className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100 font-medium transition"><ChartBarIcon className="h-5 w-5" />Analytics</a>
            <a href="/admin/reviews" className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100 font-medium transition"><StarIcon className="h-5 w-5" />Reviews</a>
            <a href="/admin/promotions" className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100 font-medium transition"><GiftIcon className="h-5 w-5" />Promotions</a>
            <a href="/admin/notifications" className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100 font-medium bg-gray-100 transition"><BellIcon className="h-5 w-5" />Notifications</a>
            <a href="/admin/messages" className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100 font-medium transition"><EnvelopeIcon className="h-5 w-5" />Messages</a>
            <a href="/admin/settings" className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100 font-medium transition"><CogIcon className="h-5 w-5" />Settings</a>
          </nav>
        </div>
        {/* Mobile sidebar omitted for brevity; replicate pattern from other pages */}
        <div className="flex-1 p-4">
          <div className="px-4 py-4 flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Notifications</h1>
              <p className="text-gray-700">Stay updated with your store activity.</p>
            </div>
            <button
              className="bg-white border text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-50"
              onClick={markAllRead}
            >
              ✓ Mark all read
            </button>
          </div>
          <div className="px-4 py-2 flex gap-2">
            {['All', 'Unread', 'Order', 'Alert'].map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-4 py-2 rounded-lg font-medium ${filter === tab ? 'bg-yellow-600 text-white' : 'bg-white border border-gray-300 text-gray-800 hover:bg-gray-50'}`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="mt-4 space-y-2">
            {filtered.map((n) => (
              <div
                key={n.id}
                className={`p-4 rounded-lg border ${!n.is_read ? 'bg-yellow-50' : 'bg-white'}`}
                onClick={() => {
                  if (!n.is_read && n.id) {
                    markNotificationRead(n.id);
                    setNotifications((arr) => arr.map(x => x.id === n.id ? {...x, is_read: true} : x));
                  }
                }}
              >
                <div className="flex justify-between items-center">
                  <div className="font-semibold text-gray-900">{n.title}</div>
                  <div className="text-xs text-gray-600">{relativeTime(n.created_at)}</div>
                </div>
                <div className="text-gray-700">{n.message}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}