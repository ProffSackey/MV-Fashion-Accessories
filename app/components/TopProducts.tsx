"use client";

import { useEffect, useState } from 'react';

interface TopProductsProps {
  timePeriod?: string;
}

export default function TopProducts({ timePeriod }: TopProductsProps) {
  const [products, setProducts] = useState<Array<{ name: string; sales: number }>>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/orders');
        if (!res.ok) return;
        const orders = await res.json();
        if (!Array.isArray(orders)) return;

        const map = new Map<string, number>();
        for (const order of orders) {
          const items = order.itemsDetail || [];
          if (Array.isArray(items)) {
            for (const it of items) {
              const name = it.name || it.productId || 'Unknown product';
              map.set(name, (map.get(name) || 0) + (it.quantity || 1));
            }
          }
        }

        const arr = Array.from(map.entries()).map(([name, sales]) => ({ name, sales }));
        arr.sort((a, b) => b.sales - a.sales);
        setProducts(arr.slice(0, 10));
      } catch (err) {
        console.warn('TopProducts: failed to load data', err);
      }
    })();
  }, [timePeriod]);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Top Products</h2>
      <div className="space-y-4">
        {products.length === 0 ? (
          <div className="text-gray-500">No product sales yet</div>
        ) : (
          products.map((product, index) => (
            <div key={product.name} className="flex items-center justify-between pb-3 border-b last:border-b-0">
              <div>
                <p className="font-semibold text-gray-900">{product.name}</p>
                <p className="text-sm text-gray-600">{product.sales} units sold</p>
              </div>
              <div className="bg-yellow-100 text-yellow-700 font-bold px-3 py-1 rounded-full text-sm">
                #{index + 1}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
