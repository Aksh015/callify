import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type ProfileRecord = { id: string; plan_status: string };
type TierRecord = { tier: number };

async function getActiveTier(admin: ReturnType<typeof getSupabaseAdmin>, userId: string) {
  const { data } = await admin
    .from("payments")
    .select("tier")
    .eq("user_id", userId)
    .eq("status", "SUCCESS")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<TierRecord>();

  return data?.tier || 0;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = getSupabaseAdmin();

    const { data: profile } = await admin
      .from("business_profiles")
      .select("id, plan_status")
      .eq("user_id", user.id)
      .maybeSingle<ProfileRecord>();

    if (!profile || profile.plan_status !== "active") {
      return NextResponse.json({ error: "Complete payment before using dashboard features." }, { status: 403 });
    }

    const tier = await getActiveTier(admin, user.id);
    if (tier < 2) {
      return NextResponse.json({ error: "WhatsApp settings are available from Tier 2." }, { status: 403 });
    }

    const body = (await request.json()) as { whatsappEnabled?: boolean };
    const whatsappEnabled = Boolean(body.whatsappEnabled);

    const { error } = await admin.from("feature_flags").upsert(
      {
        business_profile_id: profile.id,
        whatsapp_enabled: whatsappEnabled,
      },
      { onConflict: "business_profile_id" },
    );

    if (error) {
      return NextResponse.json({ error: `Failed to update flags: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ ok: true, whatsappEnabled });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update features.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
