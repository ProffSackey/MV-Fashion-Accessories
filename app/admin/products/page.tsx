"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AdminNavbar from "../../components/AdminNavbar";
import AdminSidebar from "../../components/AdminSidebar";
import { MagnifyingGlassIcon, FunnelIcon, PencilSquareIcon, TrashIcon, HomeIcon, UserGroupIcon, ShoppingCartIcon, CubeIcon, CreditCardIcon, ChartBarIcon, StarIcon, GiftIcon, BellIcon, EnvelopeIcon, NewspaperIcon, CogIcon, PlusIcon } from "@heroicons/react/24/outline";
import { fetchCategories, type Product } from "../../../lib/supabaseService";
import { useAdminSession } from "../../../lib/useAdminSession";

const statusColors: Record<string, { bg: string; text: string }> = {
  "active": { bg: "bg-green-100", text: "text-green-600" },
  "inactive": { bg: "bg-red-100", text: "text-red-600" },
  "archived": { bg: "bg-gray-100", text: "text-gray-600" },
  "In Stock": { bg: "bg-green-100", text: "text-green-600" },
  "Out of Stock": { bg: "bg-red-100", text: "text-red-600" },
  "Low Stock": { bg: "bg-yellow-100", text: "text-yellow-700" },
};

export default function ProductsPage() {
  const router = useRouter();
  const { sessionChecked } = useAdminSession();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>(["All Categories"]);

  // handler to delete product via secure admin API
  const handleDeleteProduct = async (id: string) => {
    try {
      const resp = await fetch('/api/admin/products', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        console.error('failed to delete product via admin API', data);
        return;
      }
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error('error deleting product', err);
    }
  };

  // fetch products and categories from admin API after session check
  useEffect(() => {
    const load = async () => {
      try {
        // Call admin API endpoint instead of anon client
        const res = await fetch("/api/admin/products", {
          credentials: "same-origin",
        });
        if (res.ok) {
          const prods = await res.json();
          setProducts(prods);
        } else {
          console.error("failed to fetch products from admin API:", res.status);
        }
        
        const cats = await fetchCategories();
        setCategories(["All Categories", ...cats.map((c) => c.name)]);
      } catch (e) {
        console.error("error loading products/categories", e);
      }
    };
    if (sessionChecked) load();
  }, [sessionChecked]);

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  };

  if (!sessionChecked) {
    return null;
  }

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.about?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      selectedCategory === "All Categories" || product.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar onMenuToggle={setMobileMenuOpen} />

      <div className="flex">
        <AdminSidebar active="products" mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />

        {/* Main Content */}
        <div className="flex-1 overflow-x-auto">
          {/* Header */}
          <div className="bg-white border-b">
            <div className="px-4 sm:px-6 md:px-8 py-4 sm:py-6 md:py-8 flex flex-col sm:flex-row justify-between items-start gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">Products</h1>
                <p className="text-gray-500 mt-1 text-sm sm:text-base">Manage your product inventory and listings.</p>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={() => router.push('/admin/products/new')}
                  className="flex items-center bg-green-600 text-white gap-2 px-4 py-2 hover:bg-green-700 rounded-lg transition w-full sm:w-auto justify-center"
                >
                  <PlusIcon className="h-5 w-5" />
                  <span>Add Product</span>
                </button>
              </div>

            </div>
          </div>

          {/* Search and Filter */}
          <div className="bg-white px-4 sm:px-6 md:px-8 py-4 sm:py-6 border-b">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex-1 relative w-full">
                <MagnifyingGlassIcon className="absolute left-3 top-3 h-5 w-5 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-gray-900 placeholder:text-gray-600"
                />
              </div>

              {/* Category Filter Dropdown */}
              <div className="relative w-full sm:w-auto">
                <button
                  onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition w-full sm:w-auto justify-center"
                >
                  <FunnelIcon className="h-5 w-5 text-gray-600" />
                  <span className="text-gray-700">{selectedCategory}</span>
                </button>

                {showCategoryDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                    {categories.map((category) => (
                      <button
                        key={category}
                        onClick={() => {
                          setSelectedCategory(category);
                          setShowCategoryDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2 hover:bg-gray-100 transition flex items-center ${
                          selectedCategory === category ? "font-semibold" : ""
                        }`}
                      >
                        {selectedCategory === category && <span className="mr-2">✓</span>}
                        {category}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="px-4 sm:px-6 md:px-8 py-4 sm:py-6">
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto table-scroll">
                <table className="w-full bg-white min-w-[800px]">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 sm:px-6 py-4 text-left text-sm font-semibold text-gray-600">Product</th>
                      <th className="px-4 sm:px-6 py-4 text-left text-sm font-semibold text-gray-600">About</th>
                      <th className="px-4 sm:px-6 py-4 text-left text-sm font-semibold text-gray-600">Category</th>
                      <th className="px-4 sm:px-6 py-4 text-left text-sm font-semibold text-gray-600">Price</th>
                      <th className="px-4 sm:px-6 py-4 text-left text-sm font-semibold text-gray-600">Qty</th>
                      <th className="px-4 sm:px-6 py-4 text-left text-sm font-semibold text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((product) => (
                      <tr key={product.id} className="border-b hover:bg-gray-50 transition">
                        <td className="px-4 sm:px-6 py-4 text-sm">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="flex-shrink-0">
                              {Array.isArray(product.images) ? (
                                <div className="w-12 h-12 rounded-lg overflow-hidden">
                                  <img
                                    src={product.images[0]}
                                    alt={product.name}
                                    className="object-cover w-full h-full"
                                  />
                                </div>
                              ) : (
                                <div className="w-12 h-12 flex items-center justify-center text-2xl rounded-lg bg-gray-100">
                                  {product.image_url}
                                </div>
                              )}
                            </div>
                              <div className="min-w-0">
                                <div className="font-medium text-gray-900 truncate">{product.name}</div>
                              </div>
                            </div>
                            <div className="flex-shrink-0 ml-4">
                              <span className={`inline-block px-3 py-1 rounded-full font-medium text-xs ${statusColors[product.status].bg} ${statusColors[product.status].text}`}>
                                {product.status}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-sm text-gray-600">{product.about}</td>
                        <td className="px-4 sm:px-6 py-4 text-sm text-gray-700">{product.category}</td>
                        <td className="px-4 sm:px-6 py-4 text-sm font-semibold text-gray-900">{product.price}</td>
                        <td className="px-4 sm:px-6 py-4 text-sm font-medium text-gray-800">{product.stock_quantity ?? 0}</td>
                        <td className="px-4 sm:px-6 py-4 text-sm flex items-center gap-3">
                          <button
                            onClick={() => router.push(`/admin/products/new?id=${product.id}`)}
                            className="text-yellow-500 hover:text-yellow-700 transition"
                            title="Edit product"
                          >
                            <PencilSquareIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm("Delete this product?")) {
                                handleDeleteProduct(product.id as string);
                              }
                            }}
                            className="text-red-500 hover:text-red-700 transition"
                            title="Delete product"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {filteredProducts.length === 0 && (
              <div className="bg-white rounded-lg shadow-sm p-8 text-center text-gray-500 mt-4">
                No products found.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
