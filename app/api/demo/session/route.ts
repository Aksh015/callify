import { createHash, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type DemoContext = {
  sampleType?: string;
  businessName?: string;
  openingHours?: string;
  address?: string;
  servicePricing?: Array<{ service: string; price: string }>;
  knowledgeBaseId?: string;
};

const COOKIE_NAME = "vd_guest_token";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function getOrCreateGuestToken() {
  const store = await cookies();
  const current = store.get(COOKIE_NAME)?.value;

  if (current) {
    return current;
  }

  const token = `${randomUUID()}-${randomUUID()}`;
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: COOKIE_MAX_AGE_SECONDS,
    path: "/",
  });
  return token;
}

export async function GET() {
  try {
    const token = await getOrCreateGuestToken();
    const tokenHash = hashToken(token);

    try {
      const admin = getSupabaseAdmin();
      const { data } = await admin
        .from("guest_sessions")
        .select("id, sample_type, custom_context, expires_at")
        .eq("session_token_hash", tokenHash)
        .maybeSingle();

      return NextResponse.json({
        ok: true,
        session: data || null,
      });
    } catch {
      return NextResponse.json({ ok: true, session: null });
    }
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to load demo session." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      sampleType?: string;
      customContext?: DemoContext;
    };

    const token = await getOrCreateGuestToken();
    const tokenHash = hashToken(token);

    try {
      const admin = getSupabaseAdmin();
      const expiresAt = new Date(Date.now() + COOKIE_MAX_AGE_SECONDS * 1000).toISOString();

      const { data: existing } = await admin
        .from("guest_sessions")
        .select("id")
        .eq("session_token_hash", tokenHash)
        .maybeSingle();

      if (existing?.id) {
        await admin
          .from("guest_sessions")
          .update({
            sample_type: body.sampleType || "demo-barber",
            custom_context: body.customContext || {},
            expires_at: expiresAt,
          })
          .eq("id", existing.id);
      } else {
        await admin.from("guest_sessions").insert({
          session_token_hash: tokenHash,
          sample_type: body.sampleType || "demo-barber",
          custom_context: body.customContext || {},
          expires_at: expiresAt,
        });
      }
    } catch {
      // Demo should still work without DB persistence.
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to save demo session." },
      { status: 500 },
    );
  }
}
