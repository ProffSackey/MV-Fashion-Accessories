"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AdminNavbar from "../../components/AdminNavbar";
import AdminSidebar from "../../components/AdminSidebar";
import { MagnifyingGlassIcon, FunnelIcon, HomeIcon, UserGroupIcon, ShoppingCartIcon, CubeIcon, CreditCardIcon, ChartBarIcon, StarIcon, GiftIcon, BellIcon, EnvelopeIcon, NewspaperIcon, CogIcon } from "@heroicons/react/24/outline";
import { useAdminSession } from "../../../lib/useAdminSession";

interface Transaction {
  id: string;
  customer: string;
  email: string;
  amount: string;
  type: "Credit" | "Debit";
  status: "Completed" | "Pending" | "Failed";
  date: string;
}

const mockTransactions: Transaction[] = [];

const statusColors: Record<string, { bg: string; text: string }> = {
  Completed: { bg: "bg-green-100", text: "text-green-600" },
  Pending: { bg: "bg-yellow-100", text: "text-yellow-700" },
  Failed: { bg: "bg-red-100", text: "text-red-600" },
};

const typeColors: Record<string, string> = {
  Credit: "text-green-600",
  Debit: "text-red-600",
};

export default function TransactionsPage() {
  const router = useRouter();
  const { sessionChecked } = useAdminSession();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All Status");
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  };

  if (!sessionChecked) {
    return null;
  }

  const statuses = ["All Status", "Completed", "Pending", "Failed"];

  const filteredTransactions = mockTransactions.filter((transaction) => {
    const matchesSearch =
      transaction.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.customer.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      selectedStatus === "All Status" || transaction.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar onMenuToggle={setMobileMenuOpen} />

      <div className="flex">
        <AdminSidebar active="transactions" mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />

        {/* Main Content */}
        <div className="flex-1 overflow-x-auto">
          {/* Header */}
          <div className="bg-white border-b">
            <div className="px-4 sm:px-6 md:px-8 py-4 sm:py-6 md:py-8">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">Transactions</h1>
              <p className="text-gray-500 mt-1 text-sm sm:text-base">Track all payment transactions and transfers.</p>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="bg-white px-4 sm:px-6 md:px-8 py-4 sm:py-6 border-b">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex-1 relative w-full">
                <MagnifyingGlassIcon className="absolute left-3 top-3 h-5 w-5 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-gray-900 placeholder:text-gray-600"
                />
              </div>

              {/* Status Filter Dropdown */}
              <div className="relative w-full sm:w-auto">
                <button
                  onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition w-full sm:w-auto justify-center"
                >
                  <FunnelIcon className="h-5 w-5 text-gray-600" />
                  <span className="text-gray-700">{selectedStatus}</span>
                </button>

                {showStatusDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                    {statuses.map((status) => (
                      <button
                        key={status}
                        onClick={() => {
                          setSelectedStatus(status);
                          setShowStatusDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2 hover:bg-gray-100 transition flex items-center ${
                          selectedStatus === status ? "font-semibold" : ""
                        }`}
                      >
                        {selectedStatus === status && <span className="mr-2">✓</span>}
                        {status}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="px-4 sm:px-6 md:px-8 py-4">
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto table-scroll">
                <table className="w-full bg-white min-w-[600px]">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 sm:px-6 py-4 text-left text-sm font-semibold text-gray-600">
                        Transaction ID
                      </th>
                      <th className="px-4 sm:px-6 py-4 text-left text-sm font-semibold text-gray-600">
                        Customer
                      </th>
                      <th className="px-4 sm:px-6 py-4 text-left text-sm font-semibold text-gray-600">Amount</th>
                      <th className="px-4 sm:px-6 py-4 text-left text-sm font-semibold text-gray-600">Type</th>
                      <th className="px-4 sm:px-6 py-4 text-left text-sm font-semibold text-gray-600">Status</th>
                      <th className="px-4 sm:px-6 py-4 text-left text-sm font-semibold text-gray-600">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map((transaction) => (
                      <tr key={transaction.id} className="border-b hover:bg-gray-50 transition">
                        <td className="px-4 sm:px-6 py-4 text-sm font-medium text-gray-900">{transaction.id}</td>
                        <td className="px-4 sm:px-6 py-4 text-sm">
                          <div className="font-medium text-gray-900">{transaction.customer}</div>
                          <div className="text-gray-500 text-xs">{transaction.email}</div>
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-sm font-semibold text-gray-900">
                          {transaction.amount}
                        </td>
                        <td className={`px-4 sm:px-6 py-4 text-sm font-medium ${typeColors[transaction.type]}`}>
                          {transaction.type}
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-sm">
                          <span
                            className={`inline-block px-3 py-1 rounded-full font-medium text-xs ${statusColors[transaction.status].bg} ${statusColors[transaction.status].text}`}
                          >
                            {transaction.status}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-sm text-gray-600">{transaction.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {filteredTransactions.length === 0 && (
              <div className="bg-white rounded-lg shadow-sm p-8 text-center text-gray-500 mt-4">
                No transactions found.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
