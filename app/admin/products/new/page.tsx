"use client";

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import AdminNavbar from "../../../components/AdminNavbar";
import { HomeIcon, UserGroupIcon, ShoppingCartIcon, CubeIcon, CreditCardIcon, ChartBarIcon, StarIcon, GiftIcon, BellIcon, EnvelopeIcon, CogIcon, CloudArrowUpIcon } from "@heroicons/react/24/outline";
import { useAdminSession } from "../../../../lib/useAdminSession";

interface Product {
  id: string;
  name: string;
  image: string | string[]; // allow one or multiple images
  about: string;
  category: string;
  status: "In Stock" | "Out of Stock" | "Low Stock";
  price: string;
  quantity?: number; // inventory count
}

export default function NewProductPage() {
  const router = useRouter();
  const { sessionChecked } = useAdminSession();
  const [productId, setProductId] = useState<string | null>(null);

  // read ID from query string after mount to avoid SSR issues
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setProductId(params.get('id'));
  }, []);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    image: [] as string[], // array of preview URLs
    about: "",
    category: "Electronics",
    status: "In Stock" as "In Stock" | "Out of Stock" | "Low Stock",
    price: "",
    quantity: "0",
  });
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [newCategoryInput, setNewCategoryInput] = useState("");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const categoryRef = React.useRef<HTMLDivElement>(null);

  // close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) {
        setShowCategoryDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // load categories and load product if editing
  useEffect(() => {
    const loadCats = async () => {
      try {
        const res = await fetch('/api/categories');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setCategories(data);
          }
        } else {
          console.error('could not load categories', res.status);
        }
      } catch (e) {
        console.error('error fetching categories', e);
      }
    };
    loadCats();

    // Load product if editing
    if (productId && sessionChecked) {
      const loadProduct = async () => {
        try {
          const res = await fetch(`/api/admin/products?id=${productId}`);
          if (res.ok) {
            const prods = await res.json();
            const prod = Array.isArray(prods) ? prods[0] : prods;
            if (prod) {
              setFormData({
                name: prod.name || '',
                image: prod.image_url ? [prod.image_url] : [],
                about: prod.about || '',
                category: prod.category || 'Electronics',
                status: prod.status || 'In Stock',
                price: typeof prod.price === 'string' ? prod.price.replace('GHS ', '') : String(prod.price || ''),
                quantity: prod.stock_quantity !== undefined && prod.stock_quantity !== null ? String(prod.stock_quantity) : '0',
              });
              setIsEditMode(true);
            }
          } else {
            console.error('could not load product', res.status);
          }
        } catch (e) {
          console.error('error loading product', e);
        }
      };
      loadProduct();
    }
  }, [productId, sessionChecked]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // auto-update status when quantity changes (threshold 5)
  useEffect(() => {
    const qty = parseInt(formData.quantity, 10);
    if (!isNaN(qty)) {
      let computed: "In Stock" | "Low Stock" | "Out of Stock" = "In Stock";
      if (qty <= 0) computed = "Out of Stock";
      else if (qty <= 5) computed = "Low Stock";
      if (computed !== formData.status) {
        setFormData((prev) => ({ ...prev, status: computed }));
      }
    }
  }, [formData.quantity]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = e.target.files ? Array.from(e.target.files) : [];
    if (newFiles.length === 0) return;

    // Combine with existing files
    const combined = [...imageFiles, ...newFiles];
    if (combined.length > 5) {
      setMessage("You can upload up to 5 images.");
      return;
    }

    setImageFiles(combined);
    setMessage("");
    setUploadingImages(true);

    // Upload files to Supabase
    try {
      const uploadedUrls: string[] = [];
      for (const file of newFiles) {
        const formData = new FormData();
        formData.append('file', file);

        const resp = await fetch('/api/upload', {
          method: 'POST',
          credentials: 'same-origin',
          body: formData,
        });

        const data = await resp.json();
        if (!resp.ok) {
          throw new Error(data.error || 'Upload failed');
        }

        uploadedUrls.push(data.url);
      }

      // Update image URLs in form
      setFormData((prev) => ({
        ...prev,
        image: [...prev.image, ...uploadedUrls],
      }));

      setMessage(`Uploaded ${uploadedUrls.length} image(s) successfully`);
    } catch (error) {
      setMessage('Error uploading images: ' + String(error));
      console.error('Upload error:', error);
    } finally {
      setUploadingImages(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      // Validate form
      if (
        !formData.name.trim() ||
        !formData.about.trim() ||
        !formData.price.trim() ||
        formData.image.length === 0 ||
        formData.quantity.trim() === "" ||
        parseInt(formData.quantity, 10) < 0
      ) {
        setMessage("Please fill in all required fields (name, description, price, and at least one image).");
        setLoading(false);
        return;
      }

      // Create product data
      const productData: any = {
        name: formData.name,
        image: formData.image,
        about: formData.about,
        category: formData.category,
        status: formData.status,
        price: formData.price,
      };
      const qty = parseInt(formData.quantity, 10);
      if (!isNaN(qty)) {
        productData.stock_quantity = qty;
      }

      // If editing, include the ID
      if (isEditMode && productId) {
        productData.id = productId;
      }

      // Persist to Supabase via secure admin API (server-side)
      try {
        const method = isEditMode ? 'PATCH' : 'POST';
        const resp = await fetch('/api/admin/products', {
          method,
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify(productData),
        });
        let data: any = null;
        const text = await resp.text();
        try {
          data = text ? JSON.parse(text) : null;
        } catch (e) {
          data = text;
        }
        if (!resp.ok) {
          const action = isEditMode ? 'update' : 'create';
          const errorMsg = data?.error || data?.message || 'Unknown error';
          console.error('failed to ' + action + ' product (admin API):', { status: resp.status, body: data, error: errorMsg });
          setMessage('Error ' + action + 'ing product: ' + errorMsg);
          setLoading(false);
          return;
        }
      } catch (err) {
        const action = isEditMode ? 'updating' : 'creating';
        console.error('error ' + action + ' product', err);
        setMessage('Error ' + action + ' product: ' + String(err));
        setLoading(false);
        return;
      }

      const action = isEditMode ? 'updated' : 'added';
      setMessage("Product " + action + " successfully!");
      setFormData({
        name: "",
        image: [] as string[],
        about: "",
        category: "Electronics",
        status: "In Stock",
        price: "",
        quantity: "0",
      });
      setImageFiles([]);

      // Redirect to products page after 1 second
      setTimeout(() => {
        router.push("/admin/products");
      }, 1000);
    } catch (error) {
      const action = isEditMode ? 'updating' : 'adding';
      setMessage("Error " + action + " product. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!sessionChecked) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar onMenuToggle={setMobileMenuOpen} />

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="w-64 text-gray-800 bg-white border-r border-gray-200 p-4 hidden md:flex md:flex-col">
          <h2 className="text-lg font-semibold mb-6">Menu</h2>
          <nav className="space-y-3 text-gray-700 text-base">
            <a
              href="/admin/dashboard"
              className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100 font-medium transition"
            >
              <HomeIcon className="h-5 w-5" />
              Dashboard Overview
            </a>
            <a
              href="/admin/customers"
              className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100 font-medium transition"
            >
              <UserGroupIcon className="h-5 w-5" />
              Customers
            </a>
            <a
              href="/admin/orders"
              className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100 font-medium transition"
            >
              <ShoppingCartIcon className="h-5 w-5" />
              Orders
            </a>
            <a
              href="/admin/products"
              className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100 font-medium bg-gray-100 transition"
            >
              <CubeIcon className="h-5 w-5" />
              Products
            </a>
            <a
              href="/admin/transactions"
              className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100 font-medium transition"
            >
              <CreditCardIcon className="h-5 w-5" />
              Transactions
            </a>
            <a
              href="/admin/analytics"
              className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100 font-medium transition"
            >
              <ChartBarIcon className="h-5 w-5" />
              Analytics
            </a>
            <a
              href="/admin/reviews"
              className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100 font-medium transition"
            >
              <StarIcon className="h-5 w-5" />
              Reviews
            </a>
            <a
              href="/admin/promotions"
              className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100 font-medium transition"
            >
              <GiftIcon className="h-5 w-5" />
              Promotions
            </a>
            <a
              href="/admin/notifications"
              className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100 font-medium transition"
            >
              <BellIcon className="h-5 w-5" />
              Notifications
            </a>
            <a
              href="/admin/messages"
              className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100 font-medium transition"
            >
              <EnvelopeIcon className="h-5 w-5" />
              Messages
            </a>
            <a
              href="/admin/settings"
              className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100 font-medium transition"
            >
              <CogIcon className="h-5 w-5" />
              Settings
            </a>
          </nav>
        </aside>

        {/* Mobile Sidebar */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 md:hidden flex">
            <div className="w-64 bg-white border-r border-gray-200 p-4 flex flex-col shadow-lg">
              <h2 className="text-lg font-semibold mb-6">Menu</h2>
              <nav className="space-y-3 text-gray-700 text-base flex-1">
                <a
                  href="/admin/dashboard"
                  className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100 font-medium transition"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <HomeIcon className="h-5 w-5" />
                  Dashboard Overview
                </a>
                <a
                  href="/admin/customers"
                  className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100 font-medium transition"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <UserGroupIcon className="h-5 w-5" />
                  Customers
                </a>
                <a
                  href="/admin/orders"
                  className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100 font-medium transition"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <ShoppingCartIcon className="h-5 w-5" />
                  Orders
                </a>
                <a
                  href="/admin/products"
                  className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100 font-medium bg-gray-100 transition"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <CubeIcon className="h-5 w-5" />
                  Products
                </a>
                <a
                  href="/admin/transactions"
                  className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100 font-medium transition"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <CreditCardIcon className="h-5 w-5" />
                  Transactions
                </a>
                <a
                  href="/admin/analytics"
                  className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100 font-medium transition"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <ChartBarIcon className="h-5 w-5" />
                  Analytics
                </a>
                <a
                  href="/admin/reviews"
                  className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100 font-medium transition"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <StarIcon className="h-5 w-5" />
                  Reviews
                </a>
                <a
                  href="/admin/promotions"
                  className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100 font-medium transition"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <GiftIcon className="h-5 w-5" />
                  Promotions
                </a>
                <a
                  href="/admin/notifications"
                  className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100 font-medium transition"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <BellIcon className="h-5 w-5" />
                  Notifications
                </a>
                <a
                  href="/admin/messages"
                  className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100 font-medium transition"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <EnvelopeIcon className="h-5 w-5" />
                  Messages
                </a>
                <a
                  href="/admin/settings"
                  className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100 font-medium transition"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <CogIcon className="h-5 w-5" />
                  Settings
                </a>
              </nav>
            </div>
            <div className="flex-1" onClick={() => setMobileMenuOpen(false)}></div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1">
          {/* Header */}
          <div className="bg-white border-b">
            <div className="px-8 py-8">
              <h1 className="text-4xl font-bold text-gray-900">{isEditMode ? 'Edit Product' : 'Add Product'}</h1>
              <p className="text-gray-500 mt-1">{isEditMode ? 'Update product details.' : 'Create a new product for your inventory.'}</p>
            </div>
          </div>

          {/* Form */}
          <div className="p-8">
            <div className="max-w-2xl bg-white rounded-lg shadow-sm p-6">
              {message && (
                <div
                  className={`mb-4 p-3 rounded ${
                    message.includes("successfully")
                      ? "bg-green-50 border border-green-200 text-green-700"
                      : "bg-red-50 border border-red-200 text-red-700"
                  }`}
                >
                  {message}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Image Upload */}
                <div>
                  <label htmlFor="image" className="block text-sm font-semibold text-gray-900 mb-2">
                    Product Images <span className="text-red-600">*</span>
                  </label>
                  <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:border-yellow-500 transition">
                    <div className="text-center">
                      <CloudArrowUpIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      <label
                        htmlFor="image"
                        className="text-sm font-semibold text-yellow-700 cursor-pointer hover:text-yellow-800"
                      >
                        <span>
                          {formData.image.length > 0
                            ? "Add more images"
                            : "Click to upload or drag images"}
                        </span>
                      </label>
                      <input
                        type="file"
                        id="image"
                        accept="image/*"
                        multiple
                        onChange={handleFileChange}
                        disabled={uploadingImages}
                        className="hidden"
                      />
                      <p className="text-xs text-gray-500 mt-2">Up to 5 images, JPG/PNG/WebP</p>
                    </div>
                  </div>

                  {/* Image previews */}
                  {formData.image.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-semibold text-gray-900 mb-2">Uploaded Images:</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {formData.image.map((url, idx) => (
                          <div key={idx} className="relative group">
                            <img 
                              src={url} 
                              alt={`preview-${idx}`} 
                              className="w-full h-24 object-cover rounded-lg border border-gray-200"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setFormData((prev) => ({
                                  ...prev,
                                  image: prev.image.filter((_, i) => i !== idx),
                                }));
                              }}
                              className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                              title="Remove image"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {message.includes('Uploaded') && (
                    <p className="text-xs text-green-600 mt-2">{message}</p>
                  )}
                  {message.includes('Error') && (
                    <p className="text-xs text-red-600 mt-2">{message}</p>
                  )}
                </div>

                {/* Product Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-gray-900 mb-2">
                    Product Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g., Wireless Headphones Pro"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-gray-900"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="about" className="block text-sm font-semibold text-gray-900 mb-2">
                    Description <span className="text-red-600">*</span>
                  </label>
                  <textarea
                    id="about"
                    name="about"
                    value={formData.about}
                    onChange={handleInputChange}
                    placeholder="Describe your product..."
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-gray-900"
                    required
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Category
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="categoryInput"
                      value={newCategoryInput}
                      placeholder="Type or select category"
                      onChange={(e) => {
                        setNewCategoryInput(e.target.value);
                        setShowCategoryDropdown(true);
                      }}
                      onFocus={() => setShowCategoryDropdown(true)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-gray-900"
                    />
                    {showCategoryDropdown && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-40 overflow-auto">
                        <button
                          onClick={async () => {
                            const name = newCategoryInput.trim();
                            if (name && !categories.includes(name)) {
                              try {
                                const resp = await fetch('/api/categories', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ name }),
                                });
                                if (resp.ok) {
                                  const catList = await resp.json();
                                  if (Array.isArray(catList)) {
                                    setCategories(catList);
                                  }
                                } else {
                                  console.error('failed to create category', resp.status);
                                }
                              } catch (err) {
                                console.error('error creating category', err);
                              }
                            }
                            setFormData((p) => ({ ...p, category: name }));
                            setShowCategoryDropdown(false);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 transition text-gray-900"
                        >
                          Add "{newCategoryInput}" as category
                        </button>
                        {categories
                          .filter((c) => c.toLowerCase().includes(newCategoryInput.toLowerCase()))
                          .map((cat) => (
                            <div
                              key={cat}
                              className="flex items-center justify-between px-4 py-2 hover:bg-gray-100 transition"
                            >
                              <span
                                onClick={() => {
                                  setFormData((p) => ({ ...p, category: cat }));
                                  setNewCategoryInput(cat);
                                  setShowCategoryDropdown(false);
                                }}
                                className="cursor-pointer text-gray-900"
                              >
                                {cat}
                              </span>
                              <button
                                onClick={async () => {
                                  // optionally allow deletion from DB as well
                                  try {
                                    const resp = await fetch('/api/categories', {
                                      method: 'DELETE',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ name: cat }),
                                    });
                                    if (resp.ok) {
                                      const catList = await resp.json();
                                      if (Array.isArray(catList)) {
                                        setCategories(catList);
                                      }
                                    } else {
                                      console.error('failed to delete category', resp.status);
                                    }
                                  } catch (err) {
                                    console.error('error deleting category', err);
                                  }
                                }}
                                className="text-red-600 hover:text-red-800"
                                title="Delete category"
                              >
                                &times;
                              </button>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Price */}
                <div>
                  <label htmlFor="price" className="block text-sm font-semibold text-gray-900 mb-2">
                    Price <span className="text-red-600">*</span>
                  </label>
                  <div className="flex items-center">
                    <span className="text-gray-700 font-medium mr-2">GHS </span>
                    <input
                      type="number"
                      id="price"
                      name="price"
                      value={formData.price}
                      onChange={handleInputChange}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-gray-900"
                      required
                    />
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label htmlFor="status" className="block text-sm font-semibold text-gray-900 mb-2">
                    Stock Status
                  </label>
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-gray-900"
                  >
                    <option value="In Stock">In Stock</option>
                    <option value="Low Stock">Low Stock</option>
                    <option value="Out of Stock">Out of Stock</option>
                  </select>
                </div>

                {/* Quantity */}
                <div>
                  <label htmlFor="quantity" className="block text-sm font-semibold text-gray-900 mb-2">
                    Quantity <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="number"
                    id="quantity"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    placeholder="0"
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-gray-900"
                    required
                  />
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={loading || uploadingImages}
                    className="flex-1 px-6 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                  >
                    {uploadingImages ? "Uploading images..." : loading ? (isEditMode ? "Updating..." : "Adding...") : (isEditMode ? "Update Product" : "Add Product")}
                  </button>
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="flex-1 px-6 py-2 bg-gray-300 text-gray-900 font-medium rounded-lg hover:bg-gray-400 transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
