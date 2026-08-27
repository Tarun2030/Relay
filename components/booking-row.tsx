'use client'

import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Booking, FlightDetails, HotelDetails, EventDetails, CabDetails, RestaurantDetails } from '@/types'
import {
  bookingTypeColors, bookingStatusColors, formatDate,
  formatDateTimeInZone, formatTimeInZone, shortTimeZoneLabel,
  isPast, cn,
} from '@/lib/utils'

// Subtle parenthetical naming the city whose clock a time is shown on. Inherits
// the row's existing muted styling — no new visual weight.
function ZoneHint({ tz }: { tz?: string }) {
  const label = shortTimeZoneLabel(tz)
  if (!label) return null
  return <span className="opacity-70"> ({label})</span>
}

interface BookingRowProps {
  booking: Booking
  onEdit: (booking: Booking) => void
  onDelete: (id: string) => void
}

function BookingDetails({ booking }: { booking: Booking }) {
  const d = booking.details

  if (booking.type === 'flight') {
    const f = d as FlightDetails
    return (
      <div className="text-sm text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 mt-1">
        <span className="font-medium text-foreground">{f.origin} → {f.destination}</span>
        <span>{f.airline} {f.flight_number}</span>
        {/* Departure renders in the origin airport's timezone, arrival in the destination's */}
        <span>
          {formatTimeInZone(f.departure_time, f.departure_timezone)}
          <ZoneHint tz={f.departure_timezone} />
          {' → '}
          {formatTimeInZone(f.arrival_time, f.arrival_timezone)}
          <ZoneHint tz={f.arrival_timezone} />
        </span>
        <span>PNR: <span className="font-mono">{f.pnr}</span></span>
        {f.seat && <span>Seat: {f.seat}</span>}
        {f.class && <span>{f.class}</span>}
      </div>
    )
  }

  if (booking.type === 'hotel') {
    const h = d as HotelDetails
    return (
      <div className="text-sm text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 mt-1">
        <span className="font-medium text-foreground">{h.property_name}</span>
        <span>{h.city}</span>
        <span>{formatDate(h.check_in)} → {formatDate(h.check_out)}</span>
        <span>Conf: <span className="font-mono">{h.confirmation_number}</span></span>
      </div>
    )
  }

  if (booking.type === 'event') {
    const e = d as EventDetails
    return (
      <div className="text-sm text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 mt-1">
        <span className="font-medium text-foreground">{e.event_name}</span>
        <span>{e.venue}, {e.city}</span>
        <span>{formatDateTimeInZone(e.start_time, e.timezone)}<ZoneHint tz={e.timezone} /></span>
        {e.dress_code && <span>Dress: {e.dress_code}</span>}
      </div>
    )
  }

  if (booking.type === 'cab') {
    const c = d as CabDetails
    return (
      <div className="text-sm text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 mt-1">
        <span>{c.provider}</span>
        <span className="font-medium text-foreground">{c.pickup_location} → {c.drop_location}</span>
        <span>{formatDateTimeInZone(c.pickup_time, c.timezone)}<ZoneHint tz={c.timezone} /></span>
        {c.booking_id && <span>ID: <span className="font-mono">{c.booking_id}</span></span>}
      </div>
    )
  }

  if (booking.type === 'restaurant') {
    const r = d as RestaurantDetails
    return (
      <div className="text-sm text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 mt-1">
        <span className="font-medium text-foreground">{r.restaurant_name}</span>
        <span>{r.location}</span>
        <span>{formatDateTimeInZone(r.reservation_time, r.timezone)}<ZoneHint tz={r.timezone} /></span>
        <span>{r.party_size} guests</span>
        {r.confirmation_number && <span>Conf: <span className="font-mono">{r.confirmation_number}</span></span>}
      </div>
    )
  }

  return null
}

export function BookingRow({ booking, onEdit, onDelete }: BookingRowProps) {
  const [deleting, setDeleting] = useState(false)
  const colors = bookingTypeColors[booking.type]
  const past = isPast(booking.date)

  async function handleDelete() {
    if (!confirm('Delete this booking?')) return
    setDeleting(true)
    onDelete(booking.id)
  }

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-md border-l-4 group',
        colors.bg,
        colors.border,
        past && booking.status !== 'cancelled' && 'opacity-50',
        booking.status === 'cancelled' && 'opacity-40'
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{formatDate(booking.date)}</span>
          <Badge className={cn('text-xs', bookingStatusColors[booking.status])}>
            {booking.status}
          </Badge>
          {booking.status === 'cancelled' && (
            <span className="text-xs line-through text-muted-foreground">cancelled</span>
          )}
        </div>
        <BookingDetails booking={booking} />
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(booking)}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={handleDelete}
          disabled={deleting}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
