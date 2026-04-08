import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
import { DirectorCard } from '@/components/director-card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: directors } = await supabase
    .from('directors')
    .select('*')
    .eq('ea_id', user.id)
    .order('created_at', { ascending: false })

  // Fetch stats for each director
  const directorsWithStats = await Promise.all(
    (directors || []).map(async (director) => {
      const [bookingsRes, projectsRes, messagesRes] = await Promise.all([
        supabase
          .from('bookings')
          .select('id', { count: 'exact' })
          .eq('director_id', director.id),
        supabase
          .from('projects')
          .select('id', { count: 'exact' })
          .eq('director_id', director.id)
          .neq('status', 'completed'),
        supabase
          .from('push_messages')
          .select('id', { count: 'exact' })
          .eq('director_id', director.id)
          .eq('is_read', false),
      ])

      return {
        director,
        stats: {
          bookings: bookingsRes.count || 0,
          projects: projectsRes.count || 0,
          unreadMessages: messagesRes.count || 0,
        },
      }
    })
  )

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Directors</h1>
          <p className="text-muted-foreground">Manage your directors&apos; schedules and bookings</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/directors/new">
            <Plus className="h-4 w-4" />
            Add Director
          </Link>
        </Button>
      </div>

      {directorsWithStats.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed rounded-xl">
          <div className="text-4xl mb-4">👋</div>
          <h2 className="text-xl font-semibold mb-2">Welcome to Relay</h2>
          <p className="text-muted-foreground mb-6">Add your first director to get started.</p>
          <Button asChild>
            <Link href="/dashboard/directors/new">
              <Plus className="h-4 w-4" />
              Add your first director
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {directorsWithStats.map(({ director, stats }) => (
            <DirectorCard key={director.id} director={director} stats={stats} />
          ))}
        </div>
      )}
    </div>
  )
}
