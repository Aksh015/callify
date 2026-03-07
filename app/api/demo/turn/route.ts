import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { runRuntimeTurn } from "@/lib/runtime/orchestrator";
import type { RuntimeBusinessContext } from "@/lib/mcp/router";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getDemoContextText } from "@/lib/demoContextStore";

type DemoTurnRequest = {
  message: string;
  context?: RuntimeBusinessContext;
};

const COOKIE_NAME = "vd_guest_token";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as DemoTurnRequest;
    if (!body?.message?.trim()) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    const context: RuntimeBusinessContext = {
      customContextText: getDemoContextText(),
      ...(body.context || {}),
    };

    const result = await runRuntimeTurn({
      utterance: body.message,
      languageCode: "en-IN",
      context,
    });

    try {
      const store = await cookies();
      const token = store.get(COOKIE_NAME)?.value;
      if (token) {
        const admin = getSupabaseAdmin();
        const tokenHash = hashToken(token);
        const { data: session } = await admin
          .from("guest_sessions")
          .select("id")
          .eq("session_token_hash", tokenHash)
          .maybeSingle();

        if (session?.id) {
          await admin.from("guest_messages").insert([
            {
              guest_session_id: session.id,
              role: "user",
              message: body.message,
              intent: null,
              tool_used: null,
            },
            {
              guest_session_id: session.id,
              role: "assistant",
              message: result.responseText,
              intent: result.intent,
              tool_used: result.action,
            },
          ]);
        }
      }
    } catch {
      // Ignore demo persistence failures.
    }

    return NextResponse.json({
      responseText: result.responseText,
      intent: result.intent,
      action: result.action,
      mcp: result.mcp,
      slots: result.slots,
      requiresInput: result.requiresInput,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process demo turn." },
      { status: 500 },
    );
  }
}
