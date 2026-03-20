import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getOAuthClient } from '@/lib/integrations/google-calendar'
import { google } from 'googleapis'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', request.url))

  const code = request.nextUrl.searchParams.get('code')
  const error = request.nextUrl.searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(
      new URL('/settings/integrations?error=calendar_denied', request.url)
    )
  }

  try {
    const oauth2Client = getOAuthClient()
    const { tokens } = await oauth2Client.getToken(code)

    // Get user info (email)
    oauth2Client.setCredentials(tokens)
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
    const userInfo = await oauth2.userinfo.get()

    // Upsert integration record
    const { error: dbError } = await supabase
      .from('hub_integrations')
      .upsert({
        provider: 'google_calendar',
        account_email: userInfo.data.email || null,
        access_token: tokens.access_token!,
        refresh_token: tokens.refresh_token || null,
        token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
        status: 'active',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'provider' })

    if (dbError) throw dbError

    return NextResponse.redirect(
      new URL('/settings/integrations?success=calendar_connected', request.url)
    )
  } catch (err) {
    console.error('Google Calendar OAuth error:', err)
    return NextResponse.redirect(
      new URL('/settings/integrations?error=calendar_failed', request.url)
    )
  }
}
