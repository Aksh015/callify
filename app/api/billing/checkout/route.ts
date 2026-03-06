import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCashfree, getTierAmount } from "@/lib/cashfree/client";

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { businessId, tier } = (await request.json()) as {
    businessId: string;
    tier: number;
  };

  if (!businessId || !tier || tier < 1 || tier > 4) {
    return NextResponse.json(
      { error: "Valid businessId and tier (1-4) are required." },
      { status: 400 }
    );
  }

  const amount = getTierAmount(tier);
  if (!amount) {
    return NextResponse.json({ error: "Invalid tier." }, { status: 400 });
  }

  // Verify the business belongs to this user
  const { data: profile } = await supabase
    .from("business_profiles")
    .select("id, business_name, tier")
    .eq("id", businessId)
    .eq("user_id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json(
      { error: "Business not found." },
      { status: 404 }
    );
  }

  const orderId = `VD_${businessId.slice(0, 8)}_${Date.now()}`;

  try {
    const cashfree = getCashfree();

    const orderRequest = {
      order_amount: amount,
      order_currency: "INR",
      order_id: orderId,
      customer_details: {
        customer_id: user.id.replace(/-/g, "").slice(0, 20),
        customer_email: user.email!,
        customer_phone: "9999999999", // placeholder - will be updated from profile
      },
      order_meta: {
        return_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/onboarding?payment_status=success&order_id=${orderId}`,
      },
      order_note: `VoiceDesk Tier ${tier} - ${profile.business_name}`,
    };

    const response = await cashfree.PGCreateOrder(orderRequest);
    const orderData = response.data;

    // Save payment record
    await supabase.from("payments").insert({
      business_id: businessId,
      user_id: user.id,
      cf_order_id: orderId,
      payment_session_id: orderData.payment_session_id,
      amount,
      currency: "INR",
      status: "PENDING",
      tier,
    });

    return NextResponse.json({
      orderId,
      paymentSessionId: orderData.payment_session_id,
      amount,
      tier,
    });
  } catch (error: unknown) {
    console.error("Cashfree create order failed:", error);
    const message =
      error instanceof Error ? error.message : "Payment initiation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
