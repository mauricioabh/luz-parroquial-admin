import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin
  const nextUrl = requestUrl.searchParams.get('next') ?? '/'

  const redirectUrl = new URL(nextUrl.startsWith('/') ? nextUrl : `/${nextUrl}`, origin)
  const redirectResponse = NextResponse.redirect(redirectUrl)

  if (code) {
    const publishableKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      publishableKey!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              redirectResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    await supabase.auth.exchangeCodeForSession(code)
  }

  return redirectResponse
}

