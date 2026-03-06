import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ingestKnowledgeBase } from "@/lib/kb/indexer";

export const runtime = "nodejs";

type IncomingBusiness = {
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  city: string;
  category: "doctor" | "hotel";
};

function generateIndianNumber() {
  const first = 6 + Math.floor(Math.random() * 4);
  const remaining = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10)).join("");
  return `+91 ${first}${remaining.slice(0, 4)} ${remaining.slice(4)}`;
}

function createBusinessSlug(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-") || "business"
  );
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

    const contentType = request.headers.get("content-type") || "";
    let business: IncomingBusiness;
    let tier: number;
    let integrationConfig: Record<string, unknown> = {};
    let kbFileObjects: File[] = [];
    let kbFilesMeta: Array<{ name: string; size: number; type: string }> = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      business = JSON.parse(String(formData.get("business") || "{}"));
      tier = Number(formData.get("tier") || "1");
      integrationConfig = JSON.parse(
        String(formData.get("integrationConfig") || "{}")
      );
      kbFileObjects = formData
        .getAll("kbFiles")
        .filter((item): item is File => item instanceof File);
      kbFilesMeta = kbFileObjects.map((f) => ({
        name: f.name,
        size: f.size,
        type: f.type,
      }));
    } else {
      const json = await request.json();
      business = json.business;
      tier = json.tier || 1;
      integrationConfig = json.integrationConfig || {};
    }

    // Validate
    if (!business?.businessName?.trim())
      return NextResponse.json({ error: "Business name is required." }, { status: 400 });
    if (!business?.ownerName?.trim())
      return NextResponse.json({ error: "Owner name is required." }, { status: 400 });
    if (!business?.email?.trim())
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    if (!business?.phone?.trim())
      return NextResponse.json({ error: "Phone is required." }, { status: 400 });
    if (!business?.city?.trim())
      return NextResponse.json({ error: "City is required." }, { status: 400 });
    if (tier < 1 || tier > 4)
      return NextResponse.json({ error: "Tier must be 1-4." }, { status: 400 });

    const provisionedNumber = generateIndianNumber();
    const enableDashboard =
      tier === 3 || (tier === 4 && Boolean(integrationConfig?.enableDashboard));
    const dashboardUrl = enableDashboard
      ? `https://${createBusinessSlug(business.businessName)}.mydomain.in`
      : null;

    // Check if user already has a profile — upsert
    const { data: existing } = await supabase
      .from("business_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    let profileId: string;

    if (existing) {
      const { data: updated, error: updateErr } = await supabase
        .from("business_profiles")
        .update({
          business_name: business.businessName,
          owner_name: business.ownerName,
          email: business.email,
          phone: business.phone,
          city: business.city,
          category: business.category,
          tier,
          kb_files: kbFilesMeta,
          integration_config: integrationConfig,
          provisioned_number: provisionedNumber,
          dashboard_url: dashboardUrl,
        })
        .eq("id", existing.id)
        .select("id")
        .single();

      if (updateErr) throw updateErr;
      profileId = updated!.id;
    } else {
      const { data: created, error: insertErr } = await supabase
        .from("business_profiles")
        .insert({
          user_id: user.id,
          business_name: business.businessName,
          owner_name: business.ownerName,
          email: business.email,
          phone: business.phone,
          city: business.city,
          category: business.category,
          tier,
          kb_files: kbFilesMeta,
          integration_config: integrationConfig,
          provisioned_number: provisionedNumber,
          dashboard_url: dashboardUrl,
        })
        .select("id")
        .single();

      if (insertErr) throw insertErr;
      profileId = created!.id;
    }

    // Ingest KB files
    let kbIngestion: { filesProcessed: number; chunksCreated: number } | null = null;
    if (kbFileObjects.length > 0) {
      kbIngestion = await ingestKnowledgeBase(profileId, kbFileObjects);

      await supabase
        .from("business_profiles")
        .update({ knowledge_base_id: profileId })
        .eq("id", profileId);
    }

    return NextResponse.json({
      onboardingId: profileId,
      businessId: profileId,
      knowledgeBaseId: profileId,
      provisionedNumber,
      dashboardUrl,
      tier,
      kbIngestion,
    });
  } catch (error) {
    console.error("onboarding create failed", error);
    return NextResponse.json({ error: "Failed to save onboarding." }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("business_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    const { data: payments } = await supabase
      .from("payments")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    return NextResponse.json({ profile, payments });
  } catch (error) {
    console.error("onboarding fetch failed", error);
    return NextResponse.json({ error: "Failed to fetch data." }, { status: 500 });
  }
}
