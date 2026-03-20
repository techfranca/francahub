import { google } from 'googleapis'
import { createClient } from '@/lib/supabase/server'

const SCOPES = ['https://www.googleapis.com/auth/calendar.events']

export function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID!,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/google-calendar/callback`
  )
}

export function getAuthUrl() {
  const oauth2Client = getOAuthClient()
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  })
}

export async function getCalendarClient() {
  const supabase = createClient()
  const { data } = await supabase
    .from('hub_integrations')
    .select('*')
    .eq('provider', 'google_calendar')
    .single()

  if (!data?.access_token) return null

  const oauth2Client = getOAuthClient()
  oauth2Client.setCredentials({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expiry_date: data.token_expiry ? new Date(data.token_expiry).getTime() : undefined,
  })

  // Auto-refresh token if expired
  oauth2Client.on('tokens', async (tokens) => {
    const update: Record<string, string> = { updated_at: new Date().toISOString() }
    if (tokens.access_token) update.access_token = tokens.access_token
    if (tokens.expiry_date) update.token_expiry = new Date(tokens.expiry_date).toISOString()
    await supabase
      .from('hub_integrations')
      .update(update)
      .eq('provider', 'google_calendar')
  })

  return google.calendar({ version: 'v3', auth: oauth2Client })
}

export async function isCalendarConnected(): Promise<boolean> {
  const supabase = createClient()
  const { data } = await supabase
    .from('hub_integrations')
    .select('id')
    .eq('provider', 'google_calendar')
    .single()
  return !!data
}

export interface CalendarEventInput {
  title: string
  description?: string
  startDateTime: string  // ISO string
  durationMinutes: number
  clientEmail?: string | null
  meetLink?: string | null
}

export interface CalendarEventResult {
  success: boolean
  eventId?: string
  meetLink?: string
  htmlLink?: string
  error?: string
}

export async function createCalendarEvent(input: CalendarEventInput): Promise<CalendarEventResult> {
  try {
    const calendar = await getCalendarClient()
    if (!calendar) return { success: false, error: 'Google Calendar não conectado' }

    const start = new Date(input.startDateTime)
    const end = new Date(start.getTime() + (input.durationMinutes || 60) * 60 * 1000)

    const attendees = input.clientEmail ? [{ email: input.clientEmail }] : []

    const event = await calendar.events.insert({
      calendarId: 'primary',
      conferenceDataVersion: 1,
      requestBody: {
        summary: input.title,
        description: input.description || '',
        start: { dateTime: start.toISOString(), timeZone: 'America/Sao_Paulo' },
        end: { dateTime: end.toISOString(), timeZone: 'America/Sao_Paulo' },
        attendees,
        conferenceData: {
          createRequest: {
            requestId: `franca-hub-${Date.now()}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
      },
    })

    const meetLink = event.data.conferenceData?.entryPoints?.find(
      ep => ep.entryPointType === 'video'
    )?.uri || input.meetLink || null

    return {
      success: true,
      eventId: event.data.id || undefined,
      meetLink: meetLink || undefined,
      htmlLink: event.data.htmlLink || undefined,
    }
  } catch (error) {
    console.error('Error creating calendar event:', error)
    return { success: false, error: String(error) }
  }
}

export async function updateCalendarEvent(
  eventId: string,
  input: Partial<CalendarEventInput>
): Promise<CalendarEventResult> {
  try {
    const calendar = await getCalendarClient()
    if (!calendar) return { success: false, error: 'Google Calendar não conectado' }

    const patch: Record<string, unknown> = {}
    if (input.title) patch.summary = input.title
    if (input.description !== undefined) patch.description = input.description
    if (input.startDateTime) {
      const start = new Date(input.startDateTime)
      const end = new Date(start.getTime() + (input.durationMinutes || 60) * 60 * 1000)
      patch.start = { dateTime: start.toISOString(), timeZone: 'America/Sao_Paulo' }
      patch.end = { dateTime: end.toISOString(), timeZone: 'America/Sao_Paulo' }
    }

    const event = await calendar.events.patch({
      calendarId: 'primary',
      eventId,
      requestBody: patch,
    })

    return { success: true, eventId: event.data.id || undefined, htmlLink: event.data.htmlLink || undefined }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function deleteCalendarEvent(eventId: string): Promise<boolean> {
  try {
    const calendar = await getCalendarClient()
    if (!calendar) return false
    await calendar.events.delete({ calendarId: 'primary', eventId })
    return true
  } catch {
    return false
  }
}
