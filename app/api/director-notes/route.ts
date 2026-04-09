import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// Director posts a voice note from the public page (no auth session)
export async function POST(request: Request) {
  const body = await request.json()
  const { director_id, section, note } = body

  if (!director_id || !section || !note?.trim()) {
    return NextResponse.json({ error: 'director_id, section, and note are required' }, { status: 400 })
  }

  // Use service client — director is not authenticated
  const supabase = await createServiceClient()

  // Verify the director actually exists before accepting the note
  const { data: director } = await supabase
    .from('directors')
    .select('id')
    .eq('id', director_id)
    .single()

  if (!director) {
    return NextResponse.json({ error: 'Director not found' }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('director_notes')
    .insert({ director_id, section, note: note.trim() })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

// EA fetches notes for a director (authenticated)
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const directorId = url.searchParams.get('director_id')
  if (!directorId) return NextResponse.json({ error: 'director_id required' }, { status: 400 })

  // Verify EA owns this director
  const { data: director } = await supabase
    .from('directors')
    .select('id')
    .eq('id', directorId)
    .eq('ea_id', user.id)
    .single()

  if (!director) return NextResponse.json({ error: 'Director not found' }, { status: 404 })

  const { data, error } = await supabase
    .from('director_notes')
    .select('*')
    .eq('director_id', directorId)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// EA marks a note as read
export async function PATCH(request: Request) {
  const supabase = await createServiceClient()
  const url = new URL(request.url)
  const id = url.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabase
    .from('director_notes')
    .update({ is_read: true })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
