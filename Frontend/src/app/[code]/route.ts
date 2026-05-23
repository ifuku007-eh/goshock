import { NextResponse } from "next/server";
import { supabase } from "@/lib/server/db";

export async function GET(
  _req: Request,
  { params }: { params: { code: string } }
) {
  const { data } = await supabase
    .from("urls")
    .select("short_code, long_url, expires_at")
    .eq("short_code", params.code)
    .single();

  if (!data) {
    return new NextResponse("Link tidak ditemukan", { status: 404 });
  }

  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
    return new NextResponse("Link sudah kadaluarsa", { status: 410 });
  }

  await supabase.rpc("increment_click_count", {
    code: params.code,
  });

  await supabase.from("click_logs").insert({
    short_code: params.code,
  });

  return NextResponse.redirect(data.long_url, 302);
}