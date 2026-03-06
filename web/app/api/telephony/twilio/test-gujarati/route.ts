import { twimlResponse } from "@/lib/telephony/twiml";

export const runtime = "nodejs";

function buildResponse() {
  const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
  const text = "નમસ્તે. આ સરવમ બુલબુલ વોઇસનું ગુજરાતી ટેસ્ટ છે.";
  const ttsUrl = new URL(`${baseUrl}/api/telephony/twilio/sarvam-tts`);
  ttsUrl.searchParams.set("text", text);
  ttsUrl.searchParams.set("languageCode", "gu-IN");

  return twimlResponse(`
    <Play>${ttsUrl.toString()}</Play>
    <Pause length="1"/>
    <Say voice="alice" language="gu-IN">આ ટેસ્ટ પૂરું થયું. આભાર.</Say>
    <Hangup/>
  `);
}

export async function POST() {
  return buildResponse();
}

export async function GET() {
  return buildResponse();
}

export async function HEAD() {
  return new Response(null, { status: 200 });
}
