import { NextResponse } from 'next/server';
import twilio from 'twilio';

// This endpoint receives Webhooks from Twilio when a user calls the Callify Virtual Number
export async function POST(req: Request) {
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const twiml = new VoiceResponse();

  const formData = await req.formData();
  const digits = formData.get('Digits');

  if (digits) {
    // If the caller entered digits for payment
    twiml.say('Processing your secure payment...');
    // Integrate Cashfree/Stripe charging logic here mapping the Digits (cc number)
    twiml.say('Your payment was successful and your room is confirmed.');
  } else {
    // Initial Greeting and prompt for AI handling or Payment
    const gather = twiml.gather({ numDigits: 16, timeout: 10 });
    gather.say('Welcome to Sunset Oasis Hotel. To complete your reservation via secure payment, please enter your 16-digit card number using your keypad.');
  }

  return new NextResponse(twiml.toString(), {
    headers: {
      'Content-Type': 'text/xml',
    },
  });
}
