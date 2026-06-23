"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AdminNavbar from "../../components/AdminNavbar";
import AdminSidebar from "../../components/AdminSidebar";
import { MagnifyingGlassIcon, FunnelIcon, PlusIcon, EyeIcon, XMarkIcon, PencilIcon, TrashIcon, HomeIcon, UserGroupIcon, ShoppingCartIcon, CubeIcon, CreditCardIcon, ChartBarIcon, StarIcon, GiftIcon, BellIcon, EnvelopeIcon, NewspaperIcon, CogIcon } from "@heroicons/react/24/outline";
import { useAdminSession } from "../../../lib/useAdminSession";
import { fetchPromotions, createPromotion, updatePromotion, deletePromotion, fetchProducts, type Promotion, type Product } from "../../../lib/supabaseService";

export default function PromotionsPage() {
  console.log("[PromotionsPage] mounted");
  const router = useRouter();
  const { sessionChecked } = useAdminSession();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("All Types");
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    type: "Percentage",
    discount: "",
    deadline: "",
    description: "",
    startDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [promosRes, prodsRes] = await Promise.all([
          fetch('/api/admin/promotions'),
          fetchProducts()
        ]);

        if (promosRes.ok) {
          const promos = await promosRes.json();
          setPromotions(promos);
        }
        
        setProducts(prodsRes);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (sessionChecked) {
      loadData();
    }
  }, [sessionChecked]);

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  const handleAddPromotion = () => {
    setEditingId(null);
    setSelectedProducts([]);
    setFormData({
      name: "",
      code: "",
      type: "Percentage",
      discount: "",
      deadline: "",
      description: "",
      startDate: new Date().toISOString().split('T')[0],
    });
    setShowAddModal(true);
  };

  const handleEditPromotion = (promo: Promotion) => {
    setEditingId(promo.id || "");
    setSelectedProducts(promo.product_ids || []);
    setFormData({
      name: promo.name,
      code: promo.code || "",
      type: promo.type,
      discount: promo.discount.replace(/[%GHS ]/g, ""),
      deadline: new Date(promo.deadline).toISOString().split('T')[0], // Format for date input
      description: promo.description || "",
      startDate: promo.start_date || new Date().toISOString().split('T')[0],
    });
    setShowAddModal(true);
  };

  const handleSavePromotion = async () => {
    if (!formData.name || !formData.discount || !formData.deadline || !formData.code) {
      alert("Please fill all required fields");
      return;
    }

    // Validate deadline is not in the past
    const deadlineDate = new Date(formData.deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (deadlineDate < today) {
      alert("Deadline cannot be in the past");
      return;
    }

    // Validate start date is not after deadline
    if (formData.startDate) {
      const startDate = new Date(formData.startDate);
      if (startDate > deadlineDate) {
        alert("Start date cannot be after deadline");
        return;
      }
    }

    try {
      console.log('[handleSavePromotion] Saving promotion with data:', {
        name: formData.name,
        code: formData.code,
        type: formData.type,
        deadline: new Date(formData.deadline + 'T23:59:59').toISOString()
      });

      if (editingId) {
        // Update existing promotion via API
        const response = await fetch('/api/admin/promotions', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingId,
            name: formData.name,
            code: formData.code,
            type: formData.type as "Percentage" | "Fixed",
            discount: formData.type === "Percentage" ? `${formData.discount}%` : `GHS ${formData.discount}`,
            deadline: new Date(formData.deadline + 'T23:59:59').toISOString(),
            description: formData.description,
            product_ids: selectedProducts,
            start_date: formData.startDate,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update promotion');
        }

        const updated = await response.json();
        setPromotions(promotions.map((p) => p.id === editingId ? updated : p));
      } else {
        // Create new promotion via API
        const response = await fetch('/api/admin/promotions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            code: formData.code,
            type: formData.type as "Percentage" | "Fixed",
            discount: formData.type === "Percentage" ? `${formData.discount}%` : `GHS ${formData.discount}`,
            deadline: new Date(formData.deadline + 'T23:59:59').toISOString(),
            description: formData.description,
            product_ids: selectedProducts,
            is_active: true,
            start_date: formData.startDate,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create promotion');
        }

        const newPromo = await response.json();
        setPromotions([...promotions, newPromo]);
      }

      setShowAddModal(false);
      alert(editingId ? "Promotion updated successfully" : "Promotion created successfully");
    } catch (error) {
      console.error('Error saving promotion:', error);
      alert("Error saving promotion");
    }
  };

  const handleDeletePromotion = async (id: string) => {
    if (confirm("Are you sure you want to delete this promotion?")) {
      try {
        const success = await deletePromotion(id);
        if (success) {
          setPromotions(promotions.filter((p) => p.id !== id));
          alert("Promotion deleted successfully");
        }
      } catch (error) {
        console.error('Error deleting promotion:', error);
        alert("Error deleting promotion");
      }
    }
  };

  const filteredPromotions = promotions.filter((promo) => {
    const matchesSearch =
      promo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (promo.id || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType =
      selectedType === 'All Types' || promo.type === selectedType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminNavbar onMenuToggle={setMobileMenuOpen} />
      <div className="flex">
        <AdminSidebar active="promotions" mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />

        {/* Main content area */}
        <div className="flex-1 overflow-x-auto">
          <div className="px-4 sm:px-6 md:px-8 py-4 sm:py-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Promotions</h1>
              <p className="text-gray-700">Create and manage discount codes and campaigns.</p>
            </div>
            <button 
              onClick={handleAddPromotion}
              className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg w-full sm:w-auto justify-center">
              <PlusIcon className="h-5 w-5" />
              New Promotion
            </button>
          </div>

          {/* Search & filter */}
          <div className="flex flex-col text-gray-700 md:flex-row md:items-center md:justify-between px-4 sm:px-6 md:px-8 py-2 bg-white shadow-sm rounded-lg mb-6 gap-4">
            <div className="relative w-full md:w-1/3">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-500 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search promotions"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-gray-900 placeholder:text-gray-600"
              />
            </div>
            <div className="relative w-full md:w-1/4">
              <button
                onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                className="w-full flex justify-between items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {selectedType}
                <FunnelIcon className="h-5 w-5 text-gray-500" />
              </button>
              {showTypeDropdown && (
                <div className="absolute mt-1 w-full bg-white border border-gray-300 rounded-lg z-10">
                  {['All Types', 'Percentage', 'Fixed'].map((type) => (
                    <div
                      key={type}
                      onClick={() => { setSelectedType(type); setShowTypeDropdown(false); }}
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                    >
                      {type}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Promotions table */}
          <div className="px-4 sm:px-6 md:px-8">
            <div className="bg-white shadow overflow-hidden sm:rounded-lg overflow-x-auto table-scroll">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Discount</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deadline</th>
                    <th className="px-4 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPromotions.map((promo) => (
                    <tr key={promo.id}>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">{promo.name}</td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">{promo.type}</td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">{promo.discount}</td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">{promo.deadline}</td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-center flex gap-3 justify-center">
                        <button 
                          onClick={() => handleEditPromotion(promo)}
                          className="text-yellow-600 hover:text-yellow-900">
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button 
                          onClick={() => handleDeletePromotion(promo.id || "")}
                          className="text-red-600 hover:text-red-900">
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Promotion Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingId ? "Edit Promotion" : "Create New Promotion"}
              </h2>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-gray-500 hover:text-gray-700">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-6 space-y-4">
              {/* Promotion Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Promotion Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g., Spring Sale - 20% Off"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-gray-900 placeholder:text-gray-500"
                />
              </div>

              {/* Promo Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Promotion Code *
                </label>
                <input
                  type="text"
                  placeholder="e.g., SPRING20"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-gray-900 placeholder:text-gray-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  placeholder="Describe the promotion..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-gray-900 placeholder:text-gray-500"
                />
              </div>

              {/* Type and Discount Grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Discount Type *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-gray-900 bg-white"
                  >
                    <option value="Percentage">Percentage</option>
                    <option value="Fixed">Fixed Amount</option>
                  </select>
                </div>

                {/* Discount Value */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Discount Value *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="0.00"
                      value={formData.discount}
                      onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-gray-900 placeholder:text-gray-500"
                    />
                    <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500">
                      {formData.type === "Percentage" ? "%" : "GHS "}
                    </span>
                  </div>
                </div>
              </div>

              {/* Deadline */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Deadline (Expiry Date) *
                </label>
                <input
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-gray-900"
                />
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-gray-900"
                />
              </div>

              {/* Product Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Products for This Promotion
                </label>
                <div className="border border-gray-300 rounded-lg max-h-64 overflow-y-auto">
                  {products.length === 0 ? (
                    <div className="px-4 py-6 text-center text-gray-500">
                      No products available. Create products first in the Products section.
                    </div>
                  ) : (
                    products.map((product) => (
                      <div key={product.id} className="flex items-center px-4 py-2 border-b border-gray-200 hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={selectedProducts.includes(product.id || '')}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedProducts([...selectedProducts, product.id || '']);
                            } else {
                              setSelectedProducts(selectedProducts.filter(id => id !== product.id));
                            }
                          }}
                          className="h-4 w-4 text-yellow-600 rounded"
                        />
                        <label className="ml-3 flex-1 cursor-pointer">
                          <div className="text-sm font-medium text-gray-800">{product.name}</div>
                          <div className="text-xs text-gray-500">{product.price}</div>
                        </label>
                      </div>
                    ))
                  )}
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  {selectedProducts.length} product(s) selected
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-gray-200 justify-end">
              <button 
                onClick={() => setShowAddModal(false)}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium">
                Cancel
              </button>
              <button 
                onClick={handleSavePromotion}
                className="px-6 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium">
                {editingId ? "Update Promotion" : "Create Promotion"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
