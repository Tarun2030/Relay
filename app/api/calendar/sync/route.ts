import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthUrl, getCalendarEvents, extractMeetingLink, getOAuthClient } from '@/lib/google-calendar'

export async function GET(request: Request) {
  const supabase = await createClient()
  const url = new URL(request.url)

  // Return auth URL for connecting calendar
  if (url.searchParams.get('get_auth_url') === 'true') {
    const eaId = url.searchParams.get('ea_id')
    if (!eaId) return NextResponse.json({ error: 'ea_id required' }, { status: 400 })
    const authUrl = getAuthUrl(eaId)
    return NextResponse.json({ url: authUrl })
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const directorId = url.searchParams.get('director_id')
  if (!directorId) return NextResponse.json({ error: 'director_id required' }, { status: 400 })

  // Get calendar token
  const { data: tokenRow } = await supabase
    .from('calendar_tokens')
    .select('*')
    .eq('ea_id', user.id)
    .single()

  if (!tokenRow) {
    return NextResponse.json({ error: 'Calendar not connected. Go to Settings to connect Google Calendar.' }, { status: 400 })
  }

  let { access_token, refresh_token, expiry } = tokenRow

  // Refresh if expired
  if (new Date(expiry) < new Date()) {
    try {
      const oauth2Client = getOAuthClient()
      oauth2Client.setCredentials({ refresh_token })
      const { credentials } = await oauth2Client.refreshAccessToken()
      access_token = credentials.access_token!
      expiry = new Date(credentials.expiry_date!).toISOString()

      await supabase
        .from('calendar_tokens')
        .update({ access_token, expiry })
        .eq('ea_id', user.id)
    } catch {
      return NextResponse.json({ error: 'Failed to refresh calendar token' }, { status: 500 })
    }
  }

  try {
    const events = await getCalendarEvents(access_token, refresh_token)

    const upsertData = events.map((event) => {
      // All-day events only have a `date` (YYYY-MM-DD), not `dateTime`.
      // Store them as midnight UTC so they display as a date without a broken time.
      const startRaw = event.start?.dateTime || (event.start?.date ? `${event.start.date}T00:00:00` : null) || new Date().toISOString()
      const endRaw   = event.end?.dateTime   || (event.end?.date   ? `${event.end.date}T00:00:00`   : null) || new Date().toISOString()
      return {
        director_id: directorId,
        google_event_id: event.id,
        title: event.summary || 'Untitled',
        start_time: startRaw,
        end_time: endRaw,
        location: event.location || null,
        description: event.description || null,
        meeting_link: extractMeetingLink(event.description, event.hangoutLink) || null,
        attendees: (event.attendees || []).map((a) => a.email || '').filter(Boolean),
        synced_at: new Date().toISOString(),
      }
    })

    if (upsertData.length > 0) {
      await supabase
        .from('calendar_events')
        .upsert(upsertData, { onConflict: 'google_event_id' })
    }

    return NextResponse.json({ synced: upsertData.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sync failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
