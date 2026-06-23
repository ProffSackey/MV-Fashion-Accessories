"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from 'react';

interface Order {
  id: string;
  initials: string;
  customerName: string;
  orderId: string;
  timestamp: string;
  amount: string;
  status: 'Delivered' | 'Processing' | 'Shipped' | 'Cancelled';
}

export default function RecentOrders() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/orders');
        if (res.ok) {
          const data = await res.json();
          // Map DB orders to UI shape if necessary
          const mapped = (data || []).map((o: any, idx: number) => ({
            id: o.id || String(idx),
            initials: o.customer ? (o.customer.split(' ').map((n: string) => n[0]).join('').toUpperCase()) : 'CU',
            customerName: o.customer || o.email || 'Customer',
            orderId: o.order_number || o.orderId || `#${o.id?.slice(0,8)}`,
            timestamp: o.created_at ? new Date(o.created_at).toLocaleString() : '',
            amount: o.total_amount ? `GHS ${o.total_amount}` : (o.amount || ''),
            status: o.status || 'Processing',
          }));
          setOrders(mapped);
        } else {
          setOrders([]);
        }
      } catch (e) {
        console.error('Failed to load recent orders', e);
        setOrders([]);
      }
    })();
  }, []);

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'Delivered':
        return 'bg-yellow-100 text-yellow-700';
      case 'Processing':
        return 'bg-gray-100 text-gray-700';
      case 'Shipped':
        return 'bg-gray-100 text-gray-700';
      case 'Cancelled':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">Recent Orders</h2>
        <button
          onClick={() => router.push('/admin/orders')}
          className="px-4 py-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition font-medium"
        >
          View All
        </button>
      </div>

      <div className="space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
            {/* Customer */}
            <div className="flex items-center gap-4 flex-1">
              <div className="w-10 h-10 rounded-full bg-yellow-200 flex items-center justify-center text-yellow-600 font-semibold text-sm">
                {order.initials}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{order.customerName}</p>
                <p className="text-sm text-gray-600">{order.orderId} • {order.timestamp}</p>
              </div>
            </div>

            {/* Amount and Status */}
            <div className="flex items-center gap-4 justify-end">
              <span className="font-semibold text-gray-900">{order.amount}</span>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(order.status)}`}>
                {order.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
