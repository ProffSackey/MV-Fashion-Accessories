"use client";

import { useEffect, useState } from 'react';
import { BanknotesIcon, ShoppingCartIcon, UsersIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { formatCurrency, parseCurrency } from '../../lib/currency';

interface KPICardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  iconBg?: string;
  iconColor?: string;
}

function KPICard({ title, value, icon, iconBg = "bg-yellow-100", iconColor = "text-yellow-600" }: KPICardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
      <div className="flex flex-col items-center justify-center text-center">
        <div className={`${iconBg} p-3 rounded-lg ${iconColor} mb-4`}>
          {icon}
        </div>
        <p className="text-gray-600 text-sm font-medium">{title}</p>
        <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
      </div>
    </div>
  );
}

export default function DashboardOverview() {
  const [revenue, setRevenue] = useState('');
  const [orders, setOrders] = useState('');
  const [customers, setCustomers] = useState('');
  const [lowStock, setLowStock] = useState('');

  useEffect(() => {
    // Try fetching real data from API endpoints. If endpoints are unavailable,
    // fall back to empty states (no hardcoded demo data).
    (async () => {
      try {
        // Customers
        try {
          const res = await fetch('/api/admin/customers');
          if (res.ok) {
            const data = await res.json();
            setCustomers(String((data || []).length));
          }
        } catch (err) {
          // ignore — endpoint may be protected or missing
        }

        // Products -> low stock (use stock_quantity threshold)
        try {
          const res = await fetch('/api/admin/products');
          if (res.ok) {
            const data = await res.json();
            const threshold = 5; // configurable: items at or below this count are low stock
            const low = (data || []).filter((p: any) => {
              const qty = Number(p?.stock_quantity ?? p?.quantity ?? 0);
              return !isNaN(qty) && qty <= threshold;
            }).length;
            setLowStock(String(low));
          }
        } catch (err) {
          // ignore
        }

        // Orders -> revenue & count
        try {
          const res = await fetch('/api/admin/orders');
          if (res.ok) {
            const data = await res.json();
            const ordersList = data || [];
            const totalRevenue = ordersList.reduce((sum: number, order: any) => {
              const amount = parseCurrency(order.total_amount || order.amount);
              return sum + (isNaN(amount) ? 0 : amount);
            }, 0);
            setRevenue(totalRevenue ? formatCurrency(totalRevenue) : '');
            setOrders(String(ordersList.length || 0));
          }
        } catch (err) {
          // ignore
        }
      } catch (e) {
        console.error('Error reading dashboard data', e);
      }
    })();
  }, []);
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome back, here's what's happening today.</p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Revenue"
          value={revenue}
          icon={<BanknotesIcon className="h-8 w-8" />}
          iconBg="bg-yellow-100"
          iconColor="text-yellow-600"
        />
        <KPICard
          title="Total Orders"
          value={orders}
          icon={<ShoppingCartIcon className="h-8 w-8" />}
          iconBg="bg-green-100"
          iconColor="text-green-600"
        />
        <KPICard
          title="Customers"
          value={customers}
          icon={<UsersIcon className="h-8 w-8" />}
          iconBg="bg-purple-100"
          iconColor="text-purple-600"
        />
        <KPICard
          title="Low Stock"
          value={lowStock}
          icon={<ExclamationTriangleIcon className="h-8 w-8" />}
          iconBg="bg-red-100"
          iconColor="text-red-600"
        />
      </div>
    </div>
  );
}
