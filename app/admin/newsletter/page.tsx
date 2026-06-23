"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import AdminNavbar from "../../components/AdminNavbar";
import AdminSidebar from "../../components/AdminSidebar";
import { BellIcon, ChartBarIcon, CogIcon, CreditCardIcon, CubeIcon, EnvelopeIcon, GiftIcon, HomeIcon, NewspaperIcon, ShoppingCartIcon, StarIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import { useAdminSession } from "../../../lib/useAdminSession";

interface Subscriber {
  id?: string;
  email: string;
  is_active?: boolean;
  subscribed_at?: string;
  created_at?: string;
}

export default function AdminNewsletterPage() {
  const { sessionChecked } = useAdminSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionChecked) return;

    const loadSubscribers = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/newsletter");
        const data = res.ok ? await res.json() : [];
        setSubscribers(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to load newsletter subscribers:", error);
        setSubscribers([]);
      } finally {
        setLoading(false);
      }
    };

    loadSubscribers();
  }, [sessionChecked]);

  if (!sessionChecked) return null;

  const activeCount = subscribers.filter((subscriber) => subscriber.is_active !== false).length;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <AdminNavbar onMenuToggle={setMobileMenuOpen} />
      <div className="flex">
        <AdminSidebar active="newsletter" mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />

        <main className="flex-1 overflow-x-auto">
          <div className="bg-white px-4 sm:px-6 md:px-8 py-6">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">Newsletter</h1>
            <p className="text-gray-700 mt-1">View subscribers who signed up from the website footer.</p>
          </div>

          <div className="px-4 sm:px-6 md:px-8 py-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-white">
            <div className="bg-gray-50 rounded-lg p-6">
              <p className="text-gray-700 text-sm font-medium">Total Subscribers</p>
              <p className="text-3xl font-bold mt-2">{subscribers.length.toLocaleString()}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-6">
              <p className="text-gray-700 text-sm font-medium">Active Subscribers</p>
              <p className="text-3xl font-bold mt-2">{activeCount.toLocaleString()}</p>
            </div>
          </div>

          <div className="px-4 sm:px-6 md:px-8 py-6">
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <table className="w-full min-w-[560px]">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Email</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Subscribed</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td className="px-6 py-6 text-gray-500" colSpan={3}>Loading subscribers...</td></tr>
                  ) : subscribers.length === 0 ? (
                    <tr><td className="px-6 py-6 text-gray-500" colSpan={3}>No newsletter subscribers yet.</td></tr>
                  ) : (
                    subscribers.map((subscriber) => (
                      <tr key={subscriber.id || subscriber.email} className="border-b hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium">{subscriber.email}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                            {subscriber.is_active === false ? "Inactive" : "Active"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {subscriber.subscribed_at || subscriber.created_at ? new Date(subscriber.subscribed_at || subscriber.created_at || "").toLocaleString() : ""}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
