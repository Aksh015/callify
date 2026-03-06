import { runRuntimeTurn } from "@/lib/runtime/orchestrator";
import { getDefaultRuntimeContext } from "@/lib/telephony/context";
import { playAudioOrSayTwiml, twimlResponse } from "@/lib/telephony/twiml";

export const runtime = "nodejs";

function buildSarvamPlaybackUrl(baseUrl: string, text: string, languageCode = "en-IN") {
  const url = new URL(`${baseUrl}/api/telephony/exotel/sarvam-tts`);
  url.searchParams.set("text", text);
  url.searchParams.set("languageCode", languageCode);
  return url.toString();
}

function getSpeechFromForm(form: FormData) {
  return (
    String(form.get("SpeechResult") || "").trim() ||
    String(form.get("speech") || "").trim() ||
    String(form.get("query") || "").trim() ||
    String(form.get("text") || "").trim()
  );
}

export async function POST(request: Request) {
  const form = await request.formData();
  const speechResult = getSpeechFromForm(form);
  const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
  const gatherAction = `${baseUrl}/api/telephony/exotel/gather`;

  if (!speechResult) {
    return twimlResponse(
      playAudioOrSayTwiml({
        message: "I did not catch that. Please repeat your query.",
        actionUrl: gatherAction,
      }),
    );
  }

  const runtimeResult = await runRuntimeTurn({
    utterance: speechResult,
    languageCode: "en-IN",
    context: getDefaultRuntimeContext(),
  });

  // Keep TTS opt-in so call flow remains stable even if TTS provider is down/misconfigured.
  const useSarvamPlayback =
    process.env.TELEPHONY_USE_SARVAM_TTS === "true" && Boolean(process.env.SARVAM_API_KEY);
  const audioUrl = useSarvamPlayback
    ? buildSarvamPlaybackUrl(baseUrl, runtimeResult.responseText, "en-IN")
    : undefined;

  return twimlResponse(
    playAudioOrSayTwiml({
      message: runtimeResult.responseText,
      actionUrl: gatherAction,
      audioUrl,
    }),
  );
}
