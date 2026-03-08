import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const COOKIE_NAME = "vd_guest_token";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const store = await cookies();
    const token = store.get(COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ ok: true, migrated: false, reason: "No guest session" });
    }

    const admin = getSupabaseAdmin();
    const tokenHash = hashToken(token);

    const { data: guest } = await admin
      .from("guest_sessions")
      .select("id, custom_context")
      .eq("session_token_hash", tokenHash)
      .maybeSingle();

    if (!guest?.id) {
      return NextResponse.json({ ok: true, migrated: false, reason: "Guest row not found" });
    }

    const context = (guest.custom_context || {}) as {
      businessName?: string;
      address?: string;
      openingHours?: string;
    };

    const { data: profile, error: profileError } = await admin
      .from("business_profiles")
      .upsert(
        {
          user_id: user.id,
          business_name: context.businessName || "My Business",
          category: "other",
          city: context.address || "",
        },
        { onConflict: "user_id" },
      )
      .select("id")
      .single();

    if (profileError || !profile?.id) {
      return NextResponse.json(
        { ok: false, error: profileError?.message || "Failed to upsert business profile" },
        { status: 500 },
      );
    }

    const { data: guestMessages } = await admin
      .from("guest_messages")
      .select("role, message, intent, tool_used, created_at")
      .eq("guest_session_id", guest.id)
      .order("created_at", { ascending: true });

    await admin
      .from("onboarding_drafts")
      .upsert(
        {
          business_profile_id: profile.id,
          current_step: 0,
          draft_data: {
            migratedFromDemo: true,
            context,
            messages: guestMessages || [],
          },
          completed_steps: [],
        },
        { onConflict: "business_profile_id" },
      );

    await admin
      .from("guest_sessions")
      .update({
        migrated_to_user_id: user.id,
        migrated_to_business_profile_id: profile.id,
      })
      .eq("id", guest.id);

    return NextResponse.json({ ok: true, migrated: true, businessProfileId: profile.id });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to migrate demo state." },
      { status: 500 },
    );
  }
}
