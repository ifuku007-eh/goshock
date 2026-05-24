import { NextResponse } from "next/server";
import { supabase } from "@/lib/server/db";

export async function GET() {
  const { data: urls, error: urlsError } = await supabase
    .from("urls")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: users, error: usersError } = await supabase
    .from("users")
    .select("id, username, email, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  return NextResponse.json({
    supabase_url_exists: !!process.env.SUPABASE_URL,
    service_key_exists: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    users_error: usersError?.message || null,
    urls_error: urlsError?.message || null,
    users,
    urls,
  });
}