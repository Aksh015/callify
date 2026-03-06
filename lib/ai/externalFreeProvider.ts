import type { AIProvider, IntentResult } from "./types";

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
};

export class ExternalFreeProvider implements AIProvider {
  private readonly apiKey = process.env.GEMINI_API_KEY;
  private readonly model = process.env.EXTERNAL_FREE_MODEL || "gemini-2.0-flash";

  private async chat(prompt: string) {
    if (!this.apiKey) {
      throw new Error("GEMINI_API_KEY is not configured.");
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 1024,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini request failed: ${response.status}`);
    }

    const data = (await response.json()) as GeminiResponse;
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
  }

  async classifyIntent(input: { utterance: string; allowedIntents: string[] }): Promise<IntentResult> {
    const raw = await this.chat(
      `Return strict JSON: {\"intent\":string,\"confidence\":number,\"slots\":object}. Allowed intents: ${input.allowedIntents.join(",")}. User: ${input.utterance}`,
    );

    try {
      const parsed = JSON.parse(raw) as IntentResult;
      return {
        intent: parsed.intent,
        confidence: Number(parsed.confidence) || 0,
        slots: parsed.slots || {},
      };
    } catch {
      return {
        intent: input.allowedIntents[0] || "unknown",
        confidence: 0,
        slots: {},
      };
    }
  }

  async extractSlots(input: {
    utterance: string;
    requiredSlots: string[];
  }): Promise<Record<string, string>> {
    const raw = await this.chat(
      `Extract slots from user utterance and return strict JSON object with keys: ${input.requiredSlots.join(",")}. User: ${input.utterance}`,
    );

    try {
      return JSON.parse(raw) as Record<string, string>;
    } catch {
      return {};
    }
  }

  async generateText(input: { prompt: string; system?: string }): Promise<string> {
    const payload = input.system ? `${input.system}\n\n${input.prompt}` : input.prompt;
    return this.chat(payload);
  }
}
