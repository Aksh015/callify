import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { RuntimeBusinessContext, RuntimeCustomTool } from "@/lib/mcp/router";

function normalizePhone(value: string) {
  return value.replace(/[^+\d]/g, "").trim();
}

type AllocationRow = { business_profile_id: string; phone_number: string; twilio_account_label: string };
type ProfileRow = {
  id: string;
  business_name: string;
  category: string;
  city: string;
  phone: string;
  timezone: string;
  system_prompt: string | null;
};

type FlagRow = {
  book_appointment_enabled: boolean;
  whatsapp_enabled: boolean;
};

export async function loadRuntimeContextFromInboundNumber(toNumber: string): Promise<RuntimeBusinessContext> {
  const normalized = normalizePhone(toNumber || "");
  const admin = getSupabaseAdmin();

  const candidates = Array.from(
    new Set([
      normalized,
      normalized.replace(/^\+/, ""),
      normalized.startsWith("+") ? normalized : `+${normalized}`,
    ]),
  ).filter(Boolean);

  let businessProfileId = "";

  if (candidates.length > 0) {
    const { data: allocations } = await admin
      .from("telephony_allocations")
      .select("business_profile_id, phone_number, twilio_account_label")
      .in("phone_number", candidates)
      .eq("status", "assigned")
      .limit(1);

    const alloc = (allocations?.[0] || null) as AllocationRow | null;
    if (alloc?.business_profile_id) {
      businessProfileId = alloc.business_profile_id;
    }
  }

  if (!businessProfileId) {
    const { data: latestProfile } = await admin
      .from("business_profiles")
      .select("id")
      .eq("plan_status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ id: string }>();

    businessProfileId = latestProfile?.id || "";
  }

  if (!businessProfileId) {
    return {};
  }

  const { data: profile } = await admin
    .from("business_profiles")
    .select("id, business_name, category, city, phone, timezone, system_prompt")
    .eq("id", businessProfileId)
    .maybeSingle<ProfileRow>();

  const { data: services } = await admin
    .from("services")
    .select("name, price")
    .eq("business_profile_id", businessProfileId)
    .limit(20);

  const { data: appointments } = await admin
    .from("appointment_slots")
    .select("slot_date, slot_time, customer_name")
    .eq("business_profile_id", businessProfileId)
    .eq("status", "booked")
    .limit(100);

  const { data: customToolsFact } = await admin
    .from("business_facts")
    .select("fact_value")
    .eq("business_profile_id", businessProfileId)
    .eq("fact_key", "custom_mcp_tools")
    .maybeSingle<{ fact_value: { tools?: RuntimeCustomTool[] } }>();

  const { data: flags } = await admin
    .from("feature_flags")
    .select("book_appointment_enabled, whatsapp_enabled")
    .eq("business_profile_id", businessProfileId)
    .maybeSingle<FlagRow>();

  const { data: latestPayment } = await admin
    .from("payments")
    .select("tier")
    .eq("business_profile_id", businessProfileId)
    .eq("status", "SUCCESS")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ tier: number }>();

  const tier = latestPayment?.tier || 1;
  const allowedToolNames = ["search_knowledge", "get_business_info", "get_opening_hours", "check_available_slots", "get_order_status"];

  if (flags?.book_appointment_enabled || tier >= 2) {
    allowedToolNames.push("book_appointment");
  }

  if (tier >= 2 && flags?.whatsapp_enabled) {
    allowedToolNames.push("send_whatsapp", "send_email");
  }

  const customTools = Array.isArray(customToolsFact?.fact_value?.tools)
    ? customToolsFact?.fact_value?.tools
        .map((tool) => ({
          name: String(tool.name || "").trim(),
          description: String(tool.description || "").trim(),
          prompt: String(tool.prompt || "").trim(),
          requiredSlots: Array.isArray(tool.requiredSlots)
            ? tool.requiredSlots.map((slot) => String(slot).trim()).filter(Boolean)
            : [],
          missingSlotPrompts: tool.missingSlotPrompts || {},
        }))
        .filter((tool) => tool.name && tool.prompt)
    : [];

  if (tier >= 4) {
    for (const tool of customTools) {
      const normalizedName = `custom_${tool.name.toLowerCase().replace(/[^a-z0-9_]+/g, "_")}`;
      allowedToolNames.push(normalizedName);
    }
  }

  return {
    businessProfileId,
    systemPrompt: profile?.system_prompt || undefined,
    allowedToolNames,
    confirmActions: ["book_appointment"],
    businessInfo: {
      name: profile?.business_name || "",
      address: [profile?.city, profile?.category].filter(Boolean).join(" • "),
      openingHours: "10:00 AM - 8:00 PM",
      servicePricing:
        services?.map((service) => ({
          service: String(service.name || ""),
          price: `${service.price} INR`,
        })) || [],
    },
    appointments:
      appointments?.map((item) => ({
        date: String(item.slot_date),
        time: String(item.slot_time),
        name: String(item.customer_name || ""),
      })) || [],
    customTools,
  };
}
