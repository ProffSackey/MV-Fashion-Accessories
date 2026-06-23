import { formatCurrency, parseCurrency } from "./currency";

/**
 * Promotion & Pricing Utilities
 * Helper functions for calculating discounts and managing promotions
 * Note: Works with Supabase field names (snake_case)
 */

export interface Promotion {
  id?: string;
  name: string;
  type: "Percentage" | "Fixed";
  discount: string;
  deadline: string;
  description?: string;
  code?: string;
  product_ids?: string[];
  productIds?: string[];
  is_active?: boolean;
  isActive?: boolean;
  start_date?: string;
  startDate?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DiscountedPrice {
  original: number;
  discounted: number;
  savings: number;
  savingsPercent: number;
  formatted: {
    original: string;
    discounted: string;
  };
}

/**
 * Parse price string to number
 * E.g., "GHS 159.99" -> 159.99
 */
export const parsePrice = (priceStr: string): number => {
  return parseCurrency(priceStr);
};

/**
 * Format number to price string
 * E.g., 159.99 -> "GHS 159.99"
 */
export const formatPrice = (price: number): string => {
  return formatCurrency(price);
};

/**
 * Calculate discounted price based on promotion
 * Returns original price, discounted price, and savings
 */
export const calculateDiscount = (
  originalPrice: string,
  promotion: Promotion
): DiscountedPrice => {
  const original = parsePrice(originalPrice);
  let discounted = original;

  if (promotion.type === "Percentage") {
    const percent = parseFloat(promotion.discount) / 100;
    discounted = original * (1 - percent);
  } else {
    // Fixed amount
    const fixed = parsePrice(promotion.discount);
    discounted = Math.max(0, original - fixed);
  }

  const savings = original - discounted;
  const savingsPercent = (savings / original) * 100;

  return {
    original,
    discounted: Math.round(discounted * 100) / 100,
    savings: Math.round(savings * 100) / 100,
    savingsPercent: Math.round(savingsPercent * 10) / 10,
    formatted: {
      original: formatPrice(original),
      discounted: formatPrice(Math.round(discounted * 100) / 100),
    },
  };
};

/**
 * Get active promotions for a specific product
 * Returns applicable promotions or null if none
 */
export const getProductPromotions = (
  productId: string,
  promotions: Promotion[]
): Promotion | null => {
  const today = new Date();
  
  return (
    promotions.find(
      (promo) => {
        const isActive = promo.is_active !== undefined ? promo.is_active : promo.isActive;
        const productIds = promo.product_ids !== undefined ? promo.product_ids : promo.productIds || [];
        const startDate = promo.start_date !== undefined ? promo.start_date : promo.startDate;
        
        return (
          isActive &&
          productIds.includes(productId) &&
          new Date(startDate || '') <= today &&
          new Date(promo.deadline) >= today
        );
      }
    ) || null
  );
};

/**
 * Get all active featured promotions
 * (For displaying on homepage as promo cards)
 */
export const getFeaturedPromotions = (
  promotions: Promotion[]
): Promotion[] => {
  const today = new Date();
  
  return promotions.filter(
    (promo) => {
      const isActive = promo.is_active !== undefined ? promo.is_active : promo.isActive;
      const productIds = promo.product_ids !== undefined ? promo.product_ids : promo.productIds || [];
      const startDate = promo.start_date !== undefined ? promo.start_date : promo.startDate;
      
      return (
        isActive &&
        productIds.length > 0 &&
        new Date(startDate || '') <= today &&
        new Date(promo.deadline) >= today
      );
    }
  );
};

/**
 * Check if promotion is still valid
 */
export const isPromotionValid = (promotion: Promotion): boolean => {
  const today = new Date();
  const startDate = new Date(promotion.start_date || promotion.startDate || '');
  const endDate = new Date(promotion.deadline);
  const isActive = (promotion.is_active !== undefined ? promotion.is_active : promotion.isActive) ?? false;
  const productIds = promotion.product_ids !== undefined ? promotion.product_ids : promotion.productIds || [];
  
  return (
    isActive &&
    startDate <= today &&
    endDate >= today &&
    productIds.length > 0
  );
};

/**
 * Get discount badge text
 * E.g., "SAVE 20%" or "SAVE GHS 10"
 */
export const getDiscountBadgeText = (promotion: Promotion): string => {
  if (promotion.type === "Percentage") {
    return `SAVE ${promotion.discount}`;
  } else {
    return `SAVE ${promotion.discount}`;
  }
};
