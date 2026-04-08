import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function verifyOwnership(supabase: Awaited<ReturnType<typeof createClient>>, bookingId: string, userId: string) {
  const { data } = await supabase
    .from('bookings')
    .select('id, directors!inner(ea_id)')
    .eq('id', bookingId)
    .single()

  if (!data) return false
  const director = (data as { directors: { ea_id: string } | { ea_id: string }[] }).directors
  const eaId = Array.isArray(director) ? director[0]?.ea_id : director?.ea_id
  return eaId === userId
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const owned = await verifyOwnership(supabase, id, user.id)
  if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json()
  const { data, error } = await supabase
    .from('bookings')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const owned = await verifyOwnership(supabase, id, user.id)
  if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { error } = await supabase.from('bookings').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
