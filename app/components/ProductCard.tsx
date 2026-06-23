"use client";

import Image from 'next/image';
import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { EnvelopeIcon } from '@heroicons/react/24/outline';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useState, useEffect } from 'react';
import { Promotion as UIPromotion, getProductPromotions, calculateDiscount } from '../../lib/promotionUtils';
import { formatCurrency } from '../../lib/currency';
import type { Product } from '../../lib/supabaseService';

interface Props {
  product: Product;
  promotions?: UIPromotion[];
  user?: any;
  addingToCart?: string | null;
  onAddToCart: (id: string) => void;
}

export default function ProductCard({ product: p, promotions = [], user, addingToCart, onAddToCart }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    console.log('[ProductCard] Rendered with product:', {
      id: p.id,
      name: p.name,
      hasId: !!p.id
    });
  }, [p.id, p.name]);

  const promotion = getProductPromotions(p.id || '', promotions);
  const discount = promotion ? calculateDiscount(p.price, promotion) : null;

  const stock = p.stock_quantity ?? 0;
  const stockThreshold = 100; // used to calculate progress bar percentage
  const stockPercent = Math.min(100, Math.round((stock / stockThreshold) * 100));
  const stockColor = stock <= 5 ? 'bg-red-500' : stock <= 20 ? 'bg-yellow-500' : 'bg-yellow-400';

  return (
    <>
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      {/* Image Container - 2/3 of card height */}
      <div className="relative h-40 sm:h-44 md:h-52 lg:h-60 xl:h-64 bg-gray-200 flex items-center justify-center text-gray-500 overflow-hidden">
        {p.image_url ? (
          <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
        ) : (
          'Image'
        )}
        
        {/* Discount Badge Overlay */}
        {discount && (
          <div className="absolute top-2 right-2 sm:top-3 sm:right-3 bg-green-500 text-white px-2 sm:px-3 py-1 rounded-full font-bold text-xs sm:text-sm shadow-lg">
            Save {discount.savingsPercent.toFixed(0)}%
          </div>
        )}
      </div>

      {/* Content Container - Fixed height for consistent card alignment */}
      <div className="p-2 sm:p-4 md:p-5 lg:p-4 flex flex-col justify-between h-[200px] sm:h-[240px] md:h-[240px] lg:h-[260px] xl:h-[280px]">
        {/* Header Section */}
        <div>
          <h3 className="text-sm sm:text-base md:text-lg font-bold text-gray-900 mb-0.5 md:mb-1 line-clamp-1 md:line-clamp-2">
            {p.name}
          </h3>

          <div className="flex items-center justify-between mb-0.5 md:mb-1 gap-1 md:gap-2">
            <p className="text-gray-600 text-xs md:text-sm truncate flex-1">
              {p.about || p.description || 'Quality product'}
            </p>
            <button
              onClick={() => {
                console.log('[ProductCard] Read more clicked for product:', { id: p.id, name: p.name });
                router.push(`/products/${p.id}`);
              }}
              className="text-xs md:text-sm text-yellow-700 ml-1 md:ml-2 hover:underline whitespace-nowrap"
              aria-label="Read more about product"
            >
              Read more
            </button>
          </div>

          {/* Rating */}
          <div className="flex items-center gap-0.5 md:gap-1 mb-0.5 md:mb-1">
            <span className="text-yellow-400 text-xs md:text-sm">
              {'\u2605'.repeat(Math.floor((p.rating && p.rating > 0) ? p.rating : 3))}
              {((p.rating && p.rating > 0) ? p.rating : 3) % 1 ? '\u2606' : ''}
            </span>
            <span className="text-gray-600 font-medium text-xs md:text-sm">{((p.rating && p.rating > 0) ? p.rating : 3).toFixed(1)}</span>
          </div>

          {/* Stock status indicator */}
          <div className="mb-0.5 md:mb-1">
            <div className="flex items-center justify-between mb-0.5 md:mb-1">
              <span className="text-xs md:text-sm text-gray-700">{stock} items left</span>
              <button
                aria-label="Message about this product"
                onClick={() => {
                  if (typeof window !== 'undefined' && p.id) {
                    window.location.href = `/messages?productId=${p.id}`;
                  }
                }}
                className="ml-2 text-gray-600 hover:text-yellow-700"
              >
                <EnvelopeIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="w-full bg-gray-300 rounded-full h-2">
              <div className={`${stockColor} h-2 rounded-full`} style={{ width: `${stockPercent}%` }} />
            </div>
          </div>
        </div>

        {/* Footer Section with Price and Button */}
        <div className="flex flex-col gap-1 md:gap-1.5">
          {/* Price Section */}
          {discount ? (
            <div className="flex items-center gap-1 md:gap-2">
              <span className="text-xs md:text-sm text-gray-500 line-through">
                {discount.formatted.original || formatCurrency(0)}
              </span>
              <span className="text-lg sm:text-xl md:text-2xl lg:text-xl xl:text-lg font-bold text-yellow-700">
                {discount.formatted.discounted || formatCurrency(0)}
              </span>
            </div>
          ) : (
            <div className="text-lg sm:text-xl md:text-2xl lg:text-xl xl:text-lg font-bold text-yellow-700 leading-none">
              {p.price || formatCurrency(0)}
            </div>
          )}

          {/* Add to Cart Button */}
          <button
            onClick={() => onAddToCart(p.id?.toString() || '')}
            disabled={addingToCart === p.id || !p.price || (p.stock_quantity !== undefined && p.stock_quantity <= 0)}
            className="w-full bg-yellow-500 hover:bg-yellow-700 disabled:bg-gray-400 text-white px-2 py-1 sm:py-1.5 md:py-2 md:px-3 rounded-lg text-xs sm:text-sm md:text-base font-bold transition-colors"
          >
            {addingToCart === p.id ? 'Adding...' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </div>

    {/* Modal - Quick Preview (optional) */}
    {open && (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 overflow-hidden">
          <div className="p-4 border-b flex items-start justify-between">
            <div className="flex items-start gap-4">
              <img src={p.image_url} alt={p.name} className="w-20 h-20 object-cover rounded-md" />
              <div>
                <h3 className="text-lg font-bold text-gray-900">{p.name}</h3>
                <p className="text-sm text-gray-600">{p.about || p.description}</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-gray-700">
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Product details</h4>
              <p className="text-sm text-gray-700 mb-4">{p.description || p.about || 'No further details available.'}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => { setOpen(false); router.push(`/products/${p.id}`); }}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-md font-medium"
                >
                  View Full Details
                </button>
                  <button
                    onClick={() => { if (typeof window !== 'undefined' && p.id) window.location.href = `/messages?productId=${p.id}`; }}
                    className="border border-yellow-500 text-yellow-700 px-4 py-2 rounded-md font-medium hover:bg-yellow-50"
                  >
                    Chat now
                  </button>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Product Information</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600">Price: </span>
                  <span className="font-bold text-yellow-700">{p.price}</span>
                </div>
                <div>
                  <span className="text-gray-600">Stock: </span>
                  <span className="font-bold">{stock} items available</span>
                </div>
                {p.category && (
                  <div>
                    <span className="text-gray-600">Category: </span>
                    <span className="font-bold">{p.category}</span>
                  </div>
                )}
                <div>
                  <span className="text-gray-600">Rating: </span>
                  <span className="font-bold">{((p.rating && p.rating > 0) ? p.rating : 3).toFixed(1)}/5</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
