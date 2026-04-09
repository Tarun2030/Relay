'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PushMessageBanner } from '@/components/push-message-banner'
import { VoiceNoteButton } from '@/components/voice-note-button'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type {
  Director, Booking, CalendarEvent, Project, PushMessage,
  FlightDetails, HotelDetails, EventDetails, CabDetails, RestaurantDetails,
} from '@/types'
import {
  formatDate, formatDateTime, formatTime, formatRelative,
  isPast, isWithinNextDays, cn,
} from '@/lib/utils'
import { ExternalLink, ChevronDown, ChevronUp, MapPin } from 'lucide-react'

interface DirectorViewProps {
  director: Director
  eaName: string
  initialBookings: Booking[]
  initialCalendarEvents: CalendarEvent[]
  initialProjects: Project[]
  initialPushMessages: PushMessage[]
}

// ─── Status badges ────────────────────────────────────────────────────────────
const bookingStatusClass: Record<string, string> = {
  confirmed: 'bg-green-50 text-green-700 border border-green-200',
  pending:   'bg-yellow-50 text-yellow-700 border border-yellow-200',
  cancelled: 'bg-red-50 text-red-600 border border-red-200',
}
const projectStatusClass: Record<string, string> = {
  on_track:        'bg-green-50 text-green-700 border border-green-200',
  needs_attention: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  blocked:         'bg-red-50 text-red-600 border border-red-200',
  completed:       'bg-gray-100 text-gray-500 border border-gray-200',
}
const projectStatusLabel: Record<string, string> = {
  on_track: 'On Track', needs_attention: 'Needs Attention',
  blocked: 'Blocked', completed: 'Completed',
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium shrink-0', bookingStatusClass[status] ?? 'bg-gray-100 text-gray-500')}>
      {status}
    </span>
  )
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({
  icon, title, section, directorId, children,
}: {
  icon: string
  title: string
  section: string
  directorId: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between py-1 sticky top-0 bg-[#FAFAFA] z-10">
        <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <span>{icon}</span>{title}
        </h2>
        <VoiceNoteButton
          directorId={directorId}
          section={section as never}
          sectionLabel={title}
          colorClass="text-gray-500 hover:text-gray-700 hover:bg-gray-100"
        />
      </div>
      {children}
    </section>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function Empty() {
  return <p className="text-sm text-gray-400 py-2">Nothing scheduled</p>
}

// ─── Main component ───────────────────────────────────────────────────────────
export function DirectorView({
  director, eaName, initialBookings, initialCalendarEvents,
  initialProjects, initialPushMessages,
}: DirectorViewProps) {
  const supabase = createClient()
  const [bookings, setBookings]   = useState(initialBookings)
  const [events, setEvents]       = useState(initialCalendarEvents)
  const [projects, setProjects]   = useState(initialProjects)
  const [messages, setMessages]   = useState(initialPushMessages)
  const [showPastFlights, setShowPastFlights] = useState(false)
  const [showPastHotels,  setShowPastHotels]  = useState(false)
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())

  useEffect(() => {
    const channel = supabase
      .channel(`director-public-${director.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `director_id=eq.${director.id}` }, (payload) => {
        if (payload.eventType === 'INSERT') setBookings((p) => [...p, payload.new as Booking])
        else if (payload.eventType === 'UPDATE') setBookings((p) => p.map((b) => b.id === payload.new.id ? payload.new as Booking : b))
        else if (payload.eventType === 'DELETE') setBookings((p) => p.filter((b) => b.id !== payload.old.id))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'push_messages', filter: `director_id=eq.${director.id}` }, (payload) => {
        if (payload.eventType === 'INSERT') setMessages((p) => [payload.new as PushMessage, ...p])
        else if (payload.eventType === 'UPDATE') setMessages((p) => p.map((m) => m.id === payload.new.id ? payload.new as PushMessage : m))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [director.id])

  const sorted = (arr: Booking[]) => [...arr].sort((a, b) => a.date.localeCompare(b.date))
  const flights     = sorted(bookings.filter((b) => b.type === 'flight'))
  const hotels      = sorted(bookings.filter((b) => b.type === 'hotel'))
  const eventBkgs   = sorted(bookings.filter((b) => b.type === 'event'))
  const cabs        = sorted(bookings.filter((b) => b.type === 'cab'))
  const restaurants = sorted(bookings.filter((b) => b.type === 'restaurant'))
  const weekMeetings = events
    .filter((e) => isWithinNextDays(e.start_time, 7))
    .sort((a, b) => a.start_time.localeCompare(b.start_time))

  const futureFlights = flights.filter((b) => !isPast(b.date))
  const pastFlights   = flights.filter((b) => isPast(b.date))
  const futureHotels  = hotels.filter((b) => !isPast(b.date))
  const pastHotels    = hotels.filter((b) => isPast(b.date))

  const activeProjects    = projects.filter((p) => p.status !== 'completed')
  const completedProjects = projects.filter((p) => p.status === 'completed')

  const lastUpdated = [
    ...bookings.map((b) => b.updated_at),
    ...events.map((e) => e.synced_at),
    ...projects.map((p) => p.updated_at),
  ].filter(Boolean).map((d) => new Date(d).getTime()).sort((a, b) => b - a)[0]

  function toggleProject(id: string) {
    setExpandedProjects((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <PushMessageBanner messages={messages} />

      <div className="max-w-2xl mx-auto px-5 py-8 space-y-8">

        {/* ── Header ── */}
        <div className="pb-2 border-b border-gray-100">
          <h1 className="text-xl font-semibold text-gray-900">{director.full_name}&apos;s Schedule</h1>
          <p className="text-xs text-gray-400 mt-1">
            Managed by {eaName}
            {lastUpdated ? ` · Updated ${formatRelative(new Date(lastUpdated).toISOString())}` : ''}
          </p>
        </div>

        {/* ── This Week ── */}
        <Section icon="📅" title="This Week" section="meetings" directorId={director.id}>
          {weekMeetings.length === 0 ? <Empty /> : (
            <div className="space-y-2">
              {weekMeetings.map((event) => (
                <div key={event.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{event.title}</p>
                    <div className="flex flex-wrap gap-x-3 text-xs text-gray-400 mt-1">
                      <span>{formatDate(event.start_time)}</span>
                      {!event.start_time.endsWith('T00:00:00') && (
                        <span>{formatTime(event.start_time)} – {formatTime(event.end_time)}</span>
                      )}
                      {event.location && (
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{event.location}</span>
                      )}
                    </div>
                  </div>
                  {event.meeting_link && (
                    <Button asChild size="sm" variant="outline" className="h-7 text-xs shrink-0 border-gray-200">
                      <a href={event.meeting_link} target="_blank" rel="noopener noreferrer">
                        Join <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* ── Flights ── */}
        <Section icon="✈️" title="Flights" section="flights" directorId={director.id}>
          {futureFlights.length === 0 && pastFlights.length === 0 ? <Empty /> : (
            <div className="space-y-2">
              {futureFlights.map((b) => {
                const f = b.details as FlightDetails
                return (
                  <div key={b.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm border-l-2 border-l-gray-300">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{f.origin} → {f.destination}</p>
                        <div className="flex flex-wrap gap-x-3 text-xs text-gray-400 mt-1">
                          <span>{formatDate(b.date)}</span>
                          <span>{f.airline} {f.flight_number}</span>
                          <span>{formatTime(f.departure_time)} → {formatTime(f.arrival_time)}</span>
                        </div>
                        <div className="flex flex-wrap gap-x-3 text-xs text-gray-400 mt-0.5">
                          <span>PNR: <span className="font-mono text-gray-600">{f.pnr}</span></span>
                          {f.seat && <span>Seat {f.seat}</span>}
                          {f.class && <span>{f.class}</span>}
                        </div>
                      </div>
                      <StatusBadge status={b.status} />
                    </div>
                  </div>
                )
              })}
              {pastFlights.length > 0 && (
                <button className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2" onClick={() => setShowPastFlights(!showPastFlights)}>
                  {showPastFlights ? 'Hide' : 'Show'} {pastFlights.length} past flight{pastFlights.length !== 1 ? 's' : ''}
                </button>
              )}
              {showPastFlights && pastFlights.map((b) => {
                const f = b.details as FlightDetails
                return (
                  <div key={b.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm opacity-40">
                    <p className="text-sm font-medium text-gray-700">{f.origin} → {f.destination}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(b.date)} · {f.airline} {f.flight_number} · PNR: {f.pnr}</p>
                  </div>
                )
              })}
            </div>
          )}
        </Section>

        {/* ── Hotels ── */}
        <Section icon="🏨" title="Hotels" section="hotels" directorId={director.id}>
          {futureHotels.length === 0 && pastHotels.length === 0 ? <Empty /> : (
            <div className="space-y-2">
              {futureHotels.map((b) => {
                const h = b.details as HotelDetails
                return (
                  <div key={b.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm border-l-2 border-l-gray-300">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{h.property_name}</p>
                        <div className="flex flex-wrap gap-x-3 text-xs text-gray-400 mt-1">
                          <span>{h.city}</span>
                          <span>{formatDate(h.check_in)} → {formatDate(h.check_out)}</span>
                          <span>Conf: <span className="font-mono text-gray-600">{h.confirmation_number}</span></span>
                        </div>
                      </div>
                      <StatusBadge status={b.status} />
                    </div>
                  </div>
                )
              })}
              {pastHotels.length > 0 && (
                <button className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2" onClick={() => setShowPastHotels(!showPastHotels)}>
                  {showPastHotels ? 'Hide' : 'Show'} {pastHotels.length} past hotel{pastHotels.length !== 1 ? 's' : ''}
                </button>
              )}
              {showPastHotels && pastHotels.map((b) => {
                const h = b.details as HotelDetails
                return (
                  <div key={b.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm opacity-40">
                    <p className="text-sm font-medium text-gray-700">{h.property_name}, {h.city}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(h.check_in)} → {formatDate(h.check_out)}</p>
                  </div>
                )
              })}
            </div>
          )}
        </Section>

        {/* ── Events ── */}
        <Section icon="🎭" title="Events" section="events" directorId={director.id}>
          {eventBkgs.length === 0 ? <Empty /> : (
            <div className="space-y-2">
              {eventBkgs.map((b) => {
                const e = b.details as EventDetails
                return (
                  <div key={b.id} className={cn('bg-white border border-gray-100 rounded-xl p-4 shadow-sm border-l-2 border-l-gray-300', isPast(b.date) && 'opacity-40')}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{e.event_name}</p>
                        <div className="flex flex-wrap gap-x-3 text-xs text-gray-400 mt-1">
                          <span>{e.venue}, {e.city}</span>
                          <span>{formatDateTime(e.start_time)}</span>
                          {e.dress_code && <span>Dress: {e.dress_code}</span>}
                        </div>
                      </div>
                      <StatusBadge status={b.status} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Section>

        {/* ── Transfers ── */}
        <Section icon="🚗" title="Transfers" section="transfers" directorId={director.id}>
          {cabs.length === 0 ? <Empty /> : (
            <div className="space-y-2">
              {cabs.map((b) => {
                const c = b.details as CabDetails
                return (
                  <div key={b.id} className={cn('bg-white border border-gray-100 rounded-xl p-4 shadow-sm border-l-2 border-l-gray-300', isPast(b.date) && 'opacity-40')}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{c.pickup_location} → {c.drop_location}</p>
                        <div className="flex flex-wrap gap-x-3 text-xs text-gray-400 mt-1">
                          <span>{c.provider}</span>
                          <span>{formatDateTime(c.pickup_time)}</span>
                          {c.booking_id && <span>ID: <span className="font-mono text-gray-600">{c.booking_id}</span></span>}
                          {c.driver_name && <span>Driver: {c.driver_name}</span>}
                        </div>
                      </div>
                      <StatusBadge status={b.status} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Section>

        {/* ── Dining ── */}
        <Section icon="🍽️" title="Dining" section="dining" directorId={director.id}>
          {restaurants.length === 0 ? <Empty /> : (
            <div className="space-y-2">
              {restaurants.map((b) => {
                const r = b.details as RestaurantDetails
                return (
                  <div key={b.id} className={cn('bg-white border border-gray-100 rounded-xl p-4 shadow-sm border-l-2 border-l-gray-300', isPast(b.date) && 'opacity-40')}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{r.restaurant_name}</p>
                        <div className="flex flex-wrap gap-x-3 text-xs text-gray-400 mt-1">
                          <span>{r.location}</span>
                          <span>{formatDateTime(r.reservation_time)}</span>
                          <span>{r.party_size} guests</span>
                          {r.confirmation_number && <span>Conf: <span className="font-mono text-gray-600">{r.confirmation_number}</span></span>}
                        </div>
                      </div>
                      <StatusBadge status={b.status} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Section>

        {/* ── Projects ── */}
        <Section icon="📁" title="Active Projects" section="projects" directorId={director.id}>
          {activeProjects.length === 0 ? <Empty /> : (
            <div className="space-y-2">
              {activeProjects.map((project) => {
                const expanded = expandedProjects.has(project.id)
                const latestUpdate = project.updates?.[0]
                return (
                  <div key={project.id} className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
                    <button
                      className="w-full flex items-start justify-between gap-3 p-4 text-left hover:bg-gray-50 transition-colors"
                      onClick={() => toggleProject(project.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-gray-900">{project.name}</span>
                          <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border', projectStatusClass[project.status])}>
                            {projectStatusLabel[project.status]}
                          </span>
                        </div>
                        {latestUpdate && !expanded && (
                          <p className="text-xs text-gray-400 mt-1 truncate">{latestUpdate.note}</p>
                        )}
                      </div>
                      {expanded
                        ? <ChevronUp className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                        : <ChevronDown className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />}
                    </button>
                    {expanded && (
                      <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-3">
                        {project.updates && project.updates.length > 0 ? (
                          project.updates
                            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                            .map((update) => (
                              <div key={update.id}>
                                <p className="text-xs text-gray-400 mb-0.5">
                                  <span className="font-medium text-gray-600">{update.posted_by}</span> · {formatRelative(update.created_at)}
                                </p>
                                <p className="text-sm text-gray-700">{update.note}</p>
                              </div>
                            ))
                        ) : (
                          <p className="text-xs text-gray-400">No updates yet</p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
              {completedProjects.length > 0 && (
                <details className="group">
                  <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 underline underline-offset-2 list-none">
                    {completedProjects.length} completed project{completedProjects.length !== 1 ? 's' : ''}
                  </summary>
                  <div className="mt-2 space-y-2">
                    {completedProjects.map((p) => (
                      <div key={p.id} className="bg-white border border-gray-100 rounded-xl p-4 opacity-50 flex items-center justify-between">
                        <span className="text-sm text-gray-700">{p.name}</span>
                        <span className="text-xs text-gray-400 border border-gray-200 rounded-full px-2 py-0.5">Completed</span>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}
        </Section>

      </div>
    </div>
  )
}
