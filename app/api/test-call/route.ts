import { NextRequest, NextResponse } from "next/server";
import { twilioStarterClient } from "@/lib/twilio";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const to = searchParams.get("to");

  if (!to) {
    return NextResponse.json(
      { error: "Missing 'to' phone number. Usage: /api/test-call?to=+919876543210" },
      { status: 400 }
    );
  }

  if (!twilioStarterClient) {
    return NextResponse.json(
      { error: "Twilio Starter Client is not configured in your environment variables." },
      { status: 500 }
    );
  }

  const fromNumber = process.env.TWILIO_STARTER_NUMBER!;
  // We must use your live Vercel URL here so Twilio can reach it
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://callify-eta.vercel.app";

  try {
    const call = await twilioStarterClient.calls.create({
      url: `${appUrl}/api/twilio/incoming-call`, // The AI greeting we built earlier
      to: to, // Your personal verified Indian number
      from: fromNumber, // The Twilio Starter number
    });

    return NextResponse.json({
      success: true,
      message: `Successfully initiated call to ${to}. Please pick up your phone!`,
      callSid: call.sid,
    });
  } catch (error: any) {
    console.error("[Test Call Error]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
