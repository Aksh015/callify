import { gatherSpeechTwiml, twimlResponse } from "@/lib/telephony/twiml";

export const runtime = "nodejs";

function buildVoiceResponse() {
  const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
  const actionUrl = `${baseUrl}/api/telephony/exotel/gather`;

  return twimlResponse(
    gatherSpeechTwiml({
      actionUrl,
      prompt: "Welcome to VoiceDesk AI support. Please tell me your question.",
    }),
  );
}

export async function POST() {
  return buildVoiceResponse();
}

export async function GET() {
  return buildVoiceResponse();
}

export async function HEAD() {
  return new Response(null, { status: 200 });
}
