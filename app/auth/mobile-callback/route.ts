import { NextResponse } from "next/server";

/**
 * OAuth Mobile Proxy
 *
 * Supabase redirects here (HTTPS) after Google/Facebook OAuth completes.
 * We forward the `code` to the mobile app deep link so it can call
 * supabase.auth.exchangeCodeForSession(code).
 *
 * Flow:
 *   1. Mobile app calls signInWithOAuth({ redirectTo: THIS_URL?app_redirect=exp://... })
 *   2. Google OAuth → Supabase callback → THIS_URL?code=XXX&app_redirect=exp://...
 *   3. We redirect to exp://...?code=XXX
 *   4. OS opens Expo Go / native app, which calls exchangeCodeForSession(code)
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const appRedirect = searchParams.get("app_redirect");

  if (!code || !appRedirect) {
    return NextResponse.redirect(`${origin}/login?error=missing_params`);
  }

  const separator = appRedirect.includes("?") ? "&" : "?";
  const redirectUrl = `${appRedirect}${separator}code=${encodeURIComponent(code)}`;

  return NextResponse.redirect(redirectUrl);
}
