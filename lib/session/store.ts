import type { RuntimeBusinessContext } from "@/lib/mcp/router";

export type ConversationState =
  | "IDLE"
  | "SLOT_FILLING"
  | "CONFIRMING"
  | "EXECUTING"
  | "ESCALATING";

export type TurnHistoryItem = {
  role: "user" | "assistant";
  text: string;
  timestamp: string;
};

export type CallSession = {
  callSid: string;
  state: ConversationState;
  currentIntent?: string;
  filledSlots: Record<string, string>;
  missingSlots: string[];
  context: RuntimeBusinessContext;
  turnHistory: TurnHistoryItem[];
  updatedAt: number;
};

const SESSION_TTL_MS = 1000 * 60 * 30;
const sessions = new Map<string, CallSession>();

function pruneExpired() {
  const now = Date.now();
  for (const [key, session] of sessions.entries()) {
    if (now - session.updatedAt > SESSION_TTL_MS) {
      sessions.delete(key);
    }
  }
}

export function getOrCreateSession(callSid: string, context: RuntimeBusinessContext): CallSession {
  pruneExpired();
  const existing = sessions.get(callSid);
  if (existing) {
    existing.context = { ...existing.context, ...context };
    existing.updatedAt = Date.now();
    return existing;
  }

  const created: CallSession = {
    callSid,
    state: "IDLE",
    filledSlots: {},
    missingSlots: [],
    context,
    turnHistory: [],
    updatedAt: Date.now(),
  };

  sessions.set(callSid, created);
  return created;
}

export function saveSession(session: CallSession) {
  session.updatedAt = Date.now();
  sessions.set(session.callSid, session);
}

export function clearSession(callSid: string) {
  sessions.delete(callSid);
}
