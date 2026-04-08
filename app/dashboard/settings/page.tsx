'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Calendar, ExternalLink } from 'lucide-react'

function SettingsContent() {
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [ea, setEa] = useState<{ full_name: string; email: string } | null>(null)
  const [hasCalendarToken, setHasCalendarToken] = useState(false)
  const [loading, setLoading] = useState(true)
  const synced = searchParams.get('synced') === 'true'

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [eaRes, tokenRes] = await Promise.all([
        supabase.from('eas').select('full_name, email').eq('id', user.id).single(),
        supabase.from('calendar_tokens').select('id').eq('ea_id', user.id).maybeSingle(),
      ])

      setEa(eaRes.data)
      setHasCalendarToken(!!tokenRes.data)
      setLoading(false)
    }
    load()
  }, [])

  async function handleConnectGoogleCalendar() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const res = await fetch(`/api/calendar/sync?get_auth_url=true&ea_id=${user.id}`)
    const data = await res.json()
    if (data.url) window.location.href = data.url
  }

  if (loading) return <div className="text-muted-foreground">Loading...</div>

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account and integrations</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <p className="text-sm font-medium">{ea?.full_name}</p>
            <p className="text-sm text-muted-foreground">{ea?.email}</p>
          </div>
          <Badge variant="outline">Executive Assistant</Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Google Calendar
          </CardTitle>
          <CardDescription>
            Connect Google Calendar to sync meetings for your directors automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {hasCalendarToken ? (
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">Connected</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleConnectGoogleCalendar}
                className="ml-auto gap-2"
              >
                <ExternalLink className="h-3 w-3" />
                Reconnect
              </Button>
            </div>
          ) : (
            <Button onClick={handleConnectGoogleCalendar} className="gap-2">
              <Calendar className="h-4 w-4" />
              Connect Google Calendar
            </Button>
          )}
          {synced && (
            <p className="text-sm text-green-600 flex items-center gap-1">
              <CheckCircle className="h-3 w-3" /> Calendar connected successfully
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            We request read-only access to your calendar events. Events are synced for the next 60 days and updated automatically every 6 hours.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="text-muted-foreground">Loading...</div>}>
      <SettingsContent />
    </Suspense>
  )
}
