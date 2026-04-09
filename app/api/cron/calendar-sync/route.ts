import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getCalendarEvents, extractMeetingLink, getOAuthClient } from '@/lib/google-calendar'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createServiceClient()

  // Get all EA tokens
  const { data: tokens } = await supabase.from('calendar_tokens').select('*')
  if (!tokens || tokens.length === 0) return NextResponse.json({ synced: 0 })

  let totalSynced = 0

  for (const tokenRow of tokens) {
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
          .eq('ea_id', tokenRow.ea_id)
      } catch {
        continue
      }
    }

    // Get all directors for this EA
    const { data: directors } = await supabase
      .from('directors')
      .select('id')
      .eq('ea_id', tokenRow.ea_id)

    if (!directors) continue

    for (const director of directors) {
      try {
        const events = await getCalendarEvents(access_token, refresh_token)
        const upsertData = events.map((event) => {
          const startRaw = event.start?.dateTime || (event.start?.date ? `${event.start.date}T00:00:00` : null) || new Date().toISOString()
          const endRaw   = event.end?.dateTime   || (event.end?.date   ? `${event.end.date}T00:00:00`   : null) || new Date().toISOString()
          return {
            director_id: director.id,
            google_event_id: event.id,
            title: event.summary || 'Untitled',
            start_time: startRaw,
            end_time: endRaw,
            location: event.location || null,
            description: event.description || null,
            meeting_link: extractMeetingLink(event.description, event.hangoutLink) || null,
            attendees: (event.attendees || []).map((a) => a.email ?? '').filter(Boolean),
            synced_at: new Date().toISOString(),
          }
        })

        if (upsertData.length > 0) {
          await supabase
            .from('calendar_events')
            .upsert(upsertData, { onConflict: 'google_event_id' })
          totalSynced += upsertData.length
        }
      } catch {
        // Continue with next director
      }
    }
  }

  return NextResponse.json({ synced: totalSynced })
}
