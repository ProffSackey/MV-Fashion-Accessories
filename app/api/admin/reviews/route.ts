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

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  const { status } = await req.json();
  if (!id || !["approved", "pending", "rejected"].includes(status)) {
    return NextResponse.json({ error: "Valid review and status are required" }, { status: 400 });
  }
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  const { data, error } = await supabase.from("reviews").update({ status, updated_at: new Date().toISOString() }).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: "Could not update review" }, { status: 500 });
  return NextResponse.json(data);
}
