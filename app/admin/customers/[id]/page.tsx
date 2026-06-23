"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import AdminNavbar from "../../../components/AdminNavbar";
import { ArrowLeftIcon, EnvelopeIcon, PhoneIcon, MapPinIcon } from "@heroicons/react/24/outline";
import { useAdminSession } from "../../../../lib/useAdminSession";

interface Order {
  id: string;
  date: string;
  amount: string;
  status: "Delivered" | "Processing" | "Shipped" | "Cancelled";
  items: number;
}

interface Customer {
  id: string;
  initials: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  digitalAddress: string;
  status: "Active" | "Inactive";
  joined: string;
  orders: Order[];
}

// Remove hard-coded demo customers; load real customer data from the server.
// const mockCustomers: Customer[] = [];

const statusColors: Record<string, { bg: string; text: string }> = {
  Active: { bg: "bg-green-100", text: "text-green-600" },
  Inactive: { bg: "bg-gray-100", text: "text-gray-600" },
};

export default function CustomerProfilePage() {
  const router = useRouter();
  const params = useParams();
  const { sessionChecked } = useAdminSession();
  const customerId = params.id as string;
  const [customer, setCustomer] = useState<Customer | null>(null);

  // Load customer data from server
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/admin/customers');
        if (!res.ok) return setCustomer(null);
        const data = await res.json();
        if (!Array.isArray(data)) return setCustomer(null);
        const found = data.find((c: any) => c.id === customerId || String(c.id) === String(customerId));
        if (found) {
          // normalize orders if present
          setCustomer({
            id: found.id,
            initials: (found.name || found.email || '').split(' ').map((s: string)=>s[0]).join('').slice(0,2).toUpperCase(),
            name: found.name || found.email || found.id,
            email: found.email || '',
            phone: found.phone || '',
            country: found.address?.country || found.country || '',
            digitalAddress: found.address?.street || found.digitalAddress || '',
            status: found.is_active ? 'Active' : 'Inactive',
            joined: found.created_at ? new Date(found.created_at).toLocaleDateString() : '',
            orders: Array.isArray(found.orders) ? found.orders : [],
          });
        } else {
          setCustomer(null);
        }
      } catch (err) {
        console.error('Error loading customer:', err);
        setCustomer(null);
      }
    };

    load();
  }, [customerId]);

  if (!sessionChecked) {
    return null;
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-gray-100">
        <AdminNavbar />
        <div className="max-w-4xl mx-auto p-8">
          <div className="bg-white shadow rounded-lg p-8 text-center">
            <p className="text-gray-600 text-lg">Customer not found</p>
            <button
              onClick={() => router.back()}
              className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminNavbar />
      
      <div className="max-w-4xl mx-auto p-8">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-yellow-600 hover:text-yellow-800 transition mb-6 font-medium"
        >
          <ArrowLeftIcon className="h-5 w-5" />
          Back to Customers
        </button>

        {/* Profile Header */}
        <div className="bg-white shadow rounded-lg p-8 mb-6">
          <div className="flex items-start gap-6">
            <div className="w-24 h-24 rounded-full bg-yellow-200 flex items-center justify-center text-yellow-600 font-bold text-3xl flex-shrink-0">
              {customer.initials}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h1 className="text-3xl font-bold text-gray-900">{customer.name}</h1>
                <span
                  className={`px-4 py-2 rounded-full font-semibold text-sm ${statusColors[customer.status].bg} ${statusColors[customer.status].text}`}
                >
                  {customer.status}
                </span>
              </div>
              <p className="text-gray-600 mb-4">Customer since {customer.joined}</p>
              
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => router.push(`/admin/messages?email=${encodeURIComponent(customer.email)}&name=${encodeURIComponent(customer.name)}`)}
                  className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition"
                >
                  <EnvelopeIcon className="h-5 w-5" />
                  Send Message
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white shadow rounded-lg p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Contact Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <EnvelopeIcon className="h-5 w-5 text-gray-500" />
                <p className="text-gray-900">{customer.email}</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <PhoneIcon className="h-5 w-5 text-gray-500" />
                <p className="text-gray-900">{customer.phone}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Location Information */}
        <div className="bg-white shadow rounded-lg p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Location</h2>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Country</label>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <MapPinIcon className="h-5 w-5 text-gray-500" />
                <p className="text-gray-900">{customer.country}</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Digital Address</label>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-gray-900">{customer.digitalAddress}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="bg-white shadow rounded-lg p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Account Details</h2>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">Customer ID</label>
              <p className="text-gray-900 font-mono">{customer.id}</p>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">Member Since</label>
              <p className="text-gray-900">{customer.joined}</p>
            </div>
          </div>
        </div>

        {/* Orders Section */}
        <div className="bg-white shadow rounded-lg p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Order History</h2>
            <span className="px-3 py-1 bg-yellow-100 text-yellow-600 rounded-full text-sm font-semibold">
              {customer.orders.length} orders
            </span>
          </div>

          {customer.orders.length > 0 ? (
            <div className="overflow-x-auto table-scroll">
              <table className="w-full min-w-[600px]">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Order ID</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Date</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Items</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Amount</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {customer.orders.map((order) => (
                    <tr key={order.id} className="border-b hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{order.id}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{order.date}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{order.items}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{order.amount}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                          order.status === "Delivered" ? "bg-yellow-100 text-yellow-600" :
                          order.status === "Processing" ? "bg-yellow-100 text-yellow-700" :
                          order.status === "Shipped" ? "bg-purple-100 text-purple-600" :
                          "bg-red-100 text-red-600"
                        }`}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No orders yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
