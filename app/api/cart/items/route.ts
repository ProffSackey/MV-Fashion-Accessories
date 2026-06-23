import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseClient';

/**
 * GET /api/cart/items?email=user@example.com
 * Fetch cart items for a specific customer email
 * Uses admin client to bypass RLS permissions
 */
export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter is required' },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Service role not configured' },
        { status: 500 }
      );
    }

    console.log('[API /cart/items] Fetching cart items for email:', email);

    // Fetch cart items with product details using admin client (bypasses RLS)
    const { data, error } = await supabaseAdmin
      .from('cart_items')
      .select(`
        *,
        product:product_id (*)
      `)
      .eq('customer_email', email)
      .order('added_at', { ascending: false });

    if (error) {
      console.error('[API /cart/items] Error fetching cart items:', {
        email,
        message: error.message,
        code: error.code
      });
      return NextResponse.json(
        { error: 'Failed to fetch cart items' },
        { status: 500 }
      );
    }

    // Filter out orphaned cart items (where product was deleted)
    const validItems = (data || []).filter(item => item.product != null);
    console.log('[API /cart/items] Fetched', (data || []).length, 'items,', validItems.length, 'valid for email:', email);

    // Clean up orphaned items in the background
    if (validItems.length !== (data || []).length) {
      const orphanedIds = (data || [])
        .filter(item => item.product == null)
        .map(item => item.id);

      if (orphanedIds.length > 0) {
        console.log('[API /cart/items] Cleaning up', orphanedIds.length, 'orphaned items');
        // Fire and forget cleanup
        (async () => {
          try {
            await supabaseAdmin
              .from('cart_items')
              .delete()
              .in('id', orphanedIds);
            console.log('[API /cart/items] Successfully cleaned orphaned items');
          } catch (err: any) {
            console.error('[API /cart/items] Error cleaning orphaned items:', err);
          }
        })();
      }
    }

    return NextResponse.json(validItems);
  } catch (error) {
    console.error('[API /cart/items] Exception:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
