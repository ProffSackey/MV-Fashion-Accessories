"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminNavbar from '../../components/AdminNavbar';
import AdminSidebar from '../../components/AdminSidebar';
import DashboardOverview from '../../components/DashboardOverview';
import RevenueChart from '../../components/RevenueChart';
import SalesByCategory from '../../components/SalesByCategory';
import RecentOrders from '../../components/RecentOrders';
import TopProducts from '../../components/TopProducts';
import { HomeIcon, UserGroupIcon, ShoppingCartIcon, CubeIcon, CreditCardIcon, ChartBarIcon, StarIcon, GiftIcon, BellIcon, EnvelopeIcon, NewspaperIcon, CogIcon } from '@heroicons/react/24/outline';
import { useAdminSession } from '../../../lib/useAdminSession';

export default function AdminDashboard() {
  const router = useRouter();
  const { sessionChecked } = useAdminSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  if (!sessionChecked) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar onMenuToggle={setMobileMenuOpen} />
      
      <div className="flex">
        <AdminSidebar active="dashboard" mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />

        {/* Main Content */}
        <div className="flex-1 px-4 sm:px-6 md:px-8 py-6 sm:py-8 overflow-x-auto">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Dashboard Overview with KPI Cards */}
            <DashboardOverview />

            {/* Revenue Chart */}
            <RevenueChart />

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Sales by Category */}
              <div className="lg:col-span-1">
                <SalesByCategory />
              </div>

              {/* Top Products */}
              <div className="lg:col-span-2">
                <TopProducts />
              </div>
            </div>

            {/* Recent Orders */}
            <RecentOrders />
          </div>
        </div>
      </div>
    </div>
  );
}
