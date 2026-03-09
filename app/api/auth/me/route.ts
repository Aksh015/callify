import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Look up business by user_id (includes hotel name via join)
  const { data: biz } = await supabaseAdmin
    .from("businesses")
    .select(`
      id,
      plan,
      plan_status,
      assigned_number,
      email,
      hotels ( id, name, address, phone_number, timezone )
    `)
    .eq("user_id", user.id)
    .maybeSingle();

  const hotel = Array.isArray(biz?.hotels)
    ? biz?.hotels[0]
    : biz?.hotels ?? null;

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.full_name ?? user.email,
      avatar: user.user_metadata?.avatar_url ?? null,
    },
    profile: {
      business_id: biz?.id ?? null,
      plan: biz?.plan ?? null,
      plan_status: biz?.plan_status ?? null,
      assigned_number: biz?.assigned_number ?? null,
      is_mapped: biz?.plan_status === "active",
    },
    hotel: hotel
      ? {
          id: hotel.id,
          name: hotel.name,
          city: hotel.address,
          phone: hotel.phone_number,
          timezone: hotel.timezone,
        }
      : null,
  });
}
