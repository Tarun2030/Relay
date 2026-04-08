import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const directorId = url.searchParams.get('director_id')
  if (!directorId) return NextResponse.json({ error: 'director_id required' }, { status: 400 })

  const { data, error } = await supabase
    .from('projects')
    .select('*, updates:project_updates(*)')
    .eq('director_id', directorId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { director_id, name, status, description } = body

  // Verify ownership
  const { data: director } = await supabase
    .from('directors')
    .select('id')
    .eq('id', director_id)
    .eq('ea_id', user.id)
    .single()

  if (!director) return NextResponse.json({ error: 'Director not found' }, { status: 404 })

  const { data, error } = await supabase
    .from('projects')
    .insert({ director_id, name, status: status || 'on_track', description })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
