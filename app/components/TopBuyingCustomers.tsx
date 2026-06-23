"use client";

import { useEffect, useState } from 'react';

interface TopBuyingCustomersProps {
  timePeriod: string;
}

export default function TopBuyingCustomers({ timePeriod }: TopBuyingCustomersProps) {
  const [rows, setRows] = useState<Array<{ email: string; name: string; spent: number; orders: number }>>([]);

  const getDateRange = () => {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    switch (timePeriod) {
      case 'Today':
        return { startDate: startOfToday, endDate: new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000) };
      case 'Last 7 days': {
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 6);
        return { startDate: sevenDaysAgo, endDate: new Date(today.getTime() + 24 * 60 * 60 * 1000) };
      }
      case 'Last 30 days': {
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 29);
        return { startDate: thirtyDaysAgo, endDate: new Date(today.getTime() + 24 * 60 * 60 * 1000) };
      }
      case 'Last year':
        return { startDate: new Date(today.getFullYear() - 1, 0, 1), endDate: new Date(today.getFullYear(), 0, 1) };
      case 'Last 12 months':
      default:
        return { startDate: new Date(today.getFullYear(), 0, 1), endDate: new Date(today.getFullYear() + 1, 0, 1) };
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const ordersRes = await fetch('/api/admin/orders');
        if (!ordersRes.ok) return;
        const orders = await ordersRes.json();
        if (!Array.isArray(orders)) return;

        const { startDate, endDate } = getDateRange();

        // Aggregate spend and order count by customer email
        const map = new Map<string, { name: string; spent: number; orders: number }>();
        for (const order of orders) {
          const dateStr = order.created_at || order.date || order.ordered_at || order.order_date;
          const d = dateStr ? new Date(dateStr) : null;
          if (!d || d < startDate || d >= endDate) continue;

          const email = order.email || order.customer_email || order.customer || 'guest';
          const name = order.customer || order.customer_name || order.customer_email || email;
          const amountRaw = order.total_amount ?? order.amount ?? order.total ?? order.grand_total ?? 0;
          const amount = parseFloat(String(amountRaw).replace(/[^0-9.-]+/g, '')) || 0;

          const entry = map.get(email) || { name, spent: 0, orders: 0 };
          entry.spent += amount;
          entry.orders += 1;
          map.set(email, entry);
        }

        const arr = Array.from(map.entries())
          .map(([email, v]) => ({ email, name: v.name, spent: v.spent, orders: v.orders }))
          .sort((a, b) => b.spent - a.spent)
          .slice(0, 10);

        setRows(arr);
      } catch (e) {
        console.error('TopBuyingCustomers: failed to load', e);
      }
    })();
  }, [timePeriod]);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Top Buying Customers</h2>
      <div className="overflow-x-auto table-scroll">
        <table className="w-full min-w-[400px]">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Customer Name</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Total Spent</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Orders</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((customer) => (
              <tr key={customer.email} className="border-b hover:bg-gray-50 transition">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{customer.name}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{`GHS ${customer.spent.toLocaleString('en-GB', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{customer.orders}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
