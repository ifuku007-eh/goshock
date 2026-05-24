import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { supabase } from "@/lib/server/db";

export async function GET(
  _req: Request,
  { params }: { params: { code: string } }
) {
  try {
    const { data, error } = await supabase
      .from("urls")
      .select("long_url")
      .eq("short_code", params.code)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
    }

    const svg = await QRCode.toString(data.long_url, {
      type: "svg",
      width: 300,
      margin: 2,
    });

    return new Response(svg, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "Gagal generate QR" }, { status: 500 });
  }
}