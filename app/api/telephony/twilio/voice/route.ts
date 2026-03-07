import { gatherSpeechTwiml, recordSpeechTwiml, twimlResponse } from "@/lib/telephony/twiml";
import { isInboundToDemoNumber } from "@/lib/telephony/twilioDemoValidation";
import { isAllowedProdTwilioSource, isProdTwilioSignatureValid } from "@/lib/telephony/twilioProdValidation";

export const runtime = "nodejs";

function buildVoiceResponse() {
  const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
  const actionUrl = `${baseUrl}/api/telephony/twilio/gather`;
  const languageCode = process.env.TELEPHONY_LANGUAGE_CODE || "en-IN";
  const welcomePrompt =
    process.env.TELEPHONY_WELCOME_PROMPT ||
    "Welcome to Callify AI support. Please tell me your question.";
  const useSarvamStt = process.env.TELEPHONY_USE_SARVAM_STT === "true" && Boolean(process.env.SARVAM_API_KEY);

  return twimlResponse(
    useSarvamStt
      ? recordSpeechTwiml({
          actionUrl,
          prompt: welcomePrompt,
          languageCode,
          maxLengthSeconds: Number(process.env.TELEPHONY_RECORD_MAX_SECONDS || 20),
        })
      : gatherSpeechTwiml({
          actionUrl,
          prompt: welcomePrompt,
          languageCode,
        }),
  );
}

export async function POST(request: Request) {
  let isDemoInbound = false;
  try {
    const form = await request.formData();
    isDemoInbound = isInboundToDemoNumber(form);

    if (!isDemoInbound) {
      if (!isAllowedProdTwilioSource(form)) {
        return new Response("Invalid production Twilio source", { status: 403 });
      }

      if (!isProdTwilioSignatureValid(request, form)) {
        return new Response("Invalid Twilio signature", { status: 403 });
      }
    }

    const payloadEntries = Object.fromEntries(form.entries());
    const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
    const actionUrl = isDemoInbound
      ? `${baseUrl}/api/telephony/twilio/demo/gather`
      : `${baseUrl}/api/telephony/twilio/gather`;
    const languageCode = process.env.TELEPHONY_LANGUAGE_CODE || "en-IN";
    const welcomePrompt =
      (isDemoInbound
        ? process.env.TELEPHONY_DEMO_WELCOME_PROMPT
        : process.env.TELEPHONY_WELCOME_PROMPT) ||
      (isDemoInbound
        ? "Welcome to the demo line. Please ask your question."
        : "Welcome to AI support. Please tell me your question.");

    console.log(
      JSON.stringify({
        event: "twilio.voice.request",
        path: "/api/telephony/twilio/voice",
        isDemoInbound,
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
