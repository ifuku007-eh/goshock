import { NextResponse } from "next/server";
import { getBearerToken, verifyToken } from "@/lib/server/auth";
import { getSiteUrl, supabase } from "@/lib/server/db";

export async function GET(req: Request) {
  try {
    const token = getBearerToken(req);

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = verifyToken(token);

    const { data, error } = await supabase
      .from("urls")
      .select("id, short_code, long_url, clicks, created_at, expires_at")
      .eq("user_id", user.user_id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "Gagal mengambil data" }, { status: 500 });
    }

    const siteUrl = getSiteUrl();
    const now = Date.now();

    const result = (data || []).map((link) => ({
      id: link.id,
      short_code: link.short_code,
      short_url: `${siteUrl}/${link.short_code}`,
      long_url: link.long_url,
      qr_url: `${siteUrl}/api/qr/${link.short_code}`,
      clicks: link.clicks,
      created_at: link.created_at,
      expires_at: link.expires_at,
      is_expired: link.expires_at ? new Date(link.expires_at).getTime() < now : false,
    }));

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}