import { SarvamAIClient } from "sarvamai";

export type SarvamTtsInput = {
  text: string;
  languageCode?: string;
  speaker?: string;
  format?: "wav" | "mp3";
};

export type SarvamTtsOutput = {
  provider: "sarvam";
  model: string;
  audioBase64?: string;
  audioUrl?: string;
  contentType?: string;
  raw?: unknown;
};

function toBase64(arrayBuffer: ArrayBuffer) {
  return Buffer.from(arrayBuffer).toString("base64");
}

export class SarvamClient {
  private readonly apiKey = process.env.SARVAM_API_KEY;
  private readonly baseUrl = process.env.SARVAM_API_BASE_URL || "https://api.sarvam.ai";
  private readonly ttsEndpoint = process.env.SARVAM_TTS_ENDPOINT || "/text-to-speech";
  private readonly ttsModel = process.env.SARVAM_TTS_MODEL || "bulbul:v3";
  private readonly defaultSpeaker = (process.env.SARVAM_TTS_SPEAKER || "shubh").toLowerCase();

  isConfigured() {
    return Boolean(this.apiKey);
  }

  async bulbul3Tts(input: SarvamTtsInput): Promise<SarvamTtsOutput> {
    if (!this.apiKey) {
      throw new Error("SARVAM_API_KEY is not configured.");
    }

    const speaker = (input.speaker || this.defaultSpeaker || "shubh").toLowerCase();

    // Preferred path: official SDK with typed request schema.
    try {
      const sdkClient = new SarvamAIClient({ apiSubscriptionKey: this.apiKey });
      const sdkResponse = await sdkClient.textToSpeech.convert({
        text: input.text,
        target_language_code: (input.languageCode || "hi-IN") as never,
        model: this.ttsModel as never,
        speaker: speaker as never,
        output_audio_codec: (input.format || "wav") as never,
      });

      const audioBase64 = Array.isArray(sdkResponse.audios) ? sdkResponse.audios[0] : undefined;
      if (!audioBase64) {
        throw new Error("SDK TTS response missing audio payload.");
      }

      return {
        provider: "sarvam",
        model: this.ttsModel,
        audioBase64,
        contentType: input.format === "mp3" ? "audio/mpeg" : "audio/wav",
        raw: sdkResponse,
      };
    } catch {
      // Fallback path: direct REST call for backward compatibility.
    }

    const response = await fetch(`${this.baseUrl}${this.ttsEndpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-subscription-key": this.apiKey,
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.ttsModel,
        text: input.text,
        target_language_code: input.languageCode || "hi-IN",
        speaker,
        output_audio_codec: input.format || "wav",
      }),
    });

    const contentType = response.headers.get("content-type") || undefined;

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Sarvam TTS failed (${response.status}): ${errorText}`);
    }

    if (contentType?.includes("application/json")) {
      const json = (await response.json()) as {
        audio?: string;
        audio_base64?: string;
        audio_url?: string;
        url?: string;
      };

      return {
        provider: "sarvam",
        model: this.ttsModel,
        audioBase64: json.audio_base64 || json.audio,
        audioUrl: json.audio_url || json.url,
        contentType,
        raw: json,
      };
    }

    const audioBuffer = await response.arrayBuffer();
    return {
      provider: "sarvam",
      model: this.ttsModel,
      audioBase64: toBase64(audioBuffer),
      contentType,
    };
  }
}
