import { NextResponse } from "next/server";
import { getBearerToken, verifyToken } from "@/lib/server/auth";
import { supabase } from "@/lib/server/db";

export async function DELETE(
  req: Request,
  { params }: { params: { code: string } }
) {
  try {
    const token = getBearerToken(req);

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = verifyToken(token);

    const { error } = await supabase
      .from("urls")
      .delete()
      .eq("short_code", params.code)
      .eq("user_id", user.user_id);

    if (error) {
      return NextResponse.json({ error: "Gagal menghapus" }, { status: 500 });
    }

    return NextResponse.json({ message: "Berhasil dihapus" });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}