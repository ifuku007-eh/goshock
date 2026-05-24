import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { getBearerToken, verifyToken } from "@/lib/server/auth";
import { getSiteUrl, supabase } from "@/lib/server/db";
import {
  generateShortCode,
  isValidAlias,
  reservedWords,
} from "@/lib/server/shortcode";

export async function POST(req: Request) {
  try {
    const token = getBearerToken(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = verifyToken(token);
    const formData = await req.formData();

    const longUrl = String(formData.get("url") || "").trim();
    const alias = String(formData.get("alias") || "").trim();
    const expiryDays = String(formData.get("expiry_days") || "");

    if (!longUrl) return NextResponse.json({ error: "URL tidak boleh kosong" }, { status: 400 });

    let parsed: URL;
    try {
      parsed = new URL(longUrl);
    } catch {
      return NextResponse.json(
        { error: "URL tidak valid. Harus diawali http:// atau https://" },
        { status: 400 }
      );
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return NextResponse.json(
        { error: "URL tidak valid. Harus diawali http:// atau https://" },
        { status: 400 }
      );
    }

    let expiresAt: string | null = null;
    if (expiryDays === "1" || expiryDays === "7" || expiryDays === "30") {
      const date = new Date();
      date.setDate(date.getDate() + Number(expiryDays));
      expiresAt = date.toISOString();
    }

    let shortCode = "";

    if (alias) {
      if (!isValidAlias(alias)) {
        return NextResponse.json(
          { error: "Alias hanya boleh huruf, angka, tanda hubung. Min 3, maks 30 karakter." },
          { status: 400 }
        );
      }

      if (reservedWords.has(alias.toLowerCase())) {
        return NextResponse.json({ error: `Alias '${alias}' tidak bisa digunakan.` }, { status: 400 });
      }

      const { data: existing } = await supabase
        .from("urls")
        .select("id")
        .eq("short_code", alias)
        .maybeSingle();

      if (existing) {
        return NextResponse.json({ error: `Alias '${alias}' sudah digunakan.` }, { status: 409 });
      }

      shortCode = alias;
    } else {
      for (let i = 0; i < 10; i++) {
        const code = generateShortCode(6);

        const { data: existing } = await supabase
          .from("urls")
          .select("id")
          .eq("short_code", code)
          .maybeSingle();

        if (!existing) {
          shortCode = code;
          break;
        }
      }
    }

    if (!shortCode) {
      return NextResponse.json({ error: "Gagal membuat short code" }, { status: 500 });
    }

    const { data, error } = await supabase
      .from("urls")
      .insert({
        user_id: user.user_id,
        short_code: shortCode,
        long_url: longUrl,
        expires_at: expiresAt,
      })
      .select("short_code, long_url, clicks, expires_at")
      .single();

    if (error) {
      return NextResponse.json({ error: "Gagal menyimpan URL" }, { status: 500 });
    }

    const siteUrl = getSiteUrl();

    const qrDataUrl = await QRCode.toDataURL(longUrl, {
      width: 300,
      margin: 2,
    });

    return NextResponse.json({
      short_url: `${siteUrl}/${data.short_code}`,
      short_code: data.short_code,
      long_url: data.long_url,
      qr_url: qrDataUrl,
      clicks: data.clicks,
      expires_at: data.expires_at,
    });
  } catch {
    return NextResponse.json({ error: "Gagal membuat short link" }, { status: 500 });
  }
}