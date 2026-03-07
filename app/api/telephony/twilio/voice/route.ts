import { gatherSpeechTwiml, twimlResponse } from "@/lib/telephony/twiml";

export const runtime = "nodejs";

function normalizePhone(value: string) {
  return value.replace(/[^+\d]/g, "").trim();
}

function isAllowedTwilioSource(form: FormData) {
  const expectedAccountSid = process.env.TWILIO_DEMO_ACCOUNT_SID?.trim();
  const expectedNumber = normalizePhone(process.env.TWILIO_DEMO_PHONE_NUMBER || "");

  const accountSid = String(form.get("AccountSid") || "").trim();
  const toNumber = normalizePhone(String(form.get("To") || ""));

  if (expectedAccountSid && accountSid && expectedAccountSid !== accountSid) {
    return false;
  }

  if (expectedNumber && toNumber && expectedNumber !== toNumber) {
    return false;
  }

  return true;
}

function buildVoiceResponse() {
  const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
  const actionUrl = `${baseUrl}/api/telephony/twilio/gather`;
  const languageCode = process.env.TELEPHONY_LANGUAGE_CODE || "en-IN";
  const welcomePrompt =
    process.env.TELEPHONY_WELCOME_PROMPT ||
    "Welcome to VoiceDesk AI support. Please tell me your question.";

  return twimlResponse(
    gatherSpeechTwiml({
      actionUrl,
      prompt: welcomePrompt,
      languageCode,
    }),
  );
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    if (!isAllowedTwilioSource(form)) {
      return twimlResponse(
        '<Say voice="alice">This number is not configured for this demo account.</Say>',
      );
    }

    const payloadEntries = Object.fromEntries(form.entries());
    const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
    const actionUrl = `${baseUrl}/api/telephony/twilio/gather`;
    const languageCode = process.env.TELEPHONY_LANGUAGE_CODE || "en-IN";
    const welcomePrompt =
      process.env.TELEPHONY_WELCOME_PROMPT ||
      "Welcome to VoiceDesk AI support. Please tell me your question.";

    console.log(
      JSON.stringify({
        event: "twilio.voice.request",
        path: "/api/telephony/twilio/voice",
        payload: payloadEntries,
      }),
    );

    console.log(
      JSON.stringify({
        event: "twilio.voice.reply",
        actionUrl,
        languageCode,
        welcomePrompt,
      }),
    );
  } catch (error) {
    console.error("twilio voice logging failed", error);
  }

  return buildVoiceResponse();
}

export async function GET() {
  return buildVoiceResponse();
}

export async function HEAD() {
  return new Response(null, { status: 200 });
}
