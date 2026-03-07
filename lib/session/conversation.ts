import { getAIProvider } from "@/lib/ai";
import { MCPToolRouter, type RuntimeBusinessContext } from "@/lib/mcp/router";
import { runRuntimeTurn } from "@/lib/runtime/orchestrator";
import { clearSession, getOrCreateSession, saveSession } from "./store";

type ProcessTurnInput = {
  callSid: string;
  utterance: string;
  context: RuntimeBusinessContext;
};

type ProcessTurnOutput = {
  text: string;
  shouldEscalate?: boolean;
};

function isCancelIntent(text: string) {
  const normalized = text.toLowerCase();
  return normalized.includes("cancel") || normalized.includes("stop") || normalized.includes("nevermind");
}

function isEscalationIntent(text: string) {
  const normalized = text.toLowerCase();
  return (
    normalized.includes("human") ||
    normalized.includes("agent") ||
    normalized.includes("representative") ||
    normalized.includes("customer care")
  );
}

function isYes(text: string) {
  const normalized = text.toLowerCase();
  return ["yes", "y", "confirm", "ok", "go ahead", "sure"].some((token) => normalized.includes(token));
}

function isNo(text: string) {
  const normalized = text.toLowerCase();
  return ["no", "n", "cancel", "stop", "don't"].some((token) => normalized.includes(token));
}

function mergeSlots(base: Record<string, string>, extra: Record<string, string>) {
  return {
    ...base,
    ...Object.fromEntries(Object.entries(extra).filter(([, value]) => String(value || "").trim())),
  };
}

function inferSlotsFromText(utterance: string, requiredSlots: string[]) {
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

export async function processConversationTurn(input: ProcessTurnInput): Promise<ProcessTurnOutput> {
  const session = getOrCreateSession(input.callSid, input.context);
  session.turnHistory.push({ role: "user", text: input.utterance, timestamp: new Date().toISOString() });

  if (isCancelIntent(input.utterance) && (session.state === "SLOT_FILLING" || session.state === "CONFIRMING")) {
    session.state = "IDLE";
    session.currentIntent = undefined;
    session.filledSlots = {};
    session.missingSlots = [];
    saveSession(session);
    return { text: "Okay, I cancelled that request. How else can I help?" };
  }

  if (isEscalationIntent(input.utterance)) {
    session.state = "ESCALATING";
    saveSession(session);
    return {
      text: "I will transfer you to a human support agent now.",
      shouldEscalate: true,
    };
  }

  if (session.state === "CONFIRMING" && session.currentIntent) {
    if (isYes(input.utterance)) {
      session.state = "EXECUTING";
      const router = new MCPToolRouter(session.context.customTools || []);
      const result = await router.execute(session.currentIntent, session.filledSlots, session.context);
      session.state = "IDLE";
      session.currentIntent = undefined;
      session.filledSlots = {};
      session.missingSlots = [];
      session.turnHistory.push({ role: "assistant", text: result.message, timestamp: new Date().toISOString() });
      saveSession(session);
      return { text: result.message };
    }

    if (isNo(input.utterance)) {
      session.state = "IDLE";
      session.currentIntent = undefined;
      session.filledSlots = {};
      session.missingSlots = [];
      saveSession(session);
      return { text: "Understood. I did not perform that action." };
    }

    saveSession(session);
    return { text: "Please confirm with yes or no." };
  }

  if (session.state === "SLOT_FILLING" && session.currentIntent) {
    const router = new MCPToolRouter(session.context.customTools || []);
    const tool = router.getToolByName(session.currentIntent);

    if (!tool) {
      session.state = "IDLE";
      session.currentIntent = undefined;
      session.filledSlots = {};
      session.missingSlots = [];
      saveSession(session);
      return { text: "I could not continue the previous request. Please ask again." };
    }

    const ai = getAIProvider();
    const required = tool.requiredSlots.filter((slot) => !session.filledSlots[slot]);

    const heuristic = inferSlotsFromText(input.utterance, required);
    let extracted: Record<string, string> = {};
    try {
      extracted = await ai.extractSlots({ utterance: input.utterance, requiredSlots: required });
    } catch {
      extracted = {};
    }

    session.filledSlots = mergeSlots(session.filledSlots, mergeSlots(heuristic, extracted));
    const missing = tool.requiredSlots.filter((slot) => !session.filledSlots[slot]);

    if (missing.length > 0) {
      session.missingSlots = missing;
      session.state = "SLOT_FILLING";
      const prompt = tool.missingSlotPrompts[missing[0]] || `Please share ${missing[0]}.`;
      session.turnHistory.push({ role: "assistant", text: prompt, timestamp: new Date().toISOString() });
      saveSession(session);
      return { text: prompt };
    }

    const requiresConfirm = new Set(session.context.confirmActions || []).has(tool.name);
    if (requiresConfirm) {
      session.state = "CONFIRMING";
      const summary = Object.entries(session.filledSlots)
        .map(([key, value]) => `${key.replace(/_/g, " ")}: ${value}`)
        .join(", ");
      const prompt = `Please confirm. Should I proceed with ${tool.name.replace(/_/g, " ")} using ${summary}?`;
      session.turnHistory.push({ role: "assistant", text: prompt, timestamp: new Date().toISOString() });
      saveSession(session);
      return { text: prompt };
    }

    session.state = "EXECUTING";
    const result = await router.execute(tool.name, session.filledSlots, session.context);
    session.state = "IDLE";
    session.currentIntent = undefined;
    session.filledSlots = {};
    session.missingSlots = [];
    session.turnHistory.push({ role: "assistant", text: result.message, timestamp: new Date().toISOString() });
    saveSession(session);
    return { text: result.message };
  }

  const threshold = Number(process.env.RUNTIME_CONFIDENCE_THRESHOLD || 0.45);
  const runtimeResult = await runRuntimeTurn({
    utterance: input.utterance,
    context: {
      ...session.context,
      confirmActions: session.context.confirmActions || ["book_appointment"],
    },
  });

  if (runtimeResult.confidence > 0 && runtimeResult.confidence < threshold) {
    const text = "I want to be accurate. Could you please rephrase that request?";
    session.turnHistory.push({ role: "assistant", text, timestamp: new Date().toISOString() });
    saveSession(session);
    return { text };
  }

  if (runtimeResult.needsConfirmation) {
    session.state = "CONFIRMING";
    session.currentIntent = runtimeResult.action;
    session.filledSlots = runtimeResult.slots;
    session.missingSlots = [];
    const prompt = runtimeResult.prompt || "Please confirm with yes or no.";
    session.turnHistory.push({ role: "assistant", text: prompt, timestamp: new Date().toISOString() });
    saveSession(session);
    return { text: prompt };
  }

  if (runtimeResult.requiresInput) {
    const router = new MCPToolRouter(session.context.customTools || []);
    const tool = router.getToolByName(runtimeResult.action);
    const missing = tool ? tool.requiredSlots.filter((slot) => !runtimeResult.slots[slot]) : [];

    session.state = "SLOT_FILLING";
    session.currentIntent = runtimeResult.action;
    session.filledSlots = runtimeResult.slots;
    session.missingSlots = missing;
    const prompt = runtimeResult.prompt || (missing[0] ? `Please share ${missing[0]}.` : "Please continue.");
    session.turnHistory.push({ role: "assistant", text: prompt, timestamp: new Date().toISOString() });
    saveSession(session);
    return { text: prompt };
  }

  session.state = "IDLE";
  session.currentIntent = undefined;
  session.filledSlots = {};
  session.missingSlots = [];
  session.turnHistory.push({ role: "assistant", text: runtimeResult.responseText, timestamp: new Date().toISOString() });
  saveSession(session);
  return { text: runtimeResult.responseText };
}

export function endConversation(callSid: string) {
  clearSession(callSid);
}
