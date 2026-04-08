import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseEmailToBooking } from '@/lib/email-parser'

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
    const parsed = await parseEmailToBooking(raw_email_text)
    return NextResponse.json(parsed)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Parse failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
