import { NextRequest, NextResponse } from 'next/server';
import { getShippingZones, createShippingZone } from '@/lib/supabaseService';

export async function GET(request: NextRequest) {
  try {
    const zones = await getShippingZones();
    return NextResponse.json(zones);
  } catch (error) {
    console.error('Error fetching shipping zones:', error);
    return NextResponse.json({ error: 'Failed to fetch shipping zones' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.name || !body.country || typeof body.base_fee !== 'number') {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const newZone = await createShippingZone({
      name: body.name,
      country: body.country,
      region: body.region || undefined,
      base_fee: body.base_fee,
      per_km_fee: body.per_km_fee || 0,
      min_delivery_days: body.min_delivery_days || 1,
      max_delivery_days: body.max_delivery_days || 5,
      is_active: body.is_active !== undefined ? body.is_active : true,
    });

    return NextResponse.json(newZone, { status: 201 });
  } catch (error) {
    console.error('Error creating shipping zone:', error);
    return NextResponse.json({ error: 'Failed to create shipping zone' }, { status: 500 });
  }
}
