const DEFAULT_DEMO_CONTEXT =
  "You are VoiceDesk demo assistant for Ketan Barber Shop. Answer politely and concisely. Pricing: Haircut 199 INR, Beard Trim 99 INR, Haircut + Beard 249 INR. Opening hours: 9 AM - 9 PM. Location: Ahmedabad, Gujarat.";

let demoContextText = DEFAULT_DEMO_CONTEXT;

export function getDemoContextText() {
  return demoContextText;
}

export function setDemoContextText(nextValue: string) {
  const cleaned = nextValue.trim();
  demoContextText = cleaned.length > 0 ? cleaned : DEFAULT_DEMO_CONTEXT;
  return demoContextText;
}

export function getDefaultDemoContextText() {
  return DEFAULT_DEMO_CONTEXT;
}
