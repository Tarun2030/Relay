import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const directorId = url.searchParams.get('director_id')

  let query = supabase
    .from('bookings')
    .select('*')

  if (directorId) {
    // Verify ownership
    const { data: director } = await supabase
      .from('directors')
      .select('id')
      .eq('id', directorId)
      .eq('ea_id', user.id)
      .single()

    if (!director) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    query = query.eq('director_id', directorId)
  }

  const { data, error } = await query.order('date', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { director_id, type, date, end_date, status, details } = body

  // Verify ownership
  const { data: director } = await supabase
    .from('directors')
    .select('id')
    .eq('id', director_id)
    .eq('ea_id', user.id)
    .single()

  if (!director) return NextResponse.json({ error: 'Director not found' }, { status: 404 })

  const { data, error } = await supabase
    .from('bookings')
    .insert({ director_id, type, date, end_date, status: status || 'confirmed', details })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
