import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export async function parseBookingEmail(rawEmailText: string) {
  const systemPrompt = `You are an email parser for a travel booking system.
Extract booking details from the email text below.
Return a JSON object with these fields:
{
  type: 'flight' | 'hotel' | 'event' | 'cab' | 'restaurant',
  date: 'YYYY-MM-DD',
  end_date: 'YYYY-MM-DD' (if applicable),
  details: { ...all relevant fields for that type }
}
Use the exact field names from these schemas:
Flight: flight_number, airline, origin, destination,
  departure_time (ISO 8601), arrival_time (ISO 8601),
  pnr, seat, class, terminal, gate, passenger_name
Hotel: property_name, city, address, check_in (YYYY-MM-DD),
  check_out (YYYY-MM-DD), confirmation_number, room_type,
  contact_number
Event: event_name, venue, city, start_time (ISO 8601),
  end_time (ISO 8601), ticket_number, seat, dress_code
Cab: provider, pickup_location, drop_location,
  pickup_time (ISO 8601), booking_id, driver_name,
  driver_contact
Restaurant: restaurant_name, location,
  reservation_time (ISO 8601), party_size,
  confirmation_number
Return ONLY valid JSON, no explanation.`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: rawEmailText,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude')
  }

  // Strip markdown code blocks if present
  let jsonText = content.text.trim()
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '')
  }

  return JSON.parse(jsonText)
}
