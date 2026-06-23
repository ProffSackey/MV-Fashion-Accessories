import { calculateShippingFee } from '@/lib/supabaseService';

/**
 * GET /api/shipping-rates?location=ZONE_NAME_OR_REGION_CODE_OR_COUNTRY
 * Returns shipping fee and delivery estimate for a given location (zone name, region code, or country)
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const location = url.searchParams.get('location')?.toUpperCase();

    if (!location) {
      return Response.json(
        { error: 'Location is required (zone name, region code, or country)' },
        { status: 400 }
      );
    }

    const result = await calculateShippingFee(location);

    if (!result) {
      return Response.json(
        { error: `Shipping not available for ${location}` },
        { status: 404 }
      );
    }

    return Response.json({
      location,
      shippingFee: result.fee,
      estimatedDeliveryMin: result.minDays,
      estimatedDeliveryMax: result.maxDays,
    });
  } catch (error) {
    console.error('Shipping rate error:', error);
    return Response.json(
      { error: 'Failed to calculate shipping fee' },
      { status: 500 }
    );
  }
}
