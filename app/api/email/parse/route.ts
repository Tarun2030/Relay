import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseEmailToBookings } from '@/lib/email-parser'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { raw_email_text, director_id } = body

  if (!raw_email_text) return NextResponse.json({ error: 'raw_email_text required' }, { status: 400 })
  if (!director_id) return NextResponse.json({ error: 'director_id required' }, { status: 400 })

  // Verify ownership
  const { data: director } = await supabase
    .from('directors')
    .select('id')
    .eq('id', director_id)
    .eq('ea_id', user.id)
    .single()

  if (!director) return NextResponse.json({ error: 'Director not found' }, { status: 404 })

  try {
    const parsedItems = await parseEmailToBookings(raw_email_text)

    if (parsedItems.length === 0) {
      return NextResponse.json({ error: 'No bookings found in this email' }, { status: 422 })
    }

    // Insert all bookings
    const { data: created, error } = await supabase
      .from('bookings')
      .insert(parsedItems.map((item) => ({
        director_id,
        type: item.type,
        date: item.date,
        end_date: item.end_date || null,
        details: item.details,
        parsed_from_email: true,
      })))
      .select()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json(created, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Parse failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
