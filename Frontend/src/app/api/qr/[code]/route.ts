import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { supabase } from "@/lib/server/db";

export async function GET(
  _req: Request,
  { params }: { params: { code: string } }
) {
  try {
    const { data } = await supabase
      .from("urls")
      .select("long_url")
      .eq("short_code", params.code)
      .single();

    if (!data) {
      return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
    }

    const buffer = await QRCode.toBuffer(data.long_url, {
      width: 300,
      margin: 2,
    });

    const body = new Uint8Array(buffer);

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "Gagal generate QR" }, { status: 500 });
  }
}