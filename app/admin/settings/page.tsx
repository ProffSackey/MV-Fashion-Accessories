"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AdminNavbar from "../../components/AdminNavbar";
import AdminSidebar from "../../components/AdminSidebar";
import { supabase } from '@/lib/supabaseClient';
import { HomeIcon, UserGroupIcon, ShoppingCartIcon, CubeIcon, CreditCardIcon, ChartBarIcon, StarIcon, GiftIcon, BellIcon, EnvelopeIcon, NewspaperIcon, CogIcon, CheckIcon, TrashIcon, PencilIcon } from "@heroicons/react/24/outline";
import { useAdminSession } from "../../../lib/useAdminSession";

interface ShippingZone {
  id?: string;
  name: string;
  country: string;
  region?: string;
  base_fee: number;
  per_km_fee: number;
  min_delivery_days: number;
  max_delivery_days: number;
  is_active: boolean;
}

const tabs = [
  { id: "General", label: "General", icon: "🏪" },
  { id: "Shipping Rates", label: "Shipping Rates", icon: "🚚" },
  { id: "Security", label: "Security", icon: "🔒" },
];

const countrySuggestions = [
  "Ghana",
  "United Kingdom",
  "United States",
  "Canada",
  "Nigeria",
  "South Africa",
  "Germany",
  "France",
  "Italy",
  "Netherlands",
];

const countryDisplayNames: Record<string, string> = {
  GB: "United Kingdom",
  UK: "United Kingdom",
  US: "United States",
  USA: "United States",
  GH: "Ghana",
};

const formatCountryName = (country: string) => {
  const trimmed = country.trim();
  return countryDisplayNames[trimmed.toUpperCase()] || trimmed;
};

export default function SettingsPage() {
  const router = useRouter();
  const { sessionChecked } = useAdminSession();
  const [activeTab, setActiveTab] = useState("General");
  const [freeShippingThreshold, setFreeShippingThreshold] = useState("50.00");
  const [autoTax, setAutoTax] = useState(true);
  const [autoDistanceFee, setAutoDistanceFee] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  
  // Shipping zones state
  const [shippingZones, setShippingZones] = useState<ShippingZone[]>([]);
  const [editingZone, setEditingZone] = useState<ShippingZone | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newZone, setNewZone] = useState<ShippingZone>({
    name: '',
    country: '',
    region: '',
    base_fee: 0,
    per_km_fee: 0,
    min_delivery_days: 1,
    max_delivery_days: 5,
    is_active: true,
  });

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');



  // Fetch shipping zones
  useEffect(() => {
    if (activeTab === 'Shipping Rates') {
      fetchShippingZones();
    }
  }, [activeTab]);

  const fetchShippingZones = async () => {
    try {
      const response = await fetch('/api/admin/shipping-zones');
      if (response.ok) {
        const data = await response.json();
        setShippingZones(data);
      }
    } catch (error) {
      console.error('Error fetching shipping zones:', error);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleEditZone = (zone: ShippingZone) => {
    setEditingZone({ ...zone });
    setIsEditModalOpen(true);
  };

  const handleSaveZone = async () => {
    if (!editingZone) return;
    try {
      const response = await fetch(`/api/admin/shipping-zones/${editingZone.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingZone),
      });
      if (response.ok) {
        setEditingZone(null);
        setIsEditModalOpen(false);
        fetchShippingZones();
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        const error = await response.json();
        console.error('Error response:', error);
        alert(`Failed to save: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error saving zone:', error);
      alert(`Error saving zone: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleDeleteZone = async (id?: string) => {
    if (!id) return;
    if (!confirm('Are you sure you want to delete this shipping zone?')) return;
    try {
      const response = await fetch(`/api/admin/shipping-zones/${id}`, { method: 'DELETE' });
      if (response.ok) {
        fetchShippingZones();
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        const error = await response.json();
        console.error('Error response:', error);
        alert(`Failed to delete: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting zone:', error);
      alert(`Error deleting zone: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleToggleZone = async (zone: ShippingZone) => {
    try {
      const response = await fetch(`/api/admin/shipping-zones/${zone.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...zone, is_active: !zone.is_active }),
      });
      if (response.ok) {
        fetchShippingZones();
      }
    } catch (error) {
      console.error('Error toggling zone:', error);
    }
  };

  const handlePasswordChange = async () => {
    // Validation
    if (!currentPassword) {
      alert('Current password is required');
      return;
    }
    if (!newPassword || !confirmPassword) {
      alert('New password and confirm password are required');
      return;
    }
    if (newPassword !== confirmPassword) {
      alert('New password and confirm password do not match');
      return;
    }
    if (newPassword.length < 8) {
      alert('Password must be at least 8 characters long');
      return;
    }
    if (!/[A-Z]/.test(newPassword)) {
      alert('Password must contain at least one uppercase letter');
      return;
    }
    if (!/[a-z]/.test(newPassword)) {
      alert('Password must contain at least one lowercase letter');
      return;
    }
    if (!/[0-9]/.test(newPassword)) {
      alert('Password must contain at least one number');
      return;
    }

    try {
      // Use backend endpoint to change password
      // retrieve fresh access token from Supabase client session
      const { data: { session } } = await supabase.auth.getSession();
      const currentToken = session?.access_token;
      // console.log('[SETTINGS] Token retrieved from Supabase session:', !!currentToken); // Removed for security

      const requestBody: any = {
        currentPassword,
        newPassword,
      };
      if (currentToken) requestBody.accessToken = currentToken;

      // console.log('[SETTINGS] Sending request body with keys:', Object.keys(requestBody)); // Removed for security
      
      const response = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('[SETTINGS] Password change failed:', response.status);
        if (response.status === 401) {
          alert(data.error || 'Session expired. Please log in again.');
          router.push('/admin/login');
        } else {
          alert(data.error || 'Failed to update password');
        }
        return;
      }

      alert('Password updated successfully');
      // clear form fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);

      // refresh Supabase session using new password so token stays valid
      try {
        const {
          data: { session: newSession },
          error: refreshError,
        } = await supabase.auth.signInWithPassword({
          email: session?.user?.email || '',
          password: newPassword,
        });
        if (refreshError) {
          console.warn('[SETTINGS] could not refresh session after password change', refreshError);
          // if we cannot refresh, force logout to avoid stale token
          await supabase.auth.signOut();
          router.push('/admin/login');
        } else if (newSession) {
          console.log('[SETTINGS] session refreshed after password update');
        }
      } catch (refreshErr) {
        console.error('[SETTINGS] error refreshing session', refreshErr);
      }
    } catch (error) {
      console.error('Error changing password:', error);
      alert(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleAddZone = async () => {
    // Validation
    if (!newZone.name.trim()) {
      alert('Zone name is required');
      return;
    }
    if (!newZone.country) {
      alert('Country is required');
      return;
    }
    if (typeof newZone.base_fee !== 'number' || newZone.base_fee < 0) {
      alert('Valid shipping fee is required');
      return;
    }

    try {
      const response = await fetch('/api/admin/shipping-zones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newZone),
      });
      if (response.ok) {
        setShowAddForm(false);
        setNewZone({
          name: '',
        country: '',
          region: '',
          base_fee: 0,
          per_km_fee: 0,
          min_delivery_days: 1,
          max_delivery_days: 5,
          is_active: true,
        });
        fetchShippingZones();
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        const error = await response.json();
        console.error('Error response:', error);
        alert(`Failed to add zone: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error adding zone:', error);
      alert(`Error adding zone: ${error instanceof Error ? error.message : String(error)}`);
    }
  };


  return (
    <div className="min-h-screen bg-gray-100">
      <AdminNavbar onMenuToggle={setMobileMenuOpen} />
      <div className="flex">
        <AdminSidebar active="settings" mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />
        {/* Main content */}
        <div className="flex-1 flex flex-col bg-gray-50 min-h-screen overflow-x-auto">
          {/* Page header */}
          <div className="bg-white border-b border-gray-200 px-4 sm:px-6 md:px-8 py-6 sm:py-8">
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600 mt-2">Manage your store preferences and configurations.</p>
          </div>

          <div className="flex-1 px-4 sm:px-6 md:px-8 py-6 sm:py-8">
            {/* Tabs */}
            <div className="mb-8 flex gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-3 rounded-lg font-medium transition flex items-center gap-2 ${
                    activeTab === tab.id
                      ? "bg-yellow-600 text-white shadow-lg"
                      : "bg-white text-gray-700 border border-gray-200 hover:border-gray-300 hover:shadow"
                  }`}
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Save notification */}
            {saved && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                <CheckIcon className="h-5 w-5 text-green-600" />
                <p className="text-green-800 font-medium">Settings saved successfully!</p>
              </div>
            )}

            {/* General tab */}
            {activeTab === "General" && (
              <div className="space-y-6">
                {/* Shipping & Tax Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-8 py-6 bg-gradient-to-r from-yellow-50 to-yellow-50 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900">🚚 Shipping & Tax</h2>
                    <p className="text-gray-600 text-sm mt-1">Configure shipping thresholds and tax calculation options.</p>
                  </div>

                  <div className="px-8 py-8 space-y-8">
                    {/* Free shipping threshold */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <label className="block text-sm font-semibold text-gray-900">Free Shipping Threshold</label>
                        <p className="text-sm text-gray-600 mt-1">Orders above this amount qualify for free shipping</p>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <span className="text-sm text-gray-500">GHS </span>
                        <input
                          type="number"
                          value={freeShippingThreshold}
                          onChange={(e) => setFreeShippingThreshold(e.target.value)}
                          step="0.01"
                          className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-right font-semibold text-gray-900"
                        />
                      </div>
                    </div>

                    <div className="border-t border-gray-200"></div>

                    {/* Auto-calculate tax */}
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <label className="block text-sm font-semibold text-gray-900">Auto-Calculate Tax</label>
                        <p className="text-sm text-gray-600 mt-1">Automatically calculate tax based on customer location</p>
                      </div>
                      <label className="relative flex items-center cursor-pointer ml-4">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={autoTax}
                          onChange={(e) => setAutoTax(e.target.checked)}
                        />
                        <div className="w-12 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-yellow-500 rounded-full peer peer-checked:bg-yellow-600 transition-colors"></div>
                        <div className={`absolute left-0.5 top-0.5 w-6 h-6 bg-white rounded-full transition-transform duration-300 ${autoTax ? 'translate-x-5' : ''}`}></div>
                      </label>
                    </div>

                    <div className="border-t border-gray-200"></div>

                    {/* Distance-based shipping */}
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <label className="block text-sm font-semibold text-gray-900">Distance-Based Shipping Fee</label>
                        <p className="text-sm text-gray-600 mt-1">Calculate shipping cost dynamically based on delivery distance</p>
                      </div>
                      <label className="relative flex items-center cursor-pointer ml-4">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={autoDistanceFee}
                          onChange={(e) => setAutoDistanceFee(e.target.checked)}
                        />
                        <div className="w-12 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-yellow-500 rounded-full peer peer-checked:bg-yellow-600 transition-colors"></div>
                        <div className={`absolute left-0.5 top-0.5 w-6 h-6 bg-white rounded-full transition-transform duration-300 ${autoDistanceFee ? 'translate-x-5' : ''}`}></div>
                      </label>
                    </div>
                  </div>

                  {/* Save button */}
                  <div className="px-8 py-6 bg-gray-50 border-t border-gray-200 flex justify-end">
                    <button
                      onClick={handleSave}
                      className="px-6 py-2.5 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold rounded-lg transition shadow-sm"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Security tab */}
            {activeTab === "Security" && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-8 py-6 bg-gradient-to-r from-red-50 to-yellow-50 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900">🔒 Change Password</h2>
                    <p className="text-gray-600 text-sm mt-1">Update your admin account password to keep your account secure.</p>
                  </div>

                  <div className="px-8 py-8 space-y-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">Current Password</label>
                      <input
                        type="password"
                        placeholder="Enter your current password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-gray-900"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">New Password</label>
                        <input
                          type="password"
                          placeholder="Enter new password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">Confirm Password</label>
                        <input
                          type="password"
                          placeholder="Confirm new password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-gray-900"
                        />
                      </div>
                    </div>

                    <p className="text-xs text-gray-500 mt-2">Password must be at least 8 characters long with uppercase, lowercase, and numbers.</p>
                  </div>

                  <div className="px-8 py-6 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
                    <button onClick={() => { setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); }} className="px-6 py-2.5 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 transition">
                      Cancel
                    </button>
                    <button onClick={handlePasswordChange} className="px-6 py-2.5 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold rounded-lg transition shadow-sm">
                      Update Password
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Shipping Rates tab */}
            {activeTab === "Shipping Rates" && (
              <div className="space-y-6">
                {/* Add Zone Button */}
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">📦 Shipping Zones</h2>
                    <p className="text-gray-600 text-sm mt-1">Manage delivery zones and shipping rates by country.</p>
                  </div>
                  {!showAddForm && (
                    <button
                      onClick={() => setShowAddForm(true)}
                      className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition shadow-sm"
                    >
                      + Add Zone
                    </button>
                  )}
                </div>

                {/* Add Zone Form */}
                {showAddForm && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-8 py-6 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-200">
                      <h3 className="text-lg font-bold text-gray-900">Add New Shipping Zone</h3>
                    </div>
                    <div className="px-8 py-8 space-y-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">Country</label>
                        <input
                          type="text"
                          list="admin-country-options"
                          placeholder="e.g., Ghana, Canada, Nigeria"
                          value={newZone.country}
                          onChange={(e) => setNewZone({ ...newZone, country: e.target.value.trimStart() })}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-gray-900"
                        />
                        <datalist id="admin-country-options">
                          {countrySuggestions.map((country) => (
                            <option key={country} value={country} />
                          ))}
                        </datalist>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">Zone Name</label>
                        <input
                          type="text"
                          placeholder="e.g., London, California, Greater Accra"
                          value={newZone.name}
                          onChange={(e) => setNewZone({ ...newZone, name: e.target.value })}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">Region Code</label>
                        <input
                          type="text"
                          placeholder="e.g., SW, CA, (leave blank for Ghana)"
                          value={newZone.region || ""}
                          onChange={(e) => setNewZone({ ...newZone, region: e.target.value || undefined })}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">Base Shipping Fee (GHS )</label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="e.g., 3.99"
                          value={newZone.base_fee || ""}
                          onChange={(e) => setNewZone({
                            ...newZone,
                            base_fee: e.target.value === "" ? 0 : parseFloat(e.target.value),
                          })}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">Min Delivery Days</label>
                        <input
                          type="number"
                          placeholder="e.g., 1"
                          value={newZone.min_delivery_days || ""}
                          onChange={(e) => setNewZone({
                            ...newZone,
                            min_delivery_days: e.target.value === "" ? 0 : parseInt(e.target.value),
                          })}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">Max Delivery Days</label>
                        <input
                          type="number"
                          placeholder="e.g., 3"
                          value={newZone.max_delivery_days || ""}
                          onChange={(e) => setNewZone({
                            ...newZone,
                            max_delivery_days: e.target.value === "" ? 0 : parseInt(e.target.value),
                          })}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-gray-900"
                        />
                      </div>
                    </div>
                    <div className="px-8 py-6 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
                      <button
                        onClick={() => setShowAddForm(false)}
                        className="px-6 py-2.5 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 transition"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAddZone}
                        className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition shadow-sm"
                      >
                        Create Zone
                      </button>
                    </div>
                  </div>
                )}

                {/* Zones by Country */}
                {shippingZones.length === 0 ? (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                    <p className="text-gray-500">No shipping zones configured yet. Add your first zone to get started.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {Array.from(new Set(shippingZones.map((zone) => zone.country?.trim() || "Unspecified"))).map((country) => {
                      const countryZones = shippingZones.filter((z) => (z.country?.trim() || "Unspecified") === country);

                      const countryName = formatCountryName(country);

                      return (
                        <div key={country} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                          <div className="px-8 py-4 bg-gradient-to-r from-yellow-50 to-yellow-50 border-b border-gray-200">
                            <h3 className="text-lg font-bold text-gray-900">{countryName}</h3>
                          </div>
                          <div className="overflow-x-auto table-scroll">
                            <table className="table-fixed w-full text-sm min-w-[600px]">
                              <colgroup>
                                <col className="w-1/4" />
                                <col className="w-1/4" />
                                <col className="w-1/12" />
                                <col className="w-1/6" />
                                <col className="w-1/12" />
                                <col className="w-3/20" />
                              </colgroup>
                              <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">Zone Name</th>
                                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">Region</th>
                                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">Fee (GHS )</th>
                                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">Delivery Days</th>
                                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">Status</th>
                                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {countryZones.map((zone: ShippingZone) => (
                                  <tr key={zone.id} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="px-4 sm:px-6 py-4 text-gray-900 font-medium break-words">{zone.name}</td>
                                        <td className="px-4 sm:px-6 py-4 text-gray-600 text-sm max-w-[200px] truncate">{zone.region || "—"}</td>
                                        <td className="px-4 sm:px-6 py-4 text-gray-900 font-semibold">GHS {zone.base_fee.toFixed(2)}</td>
                                        <td className="px-4 sm:px-6 py-4 text-gray-600 text-sm whitespace-nowrap">
                                          {zone.min_delivery_days}–{zone.max_delivery_days} days
                                        </td>
                                        <td className="px-4 sm:px-6 py-4">
                                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${zone.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                                            {zone.is_active ? "Active" : "Inactive"}
                                          </span>
                                        </td>
                                        <td className="px-4 sm:px-6 py-4 flex items-center gap-2">
                                          <button
                                            onClick={() => handleEditZone(zone)}
                                            className="p-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded transition"
                                            aria-label="Edit zone"
                                          >
                                            <PencilIcon className="h-4 w-4" />
                                          </button>
                                          <button
                                            onClick={() => handleDeleteZone(zone.id)}
                                            className="p-1 bg-red-600 hover:bg-red-700 text-white rounded transition"
                                            aria-label="Delete zone"
                                          >
                                            <TrashIcon className="h-4 w-4" />
                                          </button>
                                          <button
                                            onClick={() => handleToggleZone(zone)}
                                            className={`p-1 rounded transition ${zone.is_active ? "bg-yellow-700 hover:bg-yellow-800 text-white" : "bg-green-600 hover:bg-green-700 text-white"}`}
                                            aria-label={zone.is_active ? "Disable zone" : "Enable zone"}
                                          >
                                            <CheckIcon className="h-4 w-4" />
                                          </button>
                                        </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {isEditModalOpen && editingZone && (
                  <div className="fixed inset-0 bg-white text-gray-900 bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
                      <h3 className="text-lg font-bold mb-4">Edit Shipping Zone</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-900 mb-2">Country</label>
                          <input
                            type="text"
                            list="admin-edit-country-options"
                            value={editingZone.country}
                            onChange={(e) => setEditingZone({ ...editingZone, country: e.target.value.trimStart() })}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-gray-900"
                          />
                          <datalist id="admin-edit-country-options">
                            {countrySuggestions.map((country) => (
                              <option key={country} value={country} />
                            ))}
                          </datalist>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-900 mb-2">Zone Name</label>
                          <input
                            type="text"
                            value={editingZone.name}
                            onChange={(e) => setEditingZone({ ...editingZone, name: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-900 mb-2">Region Code</label>
                          <input
                            type="text"
                            value={editingZone.region || ""}
                            onChange={(e) => setEditingZone({ ...editingZone, region: e.target.value || undefined })}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-900 mb-2">Base Shipping Fee (GHS )</label>
                          <input
                            type="number"
                            step="0.01"
                            value={editingZone.base_fee ?? ""}
                            onChange={(e) => setEditingZone({
                              ...editingZone,
                              base_fee: e.target.value === "" ? 0 : parseFloat(e.target.value),
                            })}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-gray-900"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-2">Min Delivery Days</label>
                            <input
                              type="number"
                              value={editingZone.min_delivery_days ?? ""}
                              onChange={(e) => setEditingZone({
                                ...editingZone,
                                min_delivery_days: e.target.value === "" ? 0 : parseInt(e.target.value),
                              })}
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-gray-900"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-2">Max Delivery Days</label>
                            <input
                              type="number"
                              value={editingZone.max_delivery_days ?? ""}
                              onChange={(e) => setEditingZone({
                                ...editingZone,
                                max_delivery_days: e.target.value === "" ? 0 : parseInt(e.target.value),
                              })}
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-gray-900"
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="inline-flex items-center">
                            <input
                              type="checkbox"
                              checked={editingZone.is_active}
                              onChange={(e) => setEditingZone({ ...editingZone, is_active: e.target.checked })}
                              className="form-checkbox h-5 w-5 text-yellow-600"
                            />
                            <span className="ml-2 text-sm text-gray-700">Active</span>
                          </label>
                        </div>
                      </div>
                      <div className="flex justify-end gap-3 mt-4">
                        <button
                          onClick={handleSaveZone}
                          className="px-6 py-2.5 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold rounded-lg transition shadow-sm"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => { setIsEditModalOpen(false); setEditingZone(null); }}
                          className="px-6 py-2.5 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
