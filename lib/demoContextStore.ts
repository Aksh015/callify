import { getSupabaseAdmin } from "@/lib/supabase/admin";

const DEFAULT_DEMO_CONTEXT =
  "Welcome to Callify Demo! I'm a demo assistant that can answer questions about business information. Try asking me about business hours, services, pricing, or location. Note: This is a demo environment - I cannot process appointments, orders, or access any real customer data.";
const DEMO_CONTEXT_SESSION_HASH = "__demo_global_context__";

let demoContextTextCache: string | null = null;

function normalizeContext(nextValue: string) {
  const cleaned = nextValue.trim();
  return cleaned.length > 0 ? cleaned : DEFAULT_DEMO_CONTEXT;
}

async function readFromSupabase() {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("guest_sessions")
    .select("custom_context")
    .eq("session_token_hash", DEMO_CONTEXT_SESSION_HASH)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const context = (data?.custom_context || {}) as { text?: string };
  return normalizeContext(String(context.text || ""));
}

async function writeToSupabase(text: string) {
  const admin = getSupabaseAdmin();
  const expiresAt = new Date(Date.now() + 3650 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await admin.from("guest_sessions").upsert(
    {
      session_token_hash: DEMO_CONTEXT_SESSION_HASH,
      sample_type: "demo-global",
      custom_context: { text },
      expires_at: expiresAt,
    },
    { onConflict: "session_token_hash" },
  );

  if (error) {
    throw error;
  }
}

export async function getDemoContextText() {
  if (demoContextTextCache) {
    return demoContextTextCache;
  }

  try {
    const persisted = await readFromSupabase();
    demoContextTextCache = persisted;
    return persisted;
  } catch {
    demoContextTextCache = DEFAULT_DEMO_CONTEXT;
    return demoContextTextCache;
  }
}

export async function setDemoContextText(nextValue: string) {
  const normalized = normalizeContext(nextValue);
  demoContextTextCache = normalized;

  try {
    await writeToSupabase(normalized);
  } catch {
    // Keep working with cached value if DB is unavailable.
  }

  return normalized;
}

export function getDefaultDemoContextText() {
  return DEFAULT_DEMO_CONTEXT;
}
