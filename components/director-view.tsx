'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PushMessageBanner } from '@/components/push-message-banner'
import { VoiceNoteButton } from '@/components/voice-note-button'
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

// ─── Color Palette ─────────────────────────────────────────────────────────────
// Brand / Primary : Indigo   #6366F1
// Flights         : Blue     #3B82F6   bg #EFF6FF
// Hotels          : Violet   #8B5CF6   bg #F5F3FF
// Events          : Orange   #F97316   bg #FFF7ED
// Transfers       : Teal     #14B8A6   bg #F0FDFA
// Dining          : Pink     #EC4899   bg #FDF2F8
// Meetings        : Indigo   #6366F1   bg #EEF2FF
// Projects        : Slate    #64748B   bg #F8FAFC
// Status Green    : #16A34A  bg #DCFCE7  border #86EFAC
// Status Amber    : #D97706  bg #FEF3C7  border #FCD34D
// Status Red      : #DC2626  bg #FEE2E2  border #FCA5A5

// ─── Category style map ────────────────────────────────────────────────────────
const CAT = {
  meetings:  { border: 'border-l-indigo-500', bg: 'bg-indigo-50/70',  iconColor: 'text-indigo-500'  },
  flights:   { border: 'border-l-blue-500',   bg: 'bg-blue-50/70',    iconColor: 'text-blue-500'    },
  hotels:    { border: 'border-l-violet-500', bg: 'bg-violet-50/70',  iconColor: 'text-violet-500'  },
  events:    { border: 'border-l-orange-500', bg: 'bg-orange-50/70',  iconColor: 'text-orange-500'  },
  transfers: { border: 'border-l-teal-500',   bg: 'bg-teal-50/70',    iconColor: 'text-teal-500'    },
  dining:    { border: 'border-l-pink-500',   bg: 'bg-pink-50/70',    iconColor: 'text-pink-500'    },
  projects:  { border: 'border-l-slate-400',  bg: 'bg-white',         iconColor: 'text-slate-500'   },
} as const
type Category = keyof typeof CAT

// ─── Status styles ─────────────────────────────────────────────────────────────
const BOOKING_STATUS: Record<string, string> = {
  confirmed: 'bg-green-100 text-green-700 border border-green-300',
  pending:   'bg-amber-100 text-amber-700 border border-amber-300',
  cancelled: 'bg-red-100   text-red-600   border border-red-300',
}
const PROJECT_STATUS: Record<string, string> = {
  on_track:        'bg-green-100 text-green-700 border border-green-300',
  needs_attention: 'bg-amber-100 text-amber-700 border border-amber-300',
  blocked:         'bg-red-100   text-red-600   border border-red-300',
  completed:       'bg-gray-100  text-gray-500  border border-gray-200',
}
const PROJECT_LABEL: Record<string, string> = {
  on_track: 'On Track', needs_attention: 'Needs Attention', blocked: 'Blocked', completed: 'Completed',
}

// ─── Sub-components ────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold shrink-0 tracking-wide',
      BOOKING_STATUS[status] ?? 'bg-gray-100 text-gray-500 border border-gray-200',
    )}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

function Card({
  category, past = false, children,
}: {
  category: Category
  past?: boolean
  children: React.ReactNode
}) {
  const { border, bg } = CAT[category]
  return (
    <div className={cn(
      'rounded-xl border border-gray-100/80 shadow-sm border-l-[3px] p-4',
      border, bg,
      past && 'opacity-35',
    )}>
      {children}
    </div>
  )
}

function Section({
  icon, title, section, directorId, category, children,
}: {
  icon: string
  title: string
  section: string
  directorId: string
  category: Category
  children: React.ReactNode
}) {
  const { iconColor } = CAT[category]
  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between py-1 sticky top-0 bg-[#F7F8FA] z-10">
        <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <span className={cn('text-[15px]', iconColor)}>{icon}</span>
          {title}
        </h2>
        <VoiceNoteButton
          directorId={directorId}
          section={section as never}
          sectionLabel={title}
          colorClass="text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50"
        />
      </div>
      {children}
    </section>
  )
}

function Empty() {
  return <p className="text-sm text-gray-400 py-2 pl-1">Nothing scheduled</p>
}

function PastToggle({ count, noun, show, onToggle }: { count: number; noun: string; show: boolean; onToggle: () => void }) {
  return (
    <button
      className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2 pl-1"
      onClick={onToggle}
    >
      {show ? 'Hide' : 'Show'} {count} past {noun}{count !== 1 ? 's' : ''}
    </button>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────
interface DirectorViewProps {
  director: Director
  eaName: string
  initialBookings: Booking[]
  initialCalendarEvents: CalendarEvent[]
  initialProjects: Project[]
  initialPushMessages: PushMessage[]
}

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
  const pastFlights   = flights.filter((b) =>  isPast(b.date))
  const futureHotels  = hotels.filter((b) => !isPast(b.date))
  const pastHotels    = hotels.filter((b) =>  isPast(b.date))
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
    <div className="min-h-screen bg-[#F7F8FA]">
      <PushMessageBanner messages={messages} />

      <div className="max-w-2xl mx-auto px-5 py-8 space-y-8">

        {/* ── Header ── */}
        <div className="pb-4 border-b border-gray-200/70">
          <div className="flex items-center gap-2.5 mb-1">
            <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">
              {director.full_name}&apos;s Schedule
            </h1>
          </div>
          <p className="text-xs text-gray-400 pl-4.5 ml-[18px]">
            Managed by <span className="text-gray-500 font-medium">{eaName}</span>
            {lastUpdated ? ` · Updated ${formatRelative(new Date(lastUpdated).toISOString())}` : ''}
          </p>
        </div>

        {/* ── This Week ── */}
        <Section icon="📅" title="This Week" section="meetings" directorId={director.id} category="meetings">
          {weekMeetings.length === 0 ? <Empty /> : (
            <div className="space-y-2.5">
              {weekMeetings.map((event) => (
                <Card key={event.id} category="meetings">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{event.title}</p>
                      <div className="flex flex-wrap gap-x-3 text-xs text-gray-500 mt-1">
                        <span>{formatDate(event.start_time)}</span>
                        {!event.start_time.endsWith('T00:00:00') && (
                          <span className="font-medium text-indigo-600">
                            {formatTime(event.start_time)} – {formatTime(event.end_time)}
                          </span>
                        )}
                        {event.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />{event.location}
                          </span>
                        )}
                      </div>
                    </div>
                    {event.meeting_link && (
                      <Button asChild size="sm" className="h-7 text-xs shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white border-0 gap-1">
                        <a href={event.meeting_link} target="_blank" rel="noopener noreferrer">
                          Join <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Section>

        {/* ── Flights ── */}
        <Section icon="✈️" title="Flights" section="flights" directorId={director.id} category="flights">
          {futureFlights.length === 0 && pastFlights.length === 0 ? <Empty /> : (
            <div className="space-y-2.5">
              {futureFlights.map((b) => {
                const f = b.details as FlightDetails
                return (
                  <Card key={b.id} category="flights">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 tracking-tight">
                          {f.origin} → {f.destination}
                        </p>
                        <div className="flex flex-wrap gap-x-3 text-xs text-gray-500 mt-1">
                          <span className="font-medium text-blue-600">
                            {formatTime(f.departure_time)} → {formatTime(f.arrival_time)}
                          </span>
                          <span>{formatDate(b.date)}</span>
                          <span>{f.airline} {f.flight_number}</span>
                        </div>
                        <div className="flex flex-wrap gap-x-3 text-xs text-gray-400 mt-0.5">
                          <span>PNR <span className="font-mono text-gray-500">{f.pnr}</span></span>
                          {f.seat && <span>Seat {f.seat}</span>}
                          {f.class && <span>{f.class}</span>}
                        </div>
                      </div>
                      <StatusBadge status={b.status} />
                    </div>
                  </Card>
                )
              })}
              {pastFlights.length > 0 && (
                <PastToggle count={pastFlights.length} noun="flight" show={showPastFlights} onToggle={() => setShowPastFlights(!showPastFlights)} />
              )}
              {showPastFlights && pastFlights.map((b) => {
                const f = b.details as FlightDetails
                return (
                  <Card key={b.id} category="flights" past>
                    <p className="text-sm font-semibold text-gray-700">{f.origin} → {f.destination}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(b.date)} · {f.airline} {f.flight_number} · PNR {f.pnr}</p>
                  </Card>
                )
              })}
            </div>
          )}
        </Section>

        {/* ── Hotels ── */}
        <Section icon="🏨" title="Hotels" section="hotels" directorId={director.id} category="hotels">
          {futureHotels.length === 0 && pastHotels.length === 0 ? <Empty /> : (
            <div className="space-y-2.5">
              {futureHotels.map((b) => {
                const h = b.details as HotelDetails
                return (
                  <Card key={b.id} category="hotels">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900">{h.property_name}</p>
                        <div className="flex flex-wrap gap-x-3 text-xs text-gray-500 mt-1">
                          <span className="font-medium text-violet-600">
                            {formatDate(h.check_in)} → {formatDate(h.check_out)}
                          </span>
                          <span>{h.city}</span>
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          Conf <span className="font-mono text-gray-500">{h.confirmation_number}</span>
                          {h.room_type && <span> · {h.room_type}</span>}
                        </div>
                      </div>
                      <StatusBadge status={b.status} />
                    </div>
                  </Card>
                )
              })}
              {pastHotels.length > 0 && (
                <PastToggle count={pastHotels.length} noun="hotel" show={showPastHotels} onToggle={() => setShowPastHotels(!showPastHotels)} />
              )}
              {showPastHotels && pastHotels.map((b) => {
                const h = b.details as HotelDetails
                return (
                  <Card key={b.id} category="hotels" past>
                    <p className="text-sm font-semibold text-gray-700">{h.property_name}, {h.city}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(h.check_in)} → {formatDate(h.check_out)}</p>
                  </Card>
                )
              })}
            </div>
          )}
        </Section>

        {/* ── Events ── */}
        <Section icon="🎭" title="Events" section="events" directorId={director.id} category="events">
          {eventBkgs.length === 0 ? <Empty /> : (
            <div className="space-y-2.5">
              {eventBkgs.map((b) => {
                const e = b.details as EventDetails
                return (
                  <Card key={b.id} category="events" past={isPast(b.date)}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900">{e.event_name}</p>
                        <div className="flex flex-wrap gap-x-3 text-xs text-gray-500 mt-1">
                          <span className="font-medium text-orange-600">{formatDateTime(e.start_time)}</span>
                          <span>{e.venue}, {e.city}</span>
                          {e.dress_code && <span>Dress: {e.dress_code}</span>}
                        </div>
                      </div>
                      <StatusBadge status={b.status} />
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </Section>

        {/* ── Transfers ── */}
        <Section icon="🚗" title="Transfers" section="transfers" directorId={director.id} category="transfers">
          {cabs.length === 0 ? <Empty /> : (
            <div className="space-y-2.5">
              {cabs.map((b) => {
                const c = b.details as CabDetails
                return (
                  <Card key={b.id} category="transfers" past={isPast(b.date)}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900">{c.pickup_location} → {c.drop_location}</p>
                        <div className="flex flex-wrap gap-x-3 text-xs text-gray-500 mt-1">
                          <span className="font-medium text-teal-600">{formatDateTime(c.pickup_time)}</span>
                          <span>{c.provider}</span>
                          {c.driver_name && <span>Driver: {c.driver_name}</span>}
                        </div>
                        {c.booking_id && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            ID <span className="font-mono text-gray-500">{c.booking_id}</span>
                          </p>
                        )}
                      </div>
                      <StatusBadge status={b.status} />
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </Section>

        {/* ── Dining ── */}
        <Section icon="🍽️" title="Dining" section="dining" directorId={director.id} category="dining">
          {restaurants.length === 0 ? <Empty /> : (
            <div className="space-y-2.5">
              {restaurants.map((b) => {
                const r = b.details as RestaurantDetails
                return (
                  <Card key={b.id} category="dining" past={isPast(b.date)}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900">{r.restaurant_name}</p>
                        <div className="flex flex-wrap gap-x-3 text-xs text-gray-500 mt-1">
                          <span className="font-medium text-pink-600">{formatDateTime(r.reservation_time)}</span>
                          <span>{r.location}</span>
                          <span>{r.party_size} guests</span>
                        </div>
                        {r.confirmation_number && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            Conf <span className="font-mono text-gray-500">{r.confirmation_number}</span>
                          </p>
                        )}
                      </div>
                      <StatusBadge status={b.status} />
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </Section>

        {/* ── Projects ── */}
        <Section icon="📁" title="Active Projects" section="projects" directorId={director.id} category="projects">
          {activeProjects.length === 0 ? <Empty /> : (
            <div className="space-y-2.5">
              {activeProjects.map((project) => {
                const expanded = expandedProjects.has(project.id)
                const latestUpdate = project.updates?.[0]
                return (
                  <div key={project.id} className="bg-white border border-gray-100/80 rounded-xl shadow-sm border-l-[3px] border-l-slate-400 overflow-hidden">
                    <button
                      className="w-full flex items-start justify-between gap-3 p-4 text-left hover:bg-slate-50/70 transition-colors"
                      onClick={() => toggleProject(project.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-gray-900">{project.name}</span>
                          <span className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border',
                            PROJECT_STATUS[project.status],
                          )}>
                            {PROJECT_LABEL[project.status]}
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
                      <div className="border-t border-gray-100 bg-slate-50/60 p-4 space-y-3">
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
                  <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 underline underline-offset-2 list-none pl-1">
                    {completedProjects.length} completed project{completedProjects.length !== 1 ? 's' : ''}
                  </summary>
                  <div className="mt-2 space-y-2">
                    {completedProjects.map((p) => (
                      <div key={p.id} className="bg-white border border-gray-100 rounded-xl p-4 opacity-40 flex items-center justify-between">
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
