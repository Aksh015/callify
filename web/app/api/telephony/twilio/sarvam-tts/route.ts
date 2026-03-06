import { SarvamClient } from "@/lib/sarvam/client";

export const runtime = "nodejs";

function decodeBase64Audio(base64: string) {
  return Buffer.from(base64, "base64");
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown error";
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const debugEnabled =
    process.env.TELEPHONY_TTS_DEBUG === "true" || searchParams.get("debug") === "1";

  try {
    const text = (searchParams.get("text") || "").trim();
    const languageCode = searchParams.get("languageCode") || "en-IN";

    console.log(
      JSON.stringify({
        event: "twilio.sarvam_tts.request",
        languageCode,
        textLength: text.length,
      }),
    );

    if (!text) {
      return new Response("text query param is required", { status: 400 });
    }

    const client = new SarvamClient();
    const output = await client.bulbul3Tts({
      text,
      languageCode,
      format: "wav",
    });

    if (!output.audioBase64) {
      return new Response("No audio returned from Sarvam", { status: 502 });
    }

    const audioBuffer = decodeBase64Audio(output.audioBase64);

    console.log(
      JSON.stringify({
        event: "twilio.sarvam_tts.reply",
        ok: true,
        provider: output.provider,
        model: output.model,
        contentType: output.contentType || "audio/wav",
        bytes: audioBuffer.byteLength,
      }),
    );

    return new Response(audioBuffer, {
      headers: {
        "Content-Type": output.contentType || "audio/wav",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    console.error("sarvam tts proxy failed", errorMessage);
    return new Response(
      debugEnabled ? `Failed to synthesize speech: ${errorMessage}` : "Failed to synthesize speech",
      { status: 500 },
    );
  }
}
