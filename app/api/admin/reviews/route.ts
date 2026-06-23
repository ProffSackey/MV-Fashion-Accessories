import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseClient";

async function requireAdmin() {
  const cookieStore = await cookies();
  const sb = cookieStore.get('sb-admin-token');
  const session = cookieStore.get('admin_session');
  if (sb) return sb.value;
  if (session) return session.value;
  return null;
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  // Optionally allow filtering by product_id or status via query params in future
  const { data, error } = await supabase
    .from('reviews')
    .select(`*, products(name), customers(email)`);

  if (error) {
    console.error('GET /api/admin/reviews error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}
