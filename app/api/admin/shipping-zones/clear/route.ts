import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseClient';

/**
 * DELETE /api/admin/shipping-zones/clear
 * Clears all shipping zones from the database (admin only)
 * Requires SUPABASE_SERVICE_ROLE_KEY in server environment
 */
export async function DELETE(request: NextRequest) {
  try {
    // Verify admin session
    const sessionRes = await fetch(new URL('/api/admin/verify-session', request.url), {
      headers: request.headers,
    });

    if (!sessionRes.ok) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Service role not configured' },
        { status: 500 }
      );
    }

    // Fetch all zones first to show what's being deleted
    const { data: zones, error: fetchError } = await supabaseAdmin
      .from('shipping_zones')
      .select('*');

    if (fetchError) {
      console.error('Error fetching zones:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch zones' },
        { status: 500 }
      );
    }

    if (!zones || zones.length === 0) {
      return NextResponse.json({
        message: 'No shipping zones to delete',
        deletedCount: 0,
        zones: [],
      });
    }

    // Delete all zones
    const { error: deleteError } = await supabaseAdmin
      .from('shipping_zones')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (deleteError) {
      console.error('Error deleting zones:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete zones' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: `Successfully deleted ${zones.length} shipping zone(s)`,
      deletedCount: zones.length,
      zones: zones.map((z) => ({
        name: z.name,
        country: z.country,
        fee: z.base_fee,
      })),
    });
  } catch (error) {
    console.error('Error clearing shipping zones:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
