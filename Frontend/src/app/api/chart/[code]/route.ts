import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { getBearerToken, verifyToken } from "@/lib/server/auth";
import { getSiteUrl, supabase } from "@/lib/server/db";

export async function GET(
  req: Request,
  { params }: { params: { code: string } }
) {
  try {
    const token = getBearerToken(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = verifyToken(token);

    const { data: urlRecord } = await supabase
      .from("urls")
      .select("id, user_id, short_code, long_url, clicks, created_at, expires_at")
      .eq("short_code", params.code)
      .single();

    if (!urlRecord) {
      return NextResponse.json({ error: "Link tidak ditemukan" }, { status: 404 });
    }

    if (urlRecord.user_id !== user.user_id) {
      return NextResponse.json({ error: "Bukan link milik Anda" }, { status: 403 });
    }

    const since = new Date();
    since.setHours(since.getHours() - 24);

    const { data: logs } = await supabase
      .from("click_logs")
      .select("clicked_at")
      .eq("short_code", params.code)
      .gte("clicked_at", since.toISOString());

    const clickMap = new Map<string, number>();

    for (const log of logs || []) {
      const hour = new Date(log.clicked_at).getHours().toString().padStart(2, "0");
      const label = `${hour}:00`;
      clickMap.set(label, (clickMap.get(label) || 0) + 1);
    }

    const chart = [];

    for (let i = 23; i >= 0; i--) {
      const date = new Date();
      date.setHours(date.getHours() - i);

      const hour = date.getHours().toString().padStart(2, "0");
      const label = `${hour}:00`;

      chart.push({
        hour: label,
        clicks: clickMap.get(label) || 0,
      });
    }

    const siteUrl = getSiteUrl();

    const qrDataUrl = await QRCode.toDataURL(urlRecord.long_url, {
      width: 300,
      margin: 2,
    });

    return NextResponse.json({
      short_code: urlRecord.short_code,
      short_url: `${siteUrl}/${urlRecord.short_code}`,
      long_url: urlRecord.long_url,
      qr_url: qrDataUrl,
      clicks: urlRecord.clicks,
      created_at: urlRecord.created_at,
      expires_at: urlRecord.expires_at,
      chart,
    });
  } catch {
    return NextResponse.json({ error: "Gagal mengambil data chart" }, { status: 500 });
  }
}