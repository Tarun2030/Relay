import { google } from 'googleapis'

export function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    process.env.GOOGLE_REDIRECT_URI!
  )
}

export function getAuthUrl(state: string) {
  const oauth2Client = getOAuthClient()
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar.readonly'],
    state,
    prompt: 'consent',
  })
}

export async function exchangeCodeForTokens(code: string) {
  const oauth2Client = getOAuthClient()
  const { tokens } = await oauth2Client.getToken(code)
  return tokens
}

export async function getCalendarEvents(
  accessToken: string,
  refreshToken: string,
  calendarId: string = 'primary'
) {
  const oauth2Client = getOAuthClient()
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  })

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

  const now = new Date()
  const future = new Date()
  future.setDate(future.getDate() + 60)

  const response = await calendar.events.list({
    calendarId,
    timeMin: now.toISOString(),
    timeMax: future.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 250,
  })

  return response.data.items || []
}

export function extractMeetingLink(description?: string | null, hangoutLink?: string | null): string | undefined {
  if (hangoutLink) return hangoutLink

  if (!description) return undefined

  const zoomRegex = /https:\/\/[a-z0-9.]+\.zoom\.us\/[^\s<"]+/
  const meetRegex = /https:\/\/meet\.google\.com\/[^\s<"]+/
  const teamsRegex = /https:\/\/teams\.microsoft\.com\/[^\s<"]+/

  const zoomMatch = description.match(zoomRegex)
  if (zoomMatch) return zoomMatch[0]

  const meetMatch = description.match(meetRegex)
  if (meetMatch) return meetMatch[0]

  const teamsMatch = description.match(teamsRegex)
  if (teamsMatch) return teamsMatch[0]

  return undefined
}
