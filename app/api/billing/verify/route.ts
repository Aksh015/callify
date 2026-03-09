import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase";

const CASHFREE_BASE =
  process.env.CASHFREE_ENVIRONMENT === "production"
    ? "https://api.cashfree.com/pg"
    : "https://sandbox.cashfree.com/pg";

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
    const { orderId, businessId, tier } = (await req.json()) as {
      orderId: string;
      businessId: string;
      tier?: 1 | 2;
    };

    if (!orderId || !businessId) {
      return NextResponse.json({ error: "Missing orderId or businessId." }, { status: 400 });
    }

    // 3. Verify business ownership
    const { data: business, error: bizError } = await supabaseAdmin
      .from("businesses")
      .select("id, plan")
      .eq("id", businessId)
      .eq("user_id", user.id)
      .single();

    if (bizError || !business) {
      return NextResponse.json({ error: "Business not found." }, { status: 404 });
    }

    // 4. Fetch payment status from Cashfree
    const cfRes = await fetch(`${CASHFREE_BASE}/orders/${orderId}/payments`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-api-version": "2023-08-01",
        "x-client-id": process.env.CASHFREE_APP_ID!,
        "x-client-secret": process.env.CASHFREE_SECRET_KEY!,
      },
    });

    const cfPayments = await cfRes.json();

    if (!cfRes.ok) {
      console.error("[billing/verify] Cashfree fetch error:", cfPayments);
      return NextResponse.json(
        { error: cfPayments.message || "Failed to fetch payment status." },
        { status: 502 }
      );
    }

    // cfPayments is an array of payment attempts; find any successful one
    const payments = Array.isArray(cfPayments) ? cfPayments : [cfPayments];
    const successfulPayment = payments.find(
      (p: any) => p.payment_status === "SUCCESS"
    );

    if (!successfulPayment) {
      // Check if any payment is pending
      const pendingPayment = payments.find(
        (p: any) => p.payment_status === "PENDING"
      );
      if (pendingPayment) {
        return NextResponse.json({ status: "PENDING" });
      }
      return NextResponse.json({ status: "FAILED" });
    }

    // 5. Payment confirmed → activate the plan
    const updatePayload: any = { plan_status: "active" };
    if (tier) {
      updatePayload.plan = tier === 1 ? "starter" : "pro";
    }

    const { error: updateError } = await supabaseAdmin
      .from("businesses")
      .update(updatePayload)
      .eq("id", businessId);

    if (updateError) {
      console.error("[billing/verify] plan activation error:", updateError);
      return NextResponse.json(
        { error: "Payment received but failed to activate plan. Please contact support." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: "SUCCESS",
      plan: business.plan,
      paymentId: successfulPayment.cf_payment_id,
    });
  } catch (err) {
    console.error("[billing/verify] unexpected error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred during verification." },
      { status: 500 }
    );
  }
}
