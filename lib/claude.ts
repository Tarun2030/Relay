import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export async function parseBookingEmail(rawEmailText: string) {
  const systemPrompt = `You are an email parser for a travel booking system.
Extract ALL bookings from the email. An itinerary can contain multiple flights, hotels, transfers, etc.
Return a JSON ARRAY — one object per booking segment. Never return a single object, always an array.

Each object:
{
  type: 'flight' | 'hotel' | 'event' | 'cab' | 'restaurant',
  date: 'YYYY-MM-DD',
  end_date: 'YYYY-MM-DD' (if applicable, e.g. hotel checkout),
  details: { ...all relevant fields for that type }
}

Field schemas:
Flight: flight_number, airline, origin, destination,
  departure_time (ISO 8601), arrival_time (ISO 8601),
  pnr, seat, class, terminal, gate, passenger_name
Hotel: property_name, city, address, check_in (YYYY-MM-DD),
  check_out (YYYY-MM-DD), confirmation_number, room_type, contact_number
Event: event_name, venue, city, start_time (ISO 8601),
  end_time (ISO 8601), ticket_number, seat, dress_code
Cab: provider, pickup_location, drop_location,
  pickup_time (ISO 8601), booking_id, driver_name, driver_contact
Restaurant: restaurant_name, location,
  reservation_time (ISO 8601), party_size, confirmation_number

Rules:
- Each flight leg is a separate object (outbound and return are two objects)
- arrival_time that crosses midnight should still use the correct date (e.g. 2026-04-10T06:30:00)
- Return ONLY valid JSON array, no explanation, no markdown`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 2048,
    system: systemPrompt,
    messages: [{ role: 'user', content: rawEmailText }],
  })

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type from Claude')

  let jsonText = content.text.trim()
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '')
  }

  const parsed = JSON.parse(jsonText)
  // Normalise: always return an array
  return Array.isArray(parsed) ? parsed : [parsed]
}
