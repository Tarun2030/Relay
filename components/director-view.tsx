'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PushMessageBanner } from '@/components/push-message-banner'
import { ColorCodedSection } from '@/components/color-coded-section'
import { VoiceNoteButton } from '@/components/voice-note-button'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type {
  Director,
  Booking,
  CalendarEvent,
  Project,
  PushMessage,
  FlightDetails,
  HotelDetails,
  EventDetails,
  CabDetails,
  RestaurantDetails,
} from '@/types'
import {
  formatDate,
  formatDateTime,
  formatTime,
  formatRelative,
  isPast,
  isWithinNextDays,
  projectStatusColors,
  projectStatusLabels,
  bookingStatusColors,
  cn,
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

export function DirectorView({
  director,
  eaName,
  initialBookings,
  initialCalendarEvents,
  initialProjects,
  initialPushMessages,
}: DirectorViewProps) {
  const supabase = createClient()
  const [bookings, setBookings] = useState(initialBookings)
  const [events, setEvents] = useState(initialCalendarEvents)
  const [projects, setProjects] = useState(initialProjects)
  const [messages, setMessages] = useState(initialPushMessages)
  const [showPastFlights, setShowPastFlights] = useState(false)
  const [showPastHotels, setShowPastHotels] = useState(false)
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
  const [showCompleted, setShowCompleted] = useState(false)

  useEffect(() => {
    const channel = supabase
      .channel(`director-public-${director.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `director_id=eq.${director.id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') setBookings((p) => [...p, payload.new as Booking])
          else if (payload.eventType === 'UPDATE') setBookings((p) => p.map((b) => b.id === payload.new.id ? payload.new as Booking : b))
          else if (payload.eventType === 'DELETE') setBookings((p) => p.filter((b) => b.id !== payload.old.id))
        })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'push_messages', filter: `director_id=eq.${director.id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') setMessages((p) => [payload.new as PushMessage, ...p])
          else if (payload.eventType === 'UPDATE') setMessages((p) => p.map((m) => m.id === payload.new.id ? payload.new as PushMessage : m))
        })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [director.id])

  const flights = bookings.filter((b) => b.type === 'flight').sort((a, b) => a.date.localeCompare(b.date))
  const hotels = bookings.filter((b) => b.type === 'hotel').sort((a, b) => a.date.localeCompare(b.date))
  const eventBookings = bookings.filter((b) => b.type === 'event').sort((a, b) => a.date.localeCompare(b.date))
  const cabs = bookings.filter((b) => b.type === 'cab').sort((a, b) => a.date.localeCompare(b.date))
  const restaurants = bookings.filter((b) => b.type === 'restaurant').sort((a, b) => a.date.localeCompare(b.date))
  const weekMeetings = events.filter((e) => isWithinNextDays(e.start_time, 7)).sort((a, b) => a.start_time.localeCompare(b.start_time))

  const activeProjects = projects.filter((p) => p.status !== 'completed')
  const completedProjects = projects.filter((p) => p.status === 'completed')

  function toggleProject(id: string) {
    setExpandedProjects((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const futureFlights = flights.filter((b) => !isPast(b.date))
  const pastFlights = flights.filter((b) => isPast(b.date))
  const futureHotels = hotels.filter((b) => !isPast(b.date))
  const pastHotels = hotels.filter((b) => isPast(b.date))

  const lastUpdated = [
    ...bookings.map((b) => b.updated_at),
    ...events.map((e) => e.synced_at),
    ...projects.map((p) => p.updated_at),
  ].filter(Boolean).map((d) => new Date(d).getTime()).sort((a, b) => b - a)[0]

  return (
    <div className="min-h-screen bg-gray-50">
      <PushMessageBanner messages={messages} />

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">{director.full_name}&apos;s Schedule</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Managed by {eaName}
            {lastUpdated ? ` · Updated ${formatRelative(new Date(lastUpdated).toISOString())}` : ''}
          </p>
        </div>

        {/* Meetings this week */}
        <ColorCodedSection
          icon="📅"
          title="This Week"
          headerClass="text-green-700"
          sticky
          action={
            <VoiceNoteButton
              directorId={director.id}
              section="meetings"
              sectionLabel="Meetings"
              colorClass="text-green-700 hover:bg-green-100"
            />
          }
        >
          <div className="space-y-2">
            {weekMeetings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No meetings this week</p>
            ) : weekMeetings.map((event) => (
              <div key={event.id} className="flex items-start gap-3 p-3 rounded-md border-l-4 bg-green-50 border-green-400">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-green-900">{event.title}</div>
                  <div className="text-xs text-green-700 mt-0.5 flex flex-wrap gap-x-3 gap-y-1">
                    <span>{formatDate(event.start_time)}</span>
                    {!event.start_time.endsWith('T00:00:00') && (
                      <span>{formatTime(event.start_time)} – {formatTime(event.end_time)}</span>
                    )}
                    {event.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {event.location}
                      </span>
                    )}
                  </div>
                </div>
                {event.meeting_link && (
                  <Button asChild size="sm" variant="outline" className="h-7 text-xs shrink-0 border-green-300 bg-white">
                    <a href={event.meeting_link} target="_blank" rel="noopener noreferrer">
                      Join <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </Button>
                )}
              </div>
            ))}
          </div>
        </ColorCodedSection>

        {/* Flights */}
        <ColorCodedSection
          icon="✈️"
          title="Flights"
          headerClass="text-orange-700"
          sticky
          action={
            <VoiceNoteButton
              directorId={director.id}
              section="flights"
              sectionLabel="Flights"
              colorClass="text-orange-700 hover:bg-orange-100"
            />
          }
        >
          <div className="space-y-2">
            {futureFlights.length === 0 && pastFlights.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing scheduled</p>
            ) : (
              <>
                {futureFlights.map((b) => {
                  const f = b.details as FlightDetails
                  return (
                    <div key={b.id} className="p-3 rounded-md border-l-4 bg-orange-50 border-orange-400">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-orange-900 text-sm">{f.origin} → {f.destination}</div>
                          <div className="text-xs text-orange-700 mt-0.5 flex flex-wrap gap-x-3 gap-y-1">
                            <span>{formatDate(b.date)}</span>
                            <span>{f.airline} {f.flight_number}</span>
                            <span>{formatTime(f.departure_time)} → {formatTime(f.arrival_time)}</span>
                            <span>PNR: <span className="font-mono font-medium">{f.pnr}</span></span>
                            {f.seat && <span>Seat: {f.seat}</span>}
                            {f.class && <span>{f.class}</span>}
                          </div>
                        </div>
                        <Badge className={cn('text-xs shrink-0', bookingStatusColors[b.status])}>{b.status}</Badge>
                      </div>
                    </div>
                  )
                })}
                {pastFlights.length > 0 && (
                  <button
                    className="text-xs text-muted-foreground hover:text-foreground underline"
                    onClick={() => setShowPastFlights(!showPastFlights)}
                  >
                    {showPastFlights ? 'Hide' : 'Show'} {pastFlights.length} past flight{pastFlights.length !== 1 ? 's' : ''}
                  </button>
                )}
                {showPastFlights && pastFlights.map((b) => {
                  const f = b.details as FlightDetails
                  return (
                    <div key={b.id} className="p-3 rounded-md border-l-4 bg-orange-50 border-orange-400 opacity-50">
                      <div className="font-medium text-orange-900 text-sm">{f.origin} → {f.destination}</div>
                      <div className="text-xs text-orange-700 mt-0.5">{formatDate(b.date)} · {f.airline} {f.flight_number} · PNR: {f.pnr}</div>
                    </div>
                  )
                })}
              </>
            )}
          </div>
        </ColorCodedSection>

        {/* Hotels */}
        <ColorCodedSection
          icon="🏨"
          title="Hotels"
          headerClass="text-blue-700"
          sticky
          action={
            <VoiceNoteButton
              directorId={director.id}
              section="hotels"
              sectionLabel="Hotels"
              colorClass="text-blue-700 hover:bg-blue-100"
            />
          }
        >
          <div className="space-y-2">
            {futureHotels.length === 0 && pastHotels.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing scheduled</p>
            ) : (
              <>
                {futureHotels.map((b) => {
                  const h = b.details as HotelDetails
                  return (
                    <div key={b.id} className="p-3 rounded-md border-l-4 bg-blue-50 border-blue-400">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-blue-900 text-sm">{h.property_name}</div>
                          <div className="text-xs text-blue-700 mt-0.5 flex flex-wrap gap-x-3 gap-y-1">
                            <span>{h.city}</span>
                            <span>{formatDate(h.check_in)} → {formatDate(h.check_out)}</span>
                            <span>Conf: <span className="font-mono">{h.confirmation_number}</span></span>
                            {h.contact_number && <span>{h.contact_number}</span>}
                          </div>
                        </div>
                        <Badge className={cn('text-xs shrink-0', bookingStatusColors[b.status])}>{b.status}</Badge>
                      </div>
                    </div>
                  )
                })}
                {pastHotels.length > 0 && (
                  <button
                    className="text-xs text-muted-foreground hover:text-foreground underline"
                    onClick={() => setShowPastHotels(!showPastHotels)}
                  >
                    {showPastHotels ? 'Hide' : 'Show'} {pastHotels.length} past hotel{pastHotels.length !== 1 ? 's' : ''}
                  </button>
                )}
                {showPastHotels && pastHotels.map((b) => {
                  const h = b.details as HotelDetails
                  return (
                    <div key={b.id} className="p-3 rounded-md border-l-4 bg-blue-50 border-blue-400 opacity-50">
                      <div className="font-medium text-blue-900 text-sm">{h.property_name}, {h.city}</div>
                      <div className="text-xs text-blue-700 mt-0.5">{formatDate(h.check_in)} → {formatDate(h.check_out)}</div>
                    </div>
                  )
                })}
              </>
            )}
          </div>
        </ColorCodedSection>

        {/* Events */}
        <ColorCodedSection
          icon="🎭"
          title="Events"
          headerClass="text-purple-700"
          sticky
          action={
            <VoiceNoteButton
              directorId={director.id}
              section="events"
              sectionLabel="Events"
              colorClass="text-purple-700 hover:bg-purple-100"
            />
          }
        >
          <div className="space-y-2">
            {eventBookings.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing scheduled</p>
            ) : eventBookings.map((b) => {
              const e = b.details as EventDetails
              return (
                <div key={b.id} className={cn('p-3 rounded-md border-l-4 bg-purple-50 border-purple-400', isPast(b.date) && 'opacity-50')}>
                  <div className="font-medium text-purple-900 text-sm">{e.event_name}</div>
                  <div className="text-xs text-purple-700 mt-0.5 flex flex-wrap gap-x-3 gap-y-1">
                    <span>{e.venue}, {e.city}</span>
                    <span>{formatDateTime(e.start_time)}</span>
                    {e.dress_code && <span>Dress: {e.dress_code}</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </ColorCodedSection>

        {/* Transfers */}
        <ColorCodedSection
          icon="🚗"
          title="Transfers"
          headerClass="text-yellow-700"
          sticky
          action={
            <VoiceNoteButton
              directorId={director.id}
              section="transfers"
              sectionLabel="Transfers"
              colorClass="text-yellow-700 hover:bg-yellow-100"
            />
          }
        >
          <div className="space-y-2">
            {cabs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing scheduled</p>
            ) : cabs.map((b) => {
              const c = b.details as CabDetails
              return (
                <div key={b.id} className={cn('p-3 rounded-md border-l-4 bg-yellow-50 border-yellow-400', isPast(b.date) && 'opacity-50')}>
                  <div className="font-medium text-yellow-900 text-sm">{c.pickup_location} → {c.drop_location}</div>
                  <div className="text-xs text-yellow-700 mt-0.5 flex flex-wrap gap-x-3 gap-y-1">
                    <span>{c.provider}</span>
                    <span>{formatDateTime(c.pickup_time)}</span>
                    {c.booking_id && <span>ID: <span className="font-mono">{c.booking_id}</span></span>}
                    {c.driver_name && <span>Driver: {c.driver_name}</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </ColorCodedSection>

        {/* Dining */}
        <ColorCodedSection
          icon="🍽️"
          title="Dining"
          headerClass="text-pink-700"
          sticky
          action={
            <VoiceNoteButton
              directorId={director.id}
              section="dining"
              sectionLabel="Dining"
              colorClass="text-pink-700 hover:bg-pink-100"
            />
          }
        >
          <div className="space-y-2">
            {restaurants.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing scheduled</p>
            ) : restaurants.map((b) => {
              const r = b.details as RestaurantDetails
              return (
                <div key={b.id} className={cn('p-3 rounded-md border-l-4 bg-pink-50 border-pink-400', isPast(b.date) && 'opacity-50')}>
                  <div className="font-medium text-pink-900 text-sm">{r.restaurant_name}</div>
                  <div className="text-xs text-pink-700 mt-0.5 flex flex-wrap gap-x-3 gap-y-1">
                    <span>{r.location}</span>
                    <span>{formatDateTime(r.reservation_time)}</span>
                    <span>{r.party_size} guests</span>
                    {r.confirmation_number && <span>Conf: <span className="font-mono">{r.confirmation_number}</span></span>}
                  </div>
                </div>
              )
            })}
          </div>
        </ColorCodedSection>

        {/* Projects */}
        <ColorCodedSection
          icon="📁"
          title="Active Projects"
          headerClass="text-gray-700"
          sticky
          action={
            <VoiceNoteButton
              directorId={director.id}
              section="projects"
              sectionLabel="Projects"
              colorClass="text-gray-700 hover:bg-gray-100"
            />
          }
        >
          <div className="space-y-2">
            {activeProjects.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing scheduled</p>
            ) : activeProjects.map((project) => {
              const expanded = expandedProjects.has(project.id)
              const latestUpdate = project.updates?.[0]
              return (
                <div key={project.id} className="border rounded-lg overflow-hidden">
                  <button
                    className="w-full flex items-start gap-3 p-3 text-left hover:bg-muted/50 transition-colors"
                    onClick={() => toggleProject(project.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{project.name}</span>
                        <Badge className={cn('text-xs', projectStatusColors[project.status])}>
                          {projectStatusLabels[project.status]}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Updated {formatRelative(project.updated_at)}
                        </span>
                      </div>
                      {latestUpdate && !expanded && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{latestUpdate.note}</p>
                      )}
                    </div>
                    {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />}
                  </button>
                  {expanded && project.updates && project.updates.length > 0 && (
                    <div className="border-t bg-muted/20 p-3 space-y-2">
                      {project.updates.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((update) => (
                        <div key={update.id} className="text-sm">
                          <div className="text-xs text-muted-foreground mb-0.5">
                            <span className="font-medium">{update.posted_by}</span> · {formatRelative(update.created_at)}
                          </div>
                          <p>{update.note}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {expanded && (!project.updates || project.updates.length === 0) && (
                    <div className="border-t bg-muted/20 p-3">
                      <p className="text-xs text-muted-foreground">No updates yet</p>
                    </div>
                  )}
                </div>
              )
            })}

            {completedProjects.length > 0 && (
              <details>
                <summary
                  className="text-xs text-muted-foreground cursor-pointer hover:text-foreground underline list-none"
                  onClick={() => setShowCompleted(!showCompleted)}
                >
                  {completedProjects.length} completed project{completedProjects.length !== 1 ? 's' : ''}
                </summary>
                <div className="mt-2 space-y-2">
                  {completedProjects.map((project) => (
                    <div key={project.id} className="border rounded-lg p-3 opacity-60">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{project.name}</span>
                        <Badge className="text-xs bg-gray-100 text-gray-600">Completed</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        </ColorCodedSection>
      </div>
    </div>
  )
}
