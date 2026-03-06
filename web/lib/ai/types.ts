export type AiProviderMode = "external_free" | "self_hosted" | "sarvam";

export type IntentResult = {
  intent: string;
  confidence: number;
  slots: Record<string, string>;
};

export type AiGenerateInput = {
  prompt: string;
  system?: string;
};

export interface AIProvider {
  classifyIntent(input: { utterance: string; allowedIntents: string[] }): Promise<IntentResult>;
  extractSlots(input: {
    utterance: string;
    requiredSlots: string[];
  }): Promise<Record<string, string>>;
  generateText(input: AiGenerateInput): Promise<string>;
}
