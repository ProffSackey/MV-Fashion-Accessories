"use client";

import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend
);

import { useEffect, useState } from 'react';

export default function RevenueChart({ timePeriod = "Today" }: { timePeriod?: string }) {
  const [labels, setLabels] = useState<string[]>([]);
  const [monthlyData, setMonthlyData] = useState<number[]>([]);
  const currentYear = new Date().getFullYear();

  // Generate labels and filter orders based on timePeriod
  const getDateRangeAndLabels = () => {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    switch (timePeriod) {
      case "Today":
        return {
          startDate: startOfToday,
          endDate: new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000),
          labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
          dateKey: (d: Date) => d.getHours(),
        };
      case "Last 7 days":
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 6);
        return {
          startDate: sevenDaysAgo,
          endDate: new Date(today.getTime() + 24 * 60 * 60 * 1000),
          labels: Array.from({ length: 7 }, (_, i) => {
            const d = new Date(sevenDaysAgo);
            d.setDate(d.getDate() + i);
            return d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
          }),
          dateKey: (d: Date) => {
            const diff = Math.floor((d.getTime() - sevenDaysAgo.getTime()) / (1000 * 60 * 60 * 24));
            return Math.max(0, Math.min(6, diff));
          },
        };
      case "Last 30 days":
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 29);
        return {
          startDate: thirtyDaysAgo,
          endDate: new Date(today.getTime() + 24 * 60 * 60 * 1000),
          labels: Array.from({ length: 30 }, (_, i) => {
            const d = new Date(thirtyDaysAgo);
            d.setDate(d.getDate() + i);
            return d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
          }),
          dateKey: (d: Date) => {
            const diff = Math.floor((d.getTime() - thirtyDaysAgo.getTime()) / (1000 * 60 * 60 * 24));
            return Math.max(0, Math.min(29, diff));
          },
        };
      case "Last 12 months":
      default:
        return {
          startDate: new Date(currentYear, 0, 1),
          endDate: new Date(currentYear + 1, 0, 1),
          labels: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
          dateKey: (d: Date) => d.getMonth(),
        };
      case "Last year":
        return {
          startDate: new Date(currentYear - 1, 0, 1),
          endDate: new Date(currentYear, 0, 1),
          labels: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
          dateKey: (d: Date) => d.getMonth(),
        };
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/orders');
        if (!res.ok) return;
        const orders = await res.json();
        if (!Array.isArray(orders)) return;

        const { startDate, endDate, labels: newLabels, dateKey } = getDateRangeAndLabels();
        setLabels(newLabels);

        const dataSize = timePeriod === "Today" ? 24 : (timePeriod === "Last 7 days" ? 7 : (timePeriod === "Last 30 days" ? 30 : 12));
        const data = new Array(dataSize).fill(0);

        for (const order of orders) {
          const dateStr = order.created_at || order.date || order.ordered_at || order.order_date;
          const d = dateStr ? new Date(dateStr) : null;
          if (!d || d < startDate || d >= endDate) continue;

          const idx = dateKey(d);
          if (idx >= 0 && idx < dataSize) {
            const amountRaw = order.total_amount ?? order.amount ?? order.total ?? order.grand_total ?? 0;
            const amount = parseFloat(String(amountRaw).replace(/[^0-9.-]+/g, '')) || 0;
            data[idx] += amount;
          }
        }
        // keep precise numeric values (don't round) so small revenues still display
        setMonthlyData(data.map((v) => Number(v)));
      } catch (err) {
        console.warn('RevenueChart: unable to load orders', err);
      }
    })();
  }, [timePeriod]);

  const data = {
    labels,
    datasets: [
      {
        label: 'Revenue',
        data: monthlyData,
        fill: true,
        backgroundColor: (context:any) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 400);
          gradient.addColorStop(0, 'rgba(59,130,246,0.25)');
          gradient.addColorStop(1, 'rgba(59,130,246,0.02)');
          return gradient;
        },
        borderColor: '#ca8a04',
        tension: 0.4,
        pointRadius: 0,
        borderWidth: 3,
      },
    ],
  };

  const totalRevenue = monthlyData.reduce((s, v) => s + v, 0);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: false },
      tooltip: { mode: 'index' as const, intersect: false },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#6b7280', font: { size: 12, weight: 500 as any } },
      },
      y: {
        grid: { color: '#e5e7eb' },
        ticks: {
          color: '#6b7280',
          callback: (value:any) => `GHS ${Number(value).toLocaleString('en-GB', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,
          font: { size: 12, weight: 500 as any },
        },
      },
    },
  };

  if (!totalRevenue) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-8">Revenue Overview</h2>
        <div className="w-full h-80 flex items-center justify-center text-gray-500">
          No revenue data available
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-8">Revenue Overview</h2>
      <div className="w-full h-80">
        <Line data={data} options={options as any} />
      </div>
    </div>
  );
}
