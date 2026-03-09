import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase";

const CASHFREE_BASE =
  process.env.CASHFREE_ENVIRONMENT === "production"
    ? "https://api.cashfree.com/pg"
    : "https://sandbox.cashfree.com/pg";

const PLAN_AMOUNTS: Record<number, number> = {
  1: 6,  // Starter — ₹6/month
  2: 7,  // Pro     — ₹7/month
};

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    // 2. Parse body
    const { businessId, tier, isUpgrade } = (await req.json()) as {
      businessId: string;
      tier: 1 | 2;
      isUpgrade?: boolean;
    };

    if (!businessId || !tier || !PLAN_AMOUNTS[tier]) {
      return NextResponse.json({ error: "Invalid request parameters." }, { status: 400 });
    }

    // 3. Look up business to verify ownership
    const { data: business, error: bizError } = await supabaseAdmin
      .from("businesses")
      .select("id, email, name, plan")
      .eq("id", businessId)
      .eq("user_id", user.id) // ensure this business belongs to the authenticated user
      .single();

    if (bizError || !business) {
      return NextResponse.json({ error: "Business not found." }, { status: 404 });
    }

    // 4. Build a unique order ID (prefix + timestamp + random)
    const orderId = `CFY-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    let amount = PLAN_AMOUNTS[tier];
    const planName = tier === 1 ? "Starter" : "Pro";

    if (isUpgrade && tier === 2 && business.plan === 'starter') {
        amount = 1; // 1 rupee differential upgrade from Starter to Pro
    }

    // 5. Create Cashfree order via REST API
    const cfResponse = await fetch(`${CASHFREE_BASE}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-version": "2023-08-01",
        "x-client-id": process.env.CASHFREE_APP_ID!,
        "x-client-secret": process.env.CASHFREE_SECRET_KEY!,
      },
      body: JSON.stringify({
        order_id: orderId,
        order_amount: amount,
        order_currency: "INR",
        order_note: `Callify AI — ${planName} Plan (Hotel)`,
        customer_details: {
          customer_id: user.id,
          customer_email: business.email,
          customer_name: business.name ?? business.email,
          customer_phone: "9999999999", // placeholder — no phone at this stage
        },
        order_meta: {
          return_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/billing/callback?order_id={order_id}&business_id=${businessId}`,
          notify_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/billing/webhook`,
        },
      }),
    });

    const cfData = await cfResponse.json();

    if (!cfResponse.ok || !cfData.payment_session_id) {
      console.error("[billing/checkout] Cashfree error:", cfData);
      return NextResponse.json(
        { error: cfData.message || "Failed to create Cashfree order." },
        { status: 502 }
      );
    }

    // 6. Persist the order ID on the business row for later verification
    await supabaseAdmin
      .from("businesses")
      .update({ cashfree_order_id: orderId })
      .eq("id", businessId);

    return NextResponse.json({
      orderId,
      paymentSessionId: cfData.payment_session_id,
    });
  } catch (err) {
    console.error("[billing/checkout] unexpected error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
