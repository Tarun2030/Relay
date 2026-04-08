'use client'

import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Booking, FlightDetails, HotelDetails, EventDetails, CabDetails, RestaurantDetails } from '@/types'
import { bookingTypeColors, bookingStatusColors, formatDate, formatDateTime, formatTime, isPast, cn } from '@/lib/utils'

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
        <span>{formatTime(f.departure_time)} → {formatTime(f.arrival_time)}</span>
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
        <span>{formatDateTime(e.start_time)}</span>
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
        <span>{formatDateTime(c.pickup_time)}</span>
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
        <span>{formatDateTime(r.reservation_time)}</span>
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
