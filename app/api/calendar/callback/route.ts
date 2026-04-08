import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { exchangeCodeForTokens, getAuthUrl } from '@/lib/google-calendar'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state') // ea_id passed as state
  const error = url.searchParams.get('error')

  if (error) {
    return NextResponse.redirect(new URL('/dashboard/settings?error=calendar_denied', request.url))
  }

  // Handle initial connect redirect (get auth URL)
  if (url.searchParams.get('connect') === 'true') {
    const eaId = url.searchParams.get('ea_id')
    if (!eaId) return NextResponse.redirect(new URL('/dashboard/settings', request.url))
    const authUrl = getAuthUrl(eaId)
    return NextResponse.redirect(authUrl)
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL('/dashboard/settings?error=missing_params', request.url))
  }

  const eaId = state

  try {
    const tokens = await exchangeCodeForTokens(code)

    const supabase = await createServiceClient()
    await supabase
      .from('calendar_tokens')
      .upsert({
        ea_id: eaId,
        access_token: tokens.access_token!,
        refresh_token: tokens.refresh_token!,
        expiry: new Date(tokens.expiry_date!).toISOString(),
      }, { onConflict: 'ea_id' })

    return NextResponse.redirect(new URL('/dashboard/settings?synced=true', request.url))
  } catch (err) {
    console.error('Calendar callback error:', err)
    return NextResponse.redirect(new URL('/dashboard/settings?error=token_exchange', request.url))
  }
}
