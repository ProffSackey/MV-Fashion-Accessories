import { NextRequest, NextResponse } from 'next/server';
import { updateShippingZone, deleteShippingZone } from '@/lib/supabaseService';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Zone ID is required' }, { status: 400 });
    }

    const allowedUpdates = {
      name: body.city || body.name,
      country: body.country,
      region: body.region,
      city: body.city,
      base_fee: body.base_fee,
      per_km_fee: body.per_km_fee,
      min_delivery_days: body.min_delivery_days,
      max_delivery_days: body.max_delivery_days,
      is_active: body.is_active,
    };

    const updatedZone = await updateShippingZone(id, allowedUpdates);

    if (!updatedZone) {
      return NextResponse.json({ error: 'Zone not found' }, { status: 404 });
    }

    return NextResponse.json(updatedZone);
  } catch (error) {
    console.error('Error updating shipping zone:', error);
    return NextResponse.json({ error: 'Failed to update shipping zone' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Zone ID is required' }, { status: 400 });
    }

    const success = await deleteShippingZone(id);

    if (!success) {
      return NextResponse.json({ error: 'Zone not found or could not be deleted' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Zone deleted' });
  } catch (error) {
    console.error('Error deleting shipping zone:', error);
    return NextResponse.json({ error: 'Failed to delete shipping zone' }, { status: 500 });
  }
}
