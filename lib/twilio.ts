import twilio from "twilio";

const starterSid = process.env.TWILIO_STARTER_ACCOUNT_SID;
const starterToken = process.env.TWILIO_STARTER_AUTH_TOKEN;

const proSid = process.env.TWILIO_PRO_ACCOUNT_SID;
const proToken = process.env.TWILIO_PRO_AUTH_TOKEN;

// Initialize clients strictly if environment variables are available
export const twilioStarterClient =
  starterSid && starterToken ? twilio(starterSid, starterToken) : null;

export const twilioProClient =
  proSid && proToken ? twilio(proSid, proToken) : null;

// Re-export TwiML builder
export const twiml = twilio.twiml;
