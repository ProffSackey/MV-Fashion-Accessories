"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AdminNavbar from "../../components/AdminNavbar";
import AdminSidebar from "../../components/AdminSidebar";
import { ChevronDownIcon, HomeIcon, UserGroupIcon, ShoppingCartIcon, CubeIcon, CreditCardIcon, ChartBarIcon, StarIcon, GiftIcon, BellIcon, EnvelopeIcon, NewspaperIcon, CogIcon } from "@heroicons/react/24/outline";
import RevenueChart from "../../components/RevenueChart";
import SalesByCategory from "../../components/SalesByCategory";
import TopProducts from "../../components/TopProducts";
import TopBuyingCustomers from "../../components/TopBuyingCustomers";
import { useAdminSession } from "../../../lib/useAdminSession";

export default function AnalyticsPage() {
  const router = useRouter();
  const { sessionChecked } = useAdminSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Use a broader default so charts show real historical data
  const [timePeriod, setTimePeriod] = useState("Last 12 months");
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);
  const [kpis, setKpis] = useState({ revenue: '', orders: 0, customers: 0, lowStock: 0 });

  // Calculate KPIs from API endpoints
  useEffect(() => {
    if (!sessionChecked) return;

    (async () => {
      try {
        // Fetch products for low stock count (numeric threshold)
        try {
          const res = await fetch('/api/admin/products');
          if (res.ok) {
            const products = await res.json();
            const threshold = 5;
            const lowStockCount = (products || []).filter((p: any) => {
              const qty = Number(p?.stock_quantity ?? p?.quantity ?? p?.stock ?? 0);
              return !isNaN(qty) && qty <= threshold;
            }).length;
            setKpis(prev => ({ ...prev, lowStock: lowStockCount }));
          }
        } catch (err) {
          console.warn('Error fetching products:', err);
        }

        // Fetch orders for revenue and order count
        try {
          const res = await fetch('/api/admin/orders');
          if (res.ok) {
            const orders = await res.json();
            if (Array.isArray(orders)) {
              const totalRevenue = orders.reduce((sum: number, order: any) => {
                const amountRaw = order.total_amount ?? order.amount ?? order.total ?? order.grand_total ?? 0;
                const amount = parseFloat(String(amountRaw).replace(/[^0-9.-]+/g, '')) || 0;
                return sum + amount;
              }, 0);
              
              setKpis(prev => ({
                ...prev,
                revenue: totalRevenue ? `GHS ${totalRevenue.toLocaleString('en-GB', { maximumFractionDigits: 0 })}` : 'GHS 0',
                orders: orders.length,
              }));
            }
          }
        } catch (err) {
          console.warn('Error fetching orders:', err);
        }

        // Fetch customers count
        try {
          const res = await fetch('/api/admin/customers');
          if (res.ok) {
            const customers = await res.json();
            setKpis(prev => ({ ...prev, customers: (customers || []).length }));
          }
        } catch (err) {
          console.warn('Error fetching customers:', err);
        }
      } catch (e) {
        console.error("Error reading KPI data", e);
      }
    })();
  }, [sessionChecked, timePeriod]);

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  };

  if (!sessionChecked) {
    return null;
  }

  const periods = ["Today", "Last 7 days", "Last 30 days", "Last 12 months", "Last year"];

  return (
    <div className="min-h-screen text-gray-800 bg-gray-50">
      <AdminNavbar onMenuToggle={setMobileMenuOpen} />

      <div className="flex">
        <AdminSidebar active="analytics" mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />

        {/* Main Content */}
        <div className="flex-1 overflow-x-auto">
          {/* Header */}
          <div className="bg-white px-4 sm:px-6 md:px-8 py-6 sm:py-8 flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Analytics</h1>
              <p className="text-gray-500 mt-1">Detailed insights into your store performance.</p>
            </div>

            {/* Time Period Dropdown */}
            <div className="relative w-full sm:w-auto">
              <button
                onClick={() => setShowPeriodDropdown(!showPeriodDropdown)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-gray-700 w-full sm:w-auto justify-center"
              >
                <span>{timePeriod}</span>
                <ChevronDownIcon className="h-4 w-4" />
              </button>

              {showPeriodDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                  {periods.map((period) => (
                    <button
                      key={period}
                      onClick={() => {
                        setTimePeriod(period);
                        setShowPeriodDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2 hover:bg-gray-100 transition ${
                        timePeriod === period ? "font-semibold bg-gray-50" : ""
                      }`}
                    >
                      {period}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* KPI Cards */}
          <div className="px-4 sm:px-6 md:px-8 py-4 sm:py-6 bg-white">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Revenue */}
              <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
                <p className="text-gray-600 text-sm font-medium">Total Revenue</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-2">{kpis.revenue}</p>
                {kpis.revenue ? <p className="text-green-600 text-sm font-medium mt-2">+15.2%</p> : <p className="text-sm text-gray-400 mt-2">—</p>}
              </div>

              {/* Total Orders */}
              <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
                <p className="text-gray-600 text-sm font-medium">Total Orders</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-2">{kpis.orders}</p>
                {kpis.orders ? <p className="text-green-600 text-sm font-medium mt-2">+9.8%</p> : <p className="text-sm text-gray-400 mt-2">—</p>}
              </div>

              {/* Total Customers */}
              <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
                <p className="text-gray-600 text-sm font-medium">Customers</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-2">{kpis.customers}</p>
                {kpis.customers ? <p className="text-green-600 text-sm font-medium mt-2">+12.1%</p> : <p className="text-sm text-gray-400 mt-2">—</p>}
              </div>

              {/* Low Stock Products */}
              <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
                <p className="text-gray-600 text-sm font-medium">Low Stock</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-2">{kpis.lowStock}</p>
                {kpis.lowStock ? <p className="text-yellow-700 text-sm font-medium mt-2">Requires attention</p> : <p className="text-sm text-gray-400 mt-2">—</p>}
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="px-4 sm:px-6 md:px-8 py-6 sm:py-8">
            {/* Row 1: Revenue & Sales */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <RevenueChart timePeriod={timePeriod} />
              <SalesByCategory timePeriod={timePeriod} />
            </div>

            {/* Row 2: Top Products & Top Customers */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TopProducts timePeriod={timePeriod} />
              <TopBuyingCustomers timePeriod={timePeriod} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
