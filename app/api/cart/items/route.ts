import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseClient';
import { requireAuthenticatedUser, sameEmail } from '@/lib/serverAuth';

/**
 * GET /api/cart/items?email=user@example.com
 * Fetch cart items for a specific customer email
 * Uses admin client to bypass RLS permissions
 */
export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get('email');
    const user = await requireAuthenticatedUser(request);

    if (!user || !sameEmail(user.email, email)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Service role not configured' },
        { status: 500 }
      );
    }

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
      console.error('[API /cart/items] Failed to fetch cart items:', error.code);
      return NextResponse.json(
        { error: 'Failed to fetch cart items' },
        { status: 500 }
      );
    }

    // Filter out orphaned cart items (where product was deleted)
    const validItems = (data || []).filter(item => item.product != null);

    // Clean up orphaned items in the background
    if (validItems.length !== (data || []).length) {
      const orphanedIds = (data || [])
        .filter(item => item.product == null)
        .map(item => item.id);

      if (orphanedIds.length > 0) {
        // Fire and forget cleanup
        (async () => {
          try {
            await supabaseAdmin
              .from('cart_items')
              .delete()
              .in('id', orphanedIds);
          } catch (err: unknown) {
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
