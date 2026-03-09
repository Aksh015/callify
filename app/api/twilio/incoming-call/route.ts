import { NextRequest, NextResponse } from "next/server";
import { twiml } from "@/lib/twilio";

export async function POST(req: NextRequest) {
  try {
    // Twilio sends data as URL-encoded form data
    const formData = await req.formData();
    const to = formData.get("To") as string;
    const from = formData.get("From") as string;
    
    // Determine which plan triggered the call based on the 'To' number
    const starterNumber = process.env.TWILIO_STARTER_NUMBER;
    const proNumber = process.env.TWILIO_PRO_NUMBER;
    
    let persona = "Hotel AI Assistant";
    if (to === starterNumber) {
      persona = "Starter Hotel Assistant";
    } else if (to === proNumber) {
      persona = "Pro Hotel Concierge";
    }

    // Build the Initial TwiML response
    const voiceResponse = new twiml.VoiceResponse();

    // 1. Greet the caller
    voiceResponse.say(`Welcome to Callify. You are connected to the ${persona}. Please wait while we connect your call to the AI engine.`);

    // 2. Pause briefly
    voiceResponse.pause({ length: 1 });

    // 3. (FUTURE IMPLEMENTATION) 
    // This is where we will use <Connect><Stream> to open a WebSocket
    // to your real-time AI (Gemini/OpenAI) engine.
    // voiceResponse.connect().stream({ url: 'wss://your-domain.com/api/twilio/stream' });
    
    voiceResponse.say("This is a demo routing setup. The voice stream integration will be added next. Goodbye!");
    
    // Return standard XML response required by Twilio
    return new NextResponse(voiceResponse.toString(), {
        status: 200,
        headers: {
            "Content-Type": "text/xml",
        },
    });
  } catch (error) {
    console.error("[Twilio Incoming Call] Error:", error);
    return new NextResponse(
      `<Response><Say>An internal server error occurred.</Say></Response>`,
      { status: 500, headers: { "Content-Type": "text/xml" } }
    );
  }
}
