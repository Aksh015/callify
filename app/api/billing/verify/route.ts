import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCashfree } from "@/lib/cashfree/client";

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orderId } = (await request.json()) as { orderId: string };

  if (!orderId) {
    return NextResponse.json(
      { error: "orderId is required." },
      { status: 400 }
    );
  }

  // Fetch our payment record
  const { data: payment } = await supabase
    .from("payments")
    .select("*")
    .eq("cf_order_id", orderId)
    .eq("user_id", user.id)
    .single();

  if (!payment) {
    return NextResponse.json(
      { error: "Payment not found." },
      { status: 404 }
    );
  }

  try {
    const cashfree = getCashfree();
    const response = await cashfree.PGFetchOrder(orderId);
    const orderData = response.data;

    const cfStatus = orderData.order_status;
    let newStatus: string;

    if (cfStatus === "PAID") {
      newStatus = "SUCCESS";
    } else if (cfStatus === "EXPIRED" || cfStatus === "CANCELLED") {
      newStatus = "FAILED";
    } else {
      newStatus = "PENDING";
    }

    // Update payment record
    await supabase
      .from("payments")
      .update({
        status: newStatus,
        cf_payment_id:
          orderData.cf_order_id?.toString() || null,
        payment_method: (orderData as any).payment_group || null,
      })
      .eq("cf_order_id", orderId);

    // If paid, update business profile tier
    if (newStatus === "SUCCESS") {
      await supabase
        .from("business_profiles")
        .update({ tier: payment.tier })
        .eq("id", payment.business_id);
    }

    return NextResponse.json({
      orderId,
      status: newStatus,
      amount: payment.amount,
      tier: payment.tier,
    });
  } catch (error: unknown) {
    console.error("Cashfree verify failed:", error);
    const message =
      error instanceof Error ? error.message : "Payment verification failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
