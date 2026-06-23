"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AdminNavbar from "../../components/AdminNavbar";
import AdminSidebar from "../../components/AdminSidebar";
import { MagnifyingGlassIcon, EnvelopeIcon, EllipsisVerticalIcon, HomeIcon, UserGroupIcon, ShoppingCartIcon, CubeIcon, CreditCardIcon, ChartBarIcon, StarIcon, GiftIcon, BellIcon, NewspaperIcon, CogIcon } from "@heroicons/react/24/outline";
import { useAdminSession } from "../../../lib/useAdminSession";

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
}



const statusColors: Record<string, { bg: string; text: string }> = {
  Active: { bg: "bg-green-100", text: "text-green-600" },
  Inactive: { bg: "bg-gray-100", text: "text-gray-600" },
};

export default function CustomersPage() {
  const router = useRouter();
  const { sessionChecked } = useAdminSession();
  const [searchTerm, setSearchTerm] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    const fetchCustomersData = async () => {
      try {
        const response = await fetch("/api/admin/customers");
        if (!response.ok) throw new Error("Failed to fetch customers");
        const data = await response.json();
        
        // Transform API response to match UI interface
        const transformedCustomers: Customer[] = data.map((customer: any) => ({
          id: customer.id || "",
          initials: customer.name
            ?.split(" ")
            .map((n: string) => n[0])
            .join("")
            .toUpperCase() || "?",
          name: customer.name || "",
          email: customer.email || "",
          phone: customer.phone || "",
          country: customer.address?.country || "",
          digitalAddress: `${customer.address?.street || ""}, ${customer.address?.city || ""}, ${customer.address?.postcode || ""}`.replace(/^, |, $/g, ""),
          status: customer.is_active ? "Active" : "Inactive",
          joined: customer.created_at ? new Date(customer.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "",
        }));
        
        setCustomers(transformedCustomers);
      } catch (error) {
        console.error("Failed to fetch customers:", error);
        setCustomers([]);
      }
    };
    if (sessionChecked) {
      fetchCustomersData();
    }
  }, [sessionChecked]);

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  };

  if (!sessionChecked) {
    return null;
  }

  const filteredCustomers = customers.filter((customer) => {
    return (
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // KPI calculations (derived from customers array)
  const totalCustomers = customers.length;
  const activeCustomers = customers.filter((c) => c.status === "Active").length;
  const activePercent = totalCustomers ? Math.round((activeCustomers / totalCustomers) * 10) / 10 : 0;
  // Avg lifetime value not available from customers list; show placeholder
  const avgLifetimeValue = null;

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar onMenuToggle={setMobileMenuOpen} />

      <div className="flex">
        <AdminSidebar active="customers" mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />

        {/* Main Content */}
        <div className="flex-1 overflow-x-auto">
          {/* Header */}
          <div className="bg-white ">
            <div className="px-4 sm:px-6 md:px-8 py-4 sm:py-6 md:py-8 flex flex-col sm:flex-row justify-between items-start gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">Customers</h1>
                <p className="text-gray-700 mt-1 text-sm sm:text-base">View and manage your customer base.</p>
              </div>
              <button className="flex items-center bg-yellow-500 gap-2 px-4 py-2 text-white hover:bg-yellow-600 rounded-lg transition w-full sm:w-auto justify-center">
                <span>Export</span>
              </button>
            </div>
          </div>

          {/* KPI Stats */}
          <div className="px-4 sm:px-6 md:px-8 py-4 sm:py-6 bg-white">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Total Customers */}
              <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
                <p className="text-gray-700 text-sm font-medium">Total Customers</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{totalCustomers.toLocaleString()}</p>
                {totalCustomers > 0 && (
                  <p className="text-green-600 text-sm font-medium mt-2">{`Total customers: ${totalCustomers.toLocaleString()}`}</p>
                )}
              </div>

              {/* Active Customers */}
              <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
                <p className="text-gray-700 text-sm font-medium">Active Customers</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{activeCustomers.toLocaleString()}</p>
                <p className="text-green-600 text-sm font-medium mt-2">{`${activePercent}% of total`}</p>
              </div>

              {/* Avg. Lifetime Value */}
              <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
                <p className="text-gray-700 text-sm font-medium">Avg. Lifetime Value</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{avgLifetimeValue ? `GHS ${avgLifetimeValue}` : '—'}</p>
                {avgLifetimeValue ? (
                  <p className="text-green-600 text-sm font-medium mt-2">+{Math.round(((avgLifetimeValue - avgLifetimeValue) / avgLifetimeValue) * 100)}% vs last quarter</p>
                ) : (
                  <p className="text-gray-500 text-sm mt-2">No sales data</p>
                )}
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="bg-white px-4 sm:px-6 md:px-8 py-4 sm:py-6">
            <div className="relative max-w-md">
              <MagnifyingGlassIcon className="absolute left-3 top-3 h-5 w-5 text-gray-500" />
              <input
                type="text"
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-gray-900 placeholder:text-gray-600"
              />
            </div>
          </div>

          {/* Table */}
          <div className="px-4 sm:px-6 md:px-8 py-4">
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto table-scroll">
                <table className="w-full bg-white min-w-[800px]">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 sm:px-6 py-4 text-left text-sm font-semibold text-gray-700">
                        Customer
                      </th>
                      <th className="px-4 sm:px-6 py-4 text-left text-sm font-semibold text-gray-700">Phone</th>
                      <th className="px-4 sm:px-6 py-4 text-left text-sm font-semibold text-gray-700">Location</th>
                      <th className="px-4 sm:px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
                      <th className="px-4 sm:px-6 py-4 text-left text-sm font-semibold text-gray-700">Joined</th>
                      <th className="px-4 sm:px-6 py-4 text-left text-sm font-semibold text-gray-700"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCustomers.map((customer) => (
                      <tr key={customer.id} className="border-b hover:bg-gray-50 transition">
                        <td className="px-4 sm:px-6 py-4 text-sm">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-yellow-200 flex items-center justify-center text-yellow-600 font-semibold text-sm">
                              {customer.initials}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{customer.name}</div>
                              <div className="text-gray-500 text-xs">{customer.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-sm text-gray-700">{customer.phone}</td>
                        <td className="px-4 sm:px-6 py-4 text-sm text-gray-700">
                          <div className="font-medium text-gray-900">{customer.country}</div>
                          <div className="text-gray-500 text-xs">{customer.digitalAddress}</div>
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-sm">
                          <span
                            className={`inline-block px-3 py-1 rounded-full font-medium text-xs ${statusColors[customer.status].bg} ${statusColors[customer.status].text}`}
                          >
                            {customer.status}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-sm text-gray-600">{customer.joined}</td>
                        <td className="px-4 sm:px-6 py-4 text-sm overflow-visible">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => router.push(`/admin/messages?email=${encodeURIComponent(customer.email)}&name=${encodeURIComponent(customer.name)}`)}
                              className="text-gray-500 hover:text-gray-700 transition"
                              aria-label={`Message ${customer.name}`}
                            >
                              <EnvelopeIcon className="h-5 w-5" />
                            </button>

                            <div className="relative">
                              <button
                                onClick={() => setOpenMenuId(openMenuId === customer.id ? null : customer.id)}
                                className="text-gray-500 hover:text-gray-700 transition"
                                aria-label="More actions"
                              >
                                <EllipsisVerticalIcon className="h-5 w-5" />
                              </button>

                              {openMenuId === customer.id && (
                                <div className="absolute z-50 mt-2 right-0 w-44 bg-white border border-gray-300 rounded-lg shadow-lg">
                                  <button
                                    onClick={() => {
                                      router.push(`/admin/customers/${customer.id}`);
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full text-left px-3 py-2 hover:bg-gray-100 transition text-gray-900"
                                  >
                                    View profile
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {filteredCustomers.length === 0 && (
              <div className="bg-white rounded-lg shadow-sm p-8 text-center text-gray-500 mt-4">
                No customers found.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
