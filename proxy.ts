import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (pathname === "/admin/login" || pathname === "/api/admin/login") return NextResponse.next();

  const token = request.cookies.get("sb-admin-token")?.value;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!token || !url || !serviceKey) return deny(request);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user?.email) return deny(request);

  const metadata = data.user.app_metadata || {};
  let authorized = metadata.role === "admin" || metadata.is_admin === true;
  if (!authorized) {
    const { data: record } = await admin.from("admin_users").select("id").ilike("email", data.user.email).maybeSingle();
    authorized = Boolean(record);
  }
  if (!authorized) return deny(request);

  return NextResponse.next();
}

function deny(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const login = new URL("/admin/login", request.url);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
