"use client";

import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

import { useEffect, useState } from 'react';

export default function SalesByCategory({ timePeriod = "Today" }: { timePeriod?: string }) {
  const [categories, setCategories] = useState<{ name: string; count: number; color?: string }[]>([]);

  const getDateRange = () => {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    switch (timePeriod) {
      case "Today":
        return {
          startDate: startOfToday,
          endDate: new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000),
        };
      case "Last 7 days":
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 6);
        return {
          startDate: sevenDaysAgo,
          endDate: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        };
      case "Last 30 days":
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 29);
        return {
          startDate: thirtyDaysAgo,
          endDate: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        };
      case "Last year":
        const lastYearStart = new Date(today.getFullYear() - 1, 0, 1);
        return {
          startDate: lastYearStart,
          endDate: new Date(today.getFullYear(), 0, 1),
        };
      case "Last 12 months":
      default:
        const currentYear = new Date().getFullYear();
        return {
          startDate: new Date(currentYear, 0, 1),
          endDate: new Date(currentYear + 1, 0, 1),
        };
    }
  };

  useEffect(() => {
    (async () => {
      try {
        // Fetch both orders and products to map order items to categories
        const ordersRes = await fetch('/api/admin/orders');
        if (!ordersRes.ok) return;
        const orders = await ordersRes.json();
        if (!Array.isArray(orders)) return;

        const { startDate, endDate } = getDateRange();
        
        // Count sales by category from orders
        const map = new Map<string, number>();
        for (const order of orders) {
          const dateStr = order.created_at || order.date || order.ordered_at || order.order_date;
          const d = dateStr ? new Date(dateStr) : null;
          if (!d || d < startDate || d >= endDate) continue;

          // Parse items from order - prefer enriched `itemsDetail` returned by the admin orders API
          const items = order.itemsDetail || order.items || order.order_items || [];
          if (Array.isArray(items)) {
            for (const item of items) {
              const cat = item.category?.name || item.category || item.category_name || 'Uncategorized';
              map.set(cat, (map.get(cat) || 0) + (item.quantity || 1));
            }
          }
        }

        const palette = ['#ca8a04','#eab308','#facc15','#a16207','#854d0e','#71717a','#d97706'];
        const arr = Array.from(map.entries())
          .map(([name, count], i) => ({ name, count, color: palette[i % palette.length] }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);
        setCategories(arr.length > 0 ? arr : [{ name: 'No sales', count: 1, color: '#d1d5db' }]);
      } catch (err) {
        console.warn('SalesByCategory: unable to load data', err);
      }
    })();
  }, [timePeriod]);

  const labels = categories.map(c => c.name);
  const counts = categories.map(c => c.count);
  const colors = categories.map(c => c.color || '#ca8a04');

  const data = {
    labels,
    datasets: [
      {
        data: counts,
        backgroundColor: colors,
        hoverOffset: 4,
        borderWidth: 0,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: function(context:any) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = counts.reduce((s:number, v:number) => s + v, 0) || 1;
            const pct = Math.round((value / total) * 100);
            return `${label}: ${pct}%`;
          }
        }
      }
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-8">Order by Category</h2>
      <div className="relative w-full h-64">
        <Doughnut data={data} options={options} />
      </div>
      <div className="w-full space-y-3 mt-6">
        {categories.length === 0 ? (
          <div className="text-gray-500">No category data</div>
        ) : (
          categories.map(cat => (
            <div key={cat.name} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="text-gray-700 font-medium text-sm">{cat.name}</span>
              </div>
              <span className="text-gray-900 font-semibold text-sm">{Math.round((cat.count / (counts.reduce((s,n)=>s+n,0)||1)) * 100)}%</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
