'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BookingForm } from '@/components/booking-form'
import { BookingRow } from '@/components/booking-row'
import { ProjectBoard } from '@/components/project-board'
import { CalendarEventRow } from '@/components/calendar-event-row'
import { Badge } from '@/components/ui/badge'
import type { Director, Booking, BookingType, CalendarEvent, Project, PushMessage } from '@/types'
import { bookingTypeLabels, bookingTypeIcons, bookingTypeColors, getDirectorShareUrl, formatRelative, cn } from '@/lib/utils'
import { ArrowLeft, Copy, Check, RefreshCw, Send, QrCode } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

const BOOKING_TYPES: BookingType[] = ['flight', 'hotel', 'event', 'cab', 'restaurant']

export default function DirectorDetailPage({ params }: { params: { id: string } }) {
  const { id } = params
  const router = useRouter()
  const supabase = createClient()

  const [director, setDirector] = useState<Director | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [pushMessages, setPushMessages] = useState<PushMessage[]>([])
  const [ea, setEa] = useState<{ full_name: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [showBookingForm, setShowBookingForm] = useState(false)
  const [editingBooking, setEditingBooking] = useState<Booking | undefined>()
  const [pushMessage, setPushMessage] = useState('')
  const [sendingPush, setSendingPush] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [editingInfo, setEditingInfo] = useState(false)
  const [directorForm, setDirectorForm] = useState({ full_name: '', email: '', title: '', company: '' })

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const [dirRes, eaRes, bookRes, calRes, projRes, msgRes] = await Promise.all([
        supabase.from('directors').select('*').eq('id', id).eq('ea_id', user.id).single(),
        supabase.from('eas').select('full_name').eq('id', user.id).single(),
        supabase.from('bookings').select('*').eq('director_id', id).order('date', { ascending: true }),
        supabase.from('calendar_events').select('*').eq('director_id', id).order('start_time', { ascending: true }),
        supabase.from('projects').select('*, updates:project_updates(*)').eq('director_id', id).order('created_at', { ascending: false }),
        supabase.from('push_messages').select('*').eq('director_id', id).order('created_at', { ascending: false }).limit(5),
      ])

      if (dirRes.error || !dirRes.data) { router.push('/dashboard'); return }

      setDirector(dirRes.data)
      setDirectorForm({
        full_name: dirRes.data.full_name,
        email: dirRes.data.email || '',
        title: dirRes.data.title || '',
        company: dirRes.data.company || '',
      })
      setEa(eaRes.data)
      setBookings(bookRes.data || [])
      setCalendarEvents(calRes.data || [])
      const projs = (projRes.data || []).map((p: Project & { updates: unknown[] }) => ({
        ...p,
        updates: (p.updates || []).sort(
          (a: { created_at: string }, b: { created_at: string }) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ),
      }))
      setProjects(projs)
      setPushMessages(msgRes.data || [])
      setLoading(false)
    }

    load()

    // Realtime subscription
    const channel = supabase
      .channel(`director-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `director_id=eq.${id}` }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calendar_events', filter: `director_id=eq.${id}` }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'push_messages', filter: `director_id=eq.${id}` }, () => load())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [id])

  async function handleSaveBooking(data: Partial<Booking>) {
    if (editingBooking) {
      const res = await fetch(`/api/bookings/${editingBooking.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to update booking')
      const updated = await res.json()
      setBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)))
    } else {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to create booking')
      const created = await res.json()
      setBookings((prev) => [...prev, created].sort((a, b) => a.date.localeCompare(b.date)))
    }
    setEditingBooking(undefined)
    setShowBookingForm(false)
  }

  async function handleDeleteBooking(bookingId: string) {
    await fetch(`/api/bookings/${bookingId}`, { method: 'DELETE' })
    setBookings((prev) => prev.filter((b) => b.id !== bookingId))
  }

  async function handleSendPush() {
    if (!pushMessage.trim()) return
    setSendingPush(true)
    const res = await fetch('/api/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ director_id: id, message: pushMessage.trim() }),
    })
    if (res.ok) {
      const msg = await res.json()
      setPushMessages((prev) => [msg, ...prev].slice(0, 5))
      setPushMessage('')
    }
    setSendingPush(false)
  }

  async function handleSync() {
    setSyncing(true)
    await fetch(`/api/calendar/sync?director_id=${id}`)
    setSyncing(false)
    // Refresh events
    const { data } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('director_id', id)
      .order('start_time', { ascending: true })
    setCalendarEvents(data || [])
  }

  async function handleSaveDirectorInfo() {
    const res = await fetch(`/api/directors/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(directorForm),
    })
    if (res.ok) {
      const updated = await res.json()
      setDirector(updated)
      setEditingInfo(false)
    }
  }

  async function handleCopyLink() {
    if (!director) return
    await navigator.clipboard.writeText(getDirectorShareUrl(director.share_token))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading...</div>
  }

  if (!director) return null

  const shareUrl = getDirectorShareUrl(director.share_token)

  const groupedBookings = BOOKING_TYPES.reduce((acc, type) => {
    acc[type] = bookings.filter((b) => b.type === type)
    return acc
  }, {} as Record<BookingType, Booking[]>)

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <Button variant="ghost" asChild className="gap-1 -ml-2 text-muted-foreground">
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4" />
            All Directors
          </Link>
        </Button>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{director.full_name}</h1>
          {director.title && <p className="text-muted-foreground">{director.title}{director.company ? ` · ${director.company}` : ''}</p>}
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Left column: 60% */}
        <div className="lg:col-span-3 space-y-4">
          <Tabs defaultValue="bookings">
            <TabsList className="w-full">
              <TabsTrigger value="bookings" className="flex-1">Bookings</TabsTrigger>
              <TabsTrigger value="meetings" className="flex-1">Meetings</TabsTrigger>
              <TabsTrigger value="projects" className="flex-1">Projects</TabsTrigger>
            </TabsList>

            <TabsContent value="bookings" className="space-y-4 mt-4">
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={() => { setEditingBooking(undefined); setShowBookingForm(true) }}
                >
                  Add Booking
                </Button>
              </div>
              {BOOKING_TYPES.map((type) => {
                const typeBookings = groupedBookings[type]
                if (typeBookings.length === 0) return null
                const colors = bookingTypeColors[type]
                return (
                  <div key={type} className="space-y-2">
                    <h3 className={cn('text-sm font-semibold flex items-center gap-2', colors.text)}>
                      <span>{bookingTypeIcons[type]}</span>
                      {bookingTypeLabels[type]}s
                    </h3>
                    {typeBookings.map((booking) => (
                      <BookingRow
                        key={booking.id}
                        booking={booking}
                        onEdit={(b) => { setEditingBooking(b); setShowBookingForm(true) }}
                        onDelete={handleDeleteBooking}
                      />
                    ))}
                  </div>
                )
              })}
              {bookings.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">No bookings yet. Add one to get started.</p>
              )}
            </TabsContent>

            <TabsContent value="meetings" className="space-y-4 mt-4">
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSync}
                  disabled={syncing}
                  className="gap-2"
                >
                  <RefreshCw className={cn('h-4 w-4', syncing && 'animate-spin')} />
                  {syncing ? 'Syncing...' : 'Sync Calendar'}
                </Button>
              </div>
              <div className="space-y-2">
                {calendarEvents.map((event) => (
                  <CalendarEventRow key={event.id} event={event} />
                ))}
                {calendarEvents.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No meetings synced yet. Connect Google Calendar in Settings and click Sync.
                  </p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="projects" className="mt-4">
              <ProjectBoard
                directorId={id}
                initialProjects={projects}
                eaName={ea?.full_name || 'EA'}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Right column: 40% */}
        <div className="lg:col-span-2 space-y-4">
          {/* Push Message */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Push Message</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={pushMessage}
                onChange={(e) => setPushMessage(e.target.value)}
                placeholder="Write a message for the director..."
                className="min-h-[80px]"
              />
              <Button
                size="sm"
                className="w-full gap-2"
                onClick={handleSendPush}
                disabled={sendingPush || !pushMessage.trim()}
              >
                <Send className="h-4 w-4" />
                {sendingPush ? 'Sending...' : 'Send to Director'}
              </Button>
              {pushMessages.length > 0 && (
                <div className="space-y-2 pt-2 border-t">
                  <p className="text-xs font-medium text-muted-foreground">Recent messages</p>
                  {pushMessages.map((msg) => (
                    <div key={msg.id} className="text-xs p-2 rounded-md bg-muted">
                      <p>{msg.message}</p>
                      <p className="text-muted-foreground mt-1">{formatRelative(msg.created_at)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Share Link */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Director Share Link</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input value={shareUrl} readOnly className="text-xs" />
                <Button size="icon" variant="outline" onClick={handleCopyLink}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <div className="flex justify-center p-3 bg-white rounded-md border">
                <QRCodeSVG value={shareUrl} size={140} />
              </div>
            </CardContent>
          </Card>

          {/* Director Info */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Director Info</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editingInfo ? handleSaveDirectorInfo() : setEditingInfo(true)}
                >
                  {editingInfo ? 'Save' : 'Edit'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {editingInfo ? (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs">Full Name</Label>
                    <Input value={directorForm.full_name} onChange={(e) => setDirectorForm((f) => ({ ...f, full_name: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Email</Label>
                    <Input value={directorForm.email} onChange={(e) => setDirectorForm((f) => ({ ...f, email: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Title</Label>
                    <Input value={directorForm.title} onChange={(e) => setDirectorForm((f) => ({ ...f, title: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Company</Label>
                    <Input value={directorForm.company} onChange={(e) => setDirectorForm((f) => ({ ...f, company: e.target.value }))} />
                  </div>
                  <Button variant="outline" size="sm" className="w-full" onClick={() => setEditingInfo(false)}>
                    Cancel
                  </Button>
                </>
              ) : (
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Name</dt>
                    <dd>{director.full_name}</dd>
                  </div>
                  {director.email && (
                    <div>
                      <dt className="text-xs text-muted-foreground">Email</dt>
                      <dd>{director.email}</dd>
                    </div>
                  )}
                  {director.title && (
                    <div>
                      <dt className="text-xs text-muted-foreground">Title</dt>
                      <dd>{director.title}</dd>
                    </div>
                  )}
                  {director.company && (
                    <div>
                      <dt className="text-xs text-muted-foreground">Company</dt>
                      <dd>{director.company}</dd>
                    </div>
                  )}
                </dl>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {showBookingForm && (
        <BookingForm
          directorId={id}
          booking={editingBooking}
          onSave={handleSaveBooking}
          onClose={() => { setShowBookingForm(false); setEditingBooking(undefined) }}
        />
      )}
    </div>
  )
}
