import { NextResponse } from "next/server";
import { getBearerToken, verifyToken } from "@/lib/server/auth";

export async function GET(req: Request) {
  try {
    const token = getBearerToken(req);

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = verifyToken(token);

    return NextResponse.json({
      user_id: user.user_id,
      username: user.username,
      time: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}