import { createClient } from '@/lib/supabase/server'
import { DirectorView } from '@/components/director-view'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ token: string }>
}

export default async function DirectorPublicPage({ params }: PageProps) {
  const { token } = await params
  const supabase = await createClient()

  // Find director by share_token (public access)
  const { data: director } = await supabase
    .from('directors')
    .select('*')
    .eq('share_token', token)
    .single()

  if (!director) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-5xl mb-4">🔗</div>
          <h1 className="text-xl font-semibold mb-2">Invalid link</h1>
          <p className="text-muted-foreground">This director link doesn&apos;t exist or has been removed.</p>
        </div>
      </div>
    )
  }

  const [eaRes, bookingsRes, calRes, projRes, msgRes] = await Promise.all([
    supabase.from('eas').select('full_name').eq('id', director.ea_id).single(),
    supabase.from('bookings').select('*').eq('director_id', director.id).order('date', { ascending: true }),
    supabase.from('calendar_events').select('*').eq('director_id', director.id).order('start_time', { ascending: true }),
    supabase.from('projects').select('*, updates:project_updates(*)').eq('director_id', director.id).order('created_at', { ascending: false }),
    supabase.from('push_messages').select('*').eq('director_id', director.id).eq('is_read', false).order('created_at', { ascending: false }),
  ])

  const projects = (projRes.data || []).map((p) => ({
    ...p,
    updates: (p.updates || []).sort(
      (a: { created_at: string }, b: { created_at: string }) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ),
  }))

  return (
    <DirectorView
      director={director}
      eaName={eaRes.data?.full_name || 'Your EA'}
      initialBookings={bookingsRes.data || []}
      initialCalendarEvents={calRes.data || []}
      initialProjects={projects}
      initialPushMessages={msgRes.data || []}
    />
  )
}
