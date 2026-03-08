import { getAIProvider } from "@/lib/ai";

/**
 * Secure Demo Handler - Ensures demo mode only provides safe, context-based responses
 * without exposing any sensitive information or allowing sensitive operations.
 */

export type DemoTurnInput = {
  utterance: string;
  demoContext: string;
};

export type DemoTurnOutput = {
  responseText: string;
  intent: string;
  isSafe: boolean;
  reason?: string;
};

// Whitelist of safe intents for demo mode
const SAFE_DEMO_INTENTS = new Set([
  "greeting",
  "ask_about_business",
  "ask_about_services",
  "ask_about_hours",
  "ask_about_location",
  "ask_about_pricing",
  "general_question",
  "farewell",
]);

// Keywords that indicate unsafe requests
const UNSAFE_KEYWORDS = [
  "appointment",
  "book",
  "reserve",
  "schedule",
  "order",
  "payment",
  "credit card",
  "bank",
  "account",
  "password",
  "pin",
  "personal",
  "phone number",
  "email address",
  "address",
  "cancel",
  "refund",
  "modify",
  "update",
  "delete",
  "remove",
  "access",
  "login",
  "signup",
  "register",
];

/**
 * Check if input is gibberish or unintelligible
 */
function isGibberish(utterance: string): boolean {
  const text = utterance.trim().toLowerCase();
  
  // Empty or too short
  if (text.length === 0 || text.length < 2) {
    return true;
  }
  
  // Only special characters or numbers
  if (/^[^a-z]+$/i.test(text)) {
    return true;
  }
  
  // Remove spaces and check
  const noSpaces = text.replace(/\s+/g, "");
  
  // Check for repeated characters (like "aaaa" or "xxxxx")
  if (/(.)\1{3,}/.test(noSpaces)) {
    return true;
  }
  
  // Check vowel ratio - gibberish often has very few or no vowels
  const vowels = (noSpaces.match(/[aeiou]/gi) || []).length;
  const consonants = (noSpaces.match(/[bcdfghjklmnpqrstvwxyz]/gi) || []).length;
  const totalLetters = vowels + consonants;
  
  if (totalLetters > 3) {
    const vowelRatio = vowels / totalLetters;
    // English typically has 38-40% vowels; gibberish is often < 15% or > 70%
    if (vowelRatio < 0.10 || vowelRatio > 0.75) {
      return true;
    }
  }
  
  // Check for common words - if it contains any, it's probably not gibberish
  const commonWords = [
    "hi", "hello", "hey", "yes", "no", "ok", "what", "when", "where", "who",
    "how", "why", "can", "could", "would", "do", "does", "is", "are", "am",
    "the", "a", "an", "i", "you", "me", "my", "your", "tell", "get", "give",
    "want", "need", "have", "has", "price", "cost", "open", "close", "book",
    "order", "service", "business", "help", "please", "thank", "thanks", "bye",
  ];
  
  const words = text.split(/\s+/);
  for (const word of words) {
    if (commonWords.includes(word)) {
      return false;
    }
  }
  
  // If single word with more than 8 chars and low vowel count, likely gibberish
  if (words.length === 1 && noSpaces.length > 8 && vowels < 2) {
    return true;
  }
  
  // Check for keyboard mashing patterns (adjacent keys)
  const keyboardRows = [
    "qwertyuiop",
    "asdfghjkl",
    "zxcvbnm",
  ];
  
  for (const row of keyboardRows) {
    for (let i = 0; i <= row.length - 4; i++) {
      const pattern = row.slice(i, i + 4);
      if (noSpaces.includes(pattern) || noSpaces.includes(pattern.split("").reverse().join(""))) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Check if user query contains any sensitive/unsafe requests
 */
function isSafeQuery(utterance: string): { safe: boolean; reason?: string } {
  const lowerUtterance = utterance.toLowerCase();

  for (const keyword of UNSAFE_KEYWORDS) {
    if (lowerUtterance.includes(keyword)) {
      return {
        safe: false,
        reason: `This is a demo mode. I cannot process ${keyword}-related requests.`,
      };
    }
  }

  return { safe: true };
}

/**
 * Classify user intent for demo mode
 */
function classifyDemoIntent(utterance: string): string {
  const text = utterance.toLowerCase();

  // Greetings
  if (
    /^(hi|hello|hey|good morning|good evening|good afternoon|namaste|namaskar)/.test(text) ||
    /^(how are you|what'?s up)/.test(text)
  ) {
    return "greeting";
  }

  // Farewell
  if (
    /^(bye|goodbye|thank you|thanks|see you|ok bye|have a good day|that'?s all)/.test(text)
  ) {
    return "farewell";
  }

  // Business hours/timing
  if (/open|close|hour|timing|when.*open|when.*close|schedule/.test(text)) {
    return "ask_about_hours";
  }

  // Pricing
  if (/price|cost|charge|fee|rate|how much|expensive|cheap/.test(text)) {
    return "ask_about_pricing";
  }

  // Services/Products
  if (
    /service|product|offer|sell|menu|item|available|what.*do|what.*sell|specialt/.test(
      text,
    )
  ) {
    return "ask_about_services";
  }

  // Location
  if (/where|location|address|city|area|find you|reach/.test(text)) {
    return "ask_about_location";
  }

  // General business info
  if (/about|who|owner|business|company|tell me more|information/.test(text)) {
    return "ask_about_business";
  }

  return "general_question";
}

/**
 * Generate contextual greeting response
 */
function generateGreeting(context: string): string {
  const businessName =
    context.match(
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Bakery|Hotel|Salon|Clinic|Shop|Store|Restaurant|Cafe|Studio))/i,
    )?.[0] || "our demo business";
  const location = context.match(/(?:in|at|located)\s+([A-Z][a-z]+(?:abad)?)/i)?.[1];

  const greetings = [
    `Hello! Welcome to ${businessName}${location ? " in " + location : ""}. How can I assist you today?`,
    `Hi there! Thanks for reaching out to ${businessName}. Feel free to ask about our services!`,
    `Good day! This is ${businessName}. What would you like to know about us?`,
    `Welcome! I'm here to help you learn about ${businessName}. What can I tell you?`,
  ];

  return greetings[Math.floor(Math.random() * greetings.length)];
}

/**
 * Generate farewell response
 */
function generateFarewell(): string {
  const farewells = [
    "Thank you for visiting our demo! Have a great day!",
    "Goodbye! Feel free to try the demo again anytime.",
    "Thanks for checking out our demo. Take care!",
    "Have a wonderful day! Come back to try the demo again soon.",
  ];

  return farewells[Math.floor(Math.random() * farewells.length)];
}

/**
 * Extract key information from demo context
 */
function extractContextInfo(context: string) {
  const info: Record<string, string> = {};

  // Business name
  const businessNameMatch = context.match(
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Bakery|Hotel|Salon|Clinic|Shop|Store|Restaurant|Cafe|Studio))/i,
  );
  if (businessNameMatch) {
    info.businessName = businessNameMatch[0];
  }

  // Location
  const locationMatch = context.match(/(?:in|at|located)\s+([A-Z][a-z]+(?:abad)?)/i);
  if (locationMatch) {
    info.location = locationMatch[1];
  }

  // Hours
  const hoursMatch = context.match(/(\d+\s*[AP]M)\s+to\s+(\d+\s*[AP]M)/i);
  if (hoursMatch) {
    info.hours = `${hoursMatch[1]} to ${hoursMatch[2]}`;
  }

  // Owner
  const ownerMatch = context.match(/owner[:\s]+([^,.\n]+)/i);
  if (ownerMatch) {
    info.owner = ownerMatch[1].trim();
  }

  return info;
}

/**
 * Generate smart response based on intent and context
 */
async function generateSmartResponse(
  intent: string,
  query: string,
  context: string,
): Promise<string> {
  if (intent === "greeting") {
    return generateGreeting(context);
  }

  if (intent === "farewell") {
    return generateFarewell();
  }

  const contextInfo = extractContextInfo(context);
  const queryLower = query.toLowerCase();

  // Handle specific intents with template responses
  if (intent === "ask_about_hours") {
    if (contextInfo.hours) {
      return `We're open from ${contextInfo.hours}. Feel free to visit us during these hours!`;
    }
    const match = context.match(/open|hour|timing/i);
    if (match) {
      const sentences = context.split(/[.!?]+/).filter((s) => /open|hour|timing/i.test(s));
      return sentences[0]?.trim() || "Please check with us for our business hours.";
    }
  }

  if (intent === "ask_about_pricing") {
    const prices = context.match(/(\w+(?:\s+\w+)?)\s+(?:from\s+)?Rs?\s*\.?\s*(\d+)/gi);
    if (prices && prices.length > 0) {
      const priceList = prices.slice(0, 3).join(", ");
      return `Here are some of our prices: ${priceList}. What else would you like to know?`;
    }
    return "We offer competitive pricing for all our products and services. Is there something specific you'd like to know about?";
  }

  if (intent === "ask_about_services") {
    const sentences = context
      .split(/[.!?]+/)
      .filter((s) => /sell|offer|provide|specializ/i.test(s));
    if (sentences.length > 0) {
      return sentences[0].trim() + ". Anything else you'd like to know?";
    }
    return "We offer a variety of quality products and services. What specifically interests you?";
  }

  if (intent === "ask_about_location") {
    if (contextInfo.location) {
      return `We're located in ${contextInfo.location}. ${contextInfo.businessName || "We"} look forward to serving you!`;
    }
    const sentences = context
      .split(/[.!?]+/)
      .filter((s) => /location|address|city|area/i.test(s));
    if (sentences.length > 0) {
      return sentences[0].trim();
    }
  }

  if (intent === "ask_about_business") {
    const sentences = context.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
    if (sentences.length >= 2) {
      return sentences.slice(0, 2).join(". ") + ". What else would you like to know?";
    }
    if (sentences.length === 1) {
      return sentences[0] + ". How can I help you further?";
    }
  }

  // For general questions, try AI-powered response
  try {
    const ai = getAIProvider();
    const systemPrompt = `You are a friendly demo assistant. Answer questions ONLY based on the provided business context. 
    
IMPORTANT RULES:
1. Only share information explicitly mentioned in the business context
2. Keep responses friendly and conversational (2-3 sentences max)
3. If information is not in the context, say "That information isn't available in the demo context"
4. NEVER make up or infer information not in the context
5. NEVER provide phone numbers, email addresses, or contact methods
6. This is a DEMO - remind users if they ask to book appointments or make orders`;

    const userPrompt = `Business Context:
${context}

Customer Question: ${query}`;

    const response = await ai.generateText({
      prompt: userPrompt,
      system: systemPrompt,
    });

    if (response && response.trim()) {
      return response.trim();
    }
  } catch (error) {
    console.error("AI generation failed in demo handler:", error);
  }

  // Fallback response
  return "I'm here to help! Based on the demo context, I can answer questions about the business. What would you like to know?";
}

/**
 * Main handler for secure demo turns
 */
export async function handleSecureDemoTurn(
  input: DemoTurnInput,
): Promise<DemoTurnOutput> {
  const { utterance, demoContext } = input;

  // Check for gibberish or unintelligible input
  if (isGibberish(utterance)) {
    const unintelligibleResponses = [
      "I'm sorry, I couldn't understand that. Could you please rephrase your question?",
      "I'm unable to understand your message. Could you try asking in a different way?",
      "I didn't quite catch that. Could you please ask your question again?",
      "I'm having trouble understanding. Could you rephrase that for me?",
    ];
    
    return {
      responseText: unintelligibleResponses[Math.floor(Math.random() * unintelligibleResponses.length)],
      intent: "unintelligible",
      isSafe: true,
    };
  }

  // Check if query is safe
  const safetyCheck = isSafeQuery(utterance);
  if (!safetyCheck.safe) {
    return {
      responseText:
        safetyCheck.reason ||
        "This is a demo mode. I can only answer questions about the business based on the provided context.",
      intent: "unsafe_request",
      isSafe: false,
      reason: safetyCheck.reason,
    };
  }

  // Classify intent
  const intent = classifyDemoIntent(utterance);

  // Generate response
  const responseText = await generateSmartResponse(intent, utterance, demoContext);

  return {
    responseText,
    intent,
    isSafe: true,
  };
}

/**
 * Sanitize any text to remove sensitive patterns
 */
export function sanitizeText(text: string): string {
  // Remove phone numbers
  let sanitized = text.replace(
    /(\+?\d{1,3}[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/g,
    "[PHONE REDACTED]",
  );

  // Remove email addresses
  sanitized = sanitized.replace(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    "[EMAIL REDACTED]",
  );

  // Remove potential credit card numbers
  sanitized = sanitized.replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, "[CARD REDACTED]");

  return sanitized;
}
