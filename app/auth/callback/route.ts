import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error_description") || searchParams.get("error");
  const redirectRaw = searchParams.get("redirect") || "/onboarding";

  // Only allow relative in-app redirects to avoid open redirects.
  const redirect = redirectRaw.startsWith("/") ? redirectRaw : "/onboarding";

  if (oauthError) {
    return NextResponse.redirect(
      `${origin}/auth/login?error=${encodeURIComponent(oauthError)}&redirect=${encodeURIComponent(redirect)}`,
    );
  }

  if (code) {
    const supabase = await createClient();

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        `${origin}/auth/login?error=${encodeURIComponent(error.message)}&redirect=${encodeURIComponent(redirect)}`,
      );
    }
  }

  return NextResponse.redirect(`${origin}${redirect}`);
}
