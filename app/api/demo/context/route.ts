import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { DEFAULT_DEMO_CONTEXT } from "@/lib/demo-context";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// GET — Fetch the current demo context for a business
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get("businessId");

    if (!businessId) {
      // Return default context if no business ID
      return NextResponse.json({ context: DEFAULT_DEMO_CONTEXT, isDefault: true });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: business } = await supabase
      .from("businesses")
      .select("demo_context")
      .eq("id", businessId)
      .single();

    if (business?.demo_context) {
      return NextResponse.json({ context: business.demo_context, isDefault: false });
    }

    return NextResponse.json({ context: DEFAULT_DEMO_CONTEXT, isDefault: true });
  } catch (err: any) {
    console.error("Fetch context error:", err);
    return NextResponse.json({ context: DEFAULT_DEMO_CONTEXT, isDefault: true });
  }
}

// POST — Save custom demo context for a business
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { businessId, context } = body;

    if (!businessId) {
      return NextResponse.json({ error: "Business ID is required" }, { status: 400 });
    }

    if (!context || typeof context !== "string") {
      return NextResponse.json({ error: "Context text is required" }, { status: 400 });
    }

    if (context.length > 50000) {
      return NextResponse.json({ error: "Context is too long (max 50,000 characters)" }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error } = await supabase
      .from("businesses")
      .update({ demo_context: context })
      .eq("id", businessId);

    if (error) {
      console.error("Save context error:", error);
      return NextResponse.json({ error: "Failed to save context" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "AI context updated successfully" });
  } catch (err: any) {
    console.error("Save context error:", err);
    return NextResponse.json({ error: "Failed to save context" }, { status: 500 });
  }
}
