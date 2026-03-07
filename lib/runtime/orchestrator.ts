import { getAIProvider } from "@/lib/ai";
import { MCPToolRouter, type RuntimeBusinessContext } from "@/lib/mcp/router";
import { SarvamClient } from "@/lib/sarvam/client";

export type RuntimeTurnInput = {
  utterance: string;
  languageCode?: string;
  context?: RuntimeBusinessContext;
};

export type RuntimeTurnOutput = {
  intent: string;
  confidence: number;
  action: string;
  slots: Record<string, string>;
  requiresInput: boolean;
  missingSlot?: string;
  prompt?: string;
  responseText: string;
  mcp: {
    ok: boolean;
    message: string;
    data?: Record<string, unknown>;
  };
  tts?: {
    provider: "sarvam";
    model: string;
    audioBase64?: string;
    audioUrl?: string;
    contentType?: string;
  };
};

function keywordIntentFallback(utterance: string) {
  const text = utterance.toLowerCase();
  if (text.includes("price") || text.includes("cost") || text.includes("haircut") || text.includes("beard")) {
    return "get_business_info";
  }
  if (text.includes("order")) return "get_order_status";
  if (text.includes("appointment") || text.includes("slot") || text.includes("schedule")) {
    return text.includes("book") ? "book_appointment" : "check_available_slots";
  }
  if (text.includes("open") || text.includes("timing") || text.includes("hours")) {
    return "get_opening_hours";
  }
  if (text.includes("whatsapp")) return "send_whatsapp";
  if (text.includes("email")) return "send_email";
  return "search_knowledge";
}

function heuristicSlotExtraction(utterance: string, requiredSlots: string[]) {
  const text = utterance.toLowerCase();
  const output: Record<string, string> = {};

  if (requiredSlots.includes("query")) {
    output.query = utterance.trim();
  }

  if (requiredSlots.includes("order_id")) {
    const orderMatch = text.match(/order\s*(id)?\s*[:#-]?\s*(\d{2,})/) || text.match(/\b(\d{2,})\b/);
    const candidate = orderMatch?.[2] || orderMatch?.[1];
    if (candidate) output.order_id = candidate;
  }

  if (requiredSlots.includes("date")) {
    const dateMatch = text.match(/\b(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/);
    if (dateMatch?.[1]) output.date = dateMatch[1];
  }

  if (requiredSlots.includes("time")) {
    const timeMatch = text.match(/\b(\d{1,2}(:\d{2})?\s?(am|pm)?)\b/);
    if (timeMatch?.[1]) output.time = timeMatch[1].trim();
  }

  if (requiredSlots.includes("name")) {
    const nameMatch = text.match(/my name is\s+([a-zA-Z]+)/);
    if (nameMatch?.[1]) output.name = nameMatch[1];
  }

  return output;
}

export async function runRuntimeTurn(input: RuntimeTurnInput): Promise<RuntimeTurnOutput> {
  const router = new MCPToolRouter(input.context?.customTools || []);
  const tools = router.getTools();
  const allowedIntents = tools.map((tool) => tool.name);

  const ai = getAIProvider();
  const aiProviderMode = process.env.AI_PROVIDER_MODE || "external_free";
  const aiProviderModel =
    aiProviderMode === "self_hosted"
      ? process.env.SELF_HOSTED_AI_MODEL || "unknown"
      : process.env.EXTERNAL_FREE_MODEL || "unknown";

  let intent = "get_business_info";
  let confidence = 0;
  let slots: Record<string, string> = {};

  try {
    console.log(
      JSON.stringify({
        event: "runtime.ai.classify.start",
        providerMode: aiProviderMode,
        model: aiProviderModel,
        utterance: input.utterance,
      }),
    );

    const intentResult = await ai.classifyIntent({
      utterance: input.utterance,
      allowedIntents,
    });

    console.log(
      JSON.stringify({
        event: "runtime.ai.classify.result",
        providerMode: aiProviderMode,
        model: aiProviderModel,
        intent: intentResult.intent,
        confidence: intentResult.confidence,
        slots: intentResult.slots || {},
      }),
    );

    intent = allowedIntents.includes(intentResult.intent)
      ? intentResult.intent
      : keywordIntentFallback(input.utterance);
    confidence = intentResult.confidence;
    slots = intentResult.slots || {};
  } catch {
    intent = keywordIntentFallback(input.utterance);
    confidence = 0;
    slots = {};
  }

  // Avoid confusing "knowledge base is not configured" responses for general business queries.
  if (intent === "search_knowledge" && !input.context?.knowledgeBaseId) {
    intent = "get_business_info";
  }

  const tool = router.getToolByName(intent) || router.getToolByName("get_business_info");

  if (!tool) {
    return {
      intent: "unknown",
      confidence: 0,
      action: "none",
      slots: {},
      requiresInput: false,
      responseText: "I could not process this request right now.",
      mcp: {
        ok: false,
        message: "Tool router unavailable.",
      },
    };
  }

  const missingBeforeExtract = tool.requiredSlots.filter((slot) => !slots[slot]);

  if (missingBeforeExtract.length > 0) {
    slots = {
      ...slots,
      ...heuristicSlotExtraction(input.utterance, missingBeforeExtract),
    };
  }

  if (missingBeforeExtract.length > 0) {
    try {
      console.log(
        JSON.stringify({
          event: "runtime.ai.extract.start",
          providerMode: aiProviderMode,
          model: aiProviderModel,
          requiredSlots: missingBeforeExtract,
          utterance: input.utterance,
        }),
      );

      const extracted = await ai.extractSlots({
        utterance: input.utterance,
        requiredSlots: missingBeforeExtract,
      });

      console.log(
        JSON.stringify({
          event: "runtime.ai.extract.result",
          providerMode: aiProviderMode,
          model: aiProviderModel,
          extracted,
        }),
      );

      slots = { ...slots, ...extracted };
    } catch {
      // fallback on existing extracted slots
    }
  }

  // Avoid confusing "knowledge base is not configured" responses for general business queries.
  if (intent === "search_knowledge" && !input.context?.knowledgeBaseId) {
    intent = "get_business_info";
  }

  const missingAfterExtract = tool.requiredSlots.filter((slot) => !slots[slot]);
  if (missingAfterExtract.length > 0) {
    const missingSlot = missingAfterExtract[0];
    const prompt =
      tool.missingSlotPrompts[missingSlot] || `Please share ${missingSlot.replace("_", " ")}.`;

    return {
      intent,
      confidence,
      action: tool.name,
      slots,
      requiresInput: true,
      missingSlot,
      prompt,
      responseText: prompt,
      mcp: {
        ok: false,
        message: "Waiting for missing slot input.",
      },
    };
  }

  const execution = await router.execute(tool.name, slots, input.context || {});
  const responseText = execution.message;

  let tts:
    | {
        provider: "sarvam";
        model: string;
        audioBase64?: string;
        audioUrl?: string;
        contentType?: string;
      }
    | undefined;

  if (process.env.SARVAM_API_KEY) {
    try {
      const sarvam = new SarvamClient();
      const audio = await sarvam.bulbul3Tts({
        text: responseText,
        languageCode: input.languageCode || "hi-IN",
      });
      tts = {
        provider: audio.provider,
        model: audio.model,
        audioBase64: audio.audioBase64,
        audioUrl: audio.audioUrl,
        contentType: audio.contentType,
      };
    } catch {
      tts = undefined;
    }
  }

  return {
    intent,
    confidence,
    action: tool.name,
    slots,
    requiresInput: false,
    responseText,
    mcp: {
      ok: execution.ok,
      message: execution.message,
      data: execution.data,
    },
    tts,
  };
}
