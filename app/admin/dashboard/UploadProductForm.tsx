"use client";

import { useState, FormEvent } from 'react';

interface Props {
  refreshCategories: () => void;
  categories?: string[];
  onSuccess?: () => void;
}

export default function UploadProductForm({ refreshCategories, categories = [], onSuccess }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [imageData, setImageData] = useState(''); // base64 or URL
  const [stock, setStock] = useState(''); // we'll send this as stock_quantity
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage('');
    const res = await fetch('/api/admin/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        description,
        price: parseFloat(price),
        category,
        image_url: imageData,
        stock: stock ? parseInt(stock) : 0,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || 'Upload failed');
    } else {
      setMessage('Product added');
      setName('');
      setDescription('');
      setPrice('');
      setCategory('');
      setImageData('');
      setStock('');
      refreshCategories();
      if (onSuccess) onSuccess();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6">
      <h2 className="text-xl font-bold mb-6">Add New Product</h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Product name"
          className="border px-3 py-2 rounded text-gray-800"
          required
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
          className="border px-3 py-2 rounded text-gray-800 w-full md:col-span-2"
          rows={3}
        />
        <input
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="Price"
          type="number"
          step="0.01"
          className="border px-3 py-2 rounded text-gray-800 w-full"
          required
        />
        {categories && categories.length > 0 ? (
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="border px-3 py-2 rounded text-gray-800 w-full"
            required
          >
            <option value="">Select category</option>
            {categories.map((c: string) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        ) : (
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Category"
            className="border px-3 py-2 rounded text-gray-800 w-full"
            required
          />
        )}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Product Image</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = () => {
                  setImageData(reader.result as string);
                };
                reader.readAsDataURL(file);
              }
            }}
            className="border px-2 py-1 rounded w-full text-gray-800"
          />
          {imageData && (
            <img src={imageData} alt="preview" className="mt-2 h-24 object-contain" />
          )}
        </div>
        <input
          value={stock}
          onChange={(e) => setStock(e.target.value)}
          placeholder="Stock Quantity"
          type="number"
          className="border px-3 py-2 rounded w-full text-gray-800"
          required
        />
        <button className="bg-yellow-600 text-white px-5 py-3 rounded-md hover:bg-yellow-700 w-full font-semibold md:col-span-2">
          Add Product
        </button>
        {message && <p className="text-sm mt-2">{message}</p>}
      </form>
    </div>
  );
}