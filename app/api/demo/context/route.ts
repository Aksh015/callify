import { NextResponse } from "next/server";
import {
  getDefaultDemoContextText,
  getDemoContextText,
  setDemoContextText,
} from "@/lib/demoContextStore";

export async function GET() {
  return NextResponse.json({
    text: getDemoContextText(),
    defaultText: getDefaultDemoContextText(),
  });
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as { text?: string };
  const text = setDemoContextText(String(payload.text || ""));
  return NextResponse.json({ ok: true, text });
}
