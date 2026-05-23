import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabase } from "@/lib/server/db";
import { generateToken } from "@/lib/server/auth";

export async function POST(req: Request) {
  try {
    const { username, email, password } = await req.json();

    const cleanUsername = String(username || "").trim();
    const cleanEmail = String(email || "").trim().toLowerCase();

    if (cleanUsername.length < 3) {
      return NextResponse.json({ error: "Username minimal 3 karakter" }, { status: 400 });
    }

    if (!cleanEmail.includes("@")) {
      return NextResponse.json({ error: "Email tidak valid" }, { status: 400 });
    }

    if (String(password || "").length < 6) {
      return NextResponse.json({ error: "Password minimal 6 karakter" }, { status: 400 });
    }

    const hashed = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
      .from("users")
      .insert({
        username: cleanUsername,
        email: cleanEmail,
        password: hashed,
      })
      .select("id, username")
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Username atau email sudah digunakan" },
        { status: 409 }
      );
    }

    const token = generateToken(data.id, data.username);

    return NextResponse.json(
      {
        message: "Akun berhasil dibuat",
        token,
        username: data.username,
        user_id: data.id,
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "Gagal membuat akun" }, { status: 500 });
  }
}