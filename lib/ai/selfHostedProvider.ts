import type { AIProvider, IntentResult } from "./types";

type OllamaResponse = {
  response?: string;
};

export class SelfHostedProvider implements AIProvider {
  private readonly baseUrl = process.env.SELF_HOSTED_AI_URL || "http://localhost:11434";
  private readonly model = process.env.SELF_HOSTED_AI_MODEL || "llama3.1";

  private async run(prompt: string) {
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        prompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Self-hosted AI request failed: ${response.status}`);
    }

    const data = (await response.json()) as OllamaResponse;
    return data.response?.trim() || "";
  }

  async classifyIntent(input: { utterance: string; allowedIntents: string[] }): Promise<IntentResult> {
    const raw = await this.run(
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
    const raw = await this.run(
      `Extract slots and return strict JSON object with keys ${input.requiredSlots.join(",")}. User: ${input.utterance}`,
    );

    try {
      return JSON.parse(raw) as Record<string, string>;
    } catch {
      return {};
    }
  }

  async generateText(input: { prompt: string; system?: string }): Promise<string> {
    const payload = input.system ? `${input.system}\n\n${input.prompt}` : input.prompt;
    return this.run(payload);
  }
}
