import { NextResponse } from "next/server";
import { getCashfree } from "@/lib/cashfree/client";
import { createClient as createAdminClient } from "@supabase/supabase-js";

// Use service role for webhook — no user session available
function getAdminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const timestamp = request.headers.get("x-webhook-timestamp") || "";
    const signature = request.headers.get("x-webhook-signature") || "";

    // Verify webhook signature
    const cashfree = getCashfree();
    try {
      cashfree.PGVerifyWebhookSignature(signature, rawBody, timestamp);
    } catch {
      console.error("Cashfree webhook signature verification failed");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const eventType = payload?.type;
    const orderData = payload?.data?.order;

    if (!orderData?.order_id) {
      return NextResponse.json({ ok: true });
    }

    const orderId = orderData.order_id;
    const supabase = getAdminSupabase();

    if (
      eventType === "PAYMENT_SUCCESS_WEBHOOK" ||
      eventType === "ORDER_PAID_WEBHOOK"
    ) {
      // Update payment to SUCCESS
      const { data: payment } = await supabase
        .from("payments")
        .update({
          status: "SUCCESS",
          cf_payment_id: orderData.cf_order_id?.toString() || null,
          payment_method: payload?.data?.payment?.payment_group || null,
        })
        .eq("cf_order_id", orderId)
        .select("business_id, tier")
        .single();

      // Update business profile tier
      if (payment) {
        await supabase
          .from("business_profiles")
          .update({ tier: payment.tier })
          .eq("id", payment.business_id);
      }
    } else if (
      eventType === "PAYMENT_FAILED_WEBHOOK" ||
      eventType === "ORDER_EXPIRED_WEBHOOK"
    ) {
      await supabase
        .from("payments")
        .update({ status: "FAILED" })
        .eq("cf_order_id", orderId);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ ok: true }); // Return 200 to prevent retries
  }
}
