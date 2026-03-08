import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type ProfileRecord = { id: string; plan_status: string };
type TierRecord = { tier: number };

type CustomTool = {
  name: string;
  description: string;
  prompt: string;
};

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
    if (tier < 4) {
      return NextResponse.json({ error: "Custom MCP tools are available only on Tier 4." }, { status: 403 });
    }

    const body = (await request.json()) as { tools?: CustomTool[] };
    const tools = Array.isArray(body.tools) ? body.tools : [];

    const sanitizedTools = tools
      .map((tool) => ({
        name: String(tool.name || "").trim(),
        description: String(tool.description || "").trim(),
        prompt: String(tool.prompt || "").trim(),
      }))
      .filter((tool) => tool.name && tool.prompt)
      .slice(0, 20);

    const { error } = await admin.from("business_facts").upsert(
      {
        business_profile_id: profile.id,
        fact_key: "custom_mcp_tools",
        fact_value: { tools: sanitizedTools },
      },
      { onConflict: "business_profile_id,fact_key" },
    );

    if (error) {
      return NextResponse.json({ error: `Failed to save tools: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ ok: true, tools: sanitizedTools });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to save custom tools.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
