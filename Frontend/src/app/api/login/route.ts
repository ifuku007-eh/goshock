import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabase } from "@/lib/server/db";
import { generateToken } from "@/lib/server/auth";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    const cleanEmail = String(email || "").trim().toLowerCase();

    const { data: user } = await supabase
      .from("users")
      .select("id, username, email, password")
      .eq("email", cleanEmail)
      .single();

    if (!user) {
      return NextResponse.json({ error: "Email atau password salah" }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return NextResponse.json({ error: "Email atau password salah" }, { status: 401 });
    }

    const token = generateToken(user.id, user.username);

    return NextResponse.json({
      message: "Login berhasil",
      token,
      username: user.username,
      user_id: user.id,
    });
  } catch {
    return NextResponse.json({ error: "Login gagal" }, { status: 500 });
  }
}