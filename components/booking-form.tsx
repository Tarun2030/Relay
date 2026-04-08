'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { Booking, BookingType, BookingStatus } from '@/types'
import { X } from 'lucide-react'

interface BookingFormProps {
  directorId: string
  booking?: Booking
  onSave: (data: Partial<Booking>) => Promise<void>
  onClose: () => void
}

const BOOKING_TYPES: { value: BookingType; label: string }[] = [
  { value: 'flight', label: '✈️ Flight' },
  { value: 'hotel', label: '🏨 Hotel' },
  { value: 'event', label: '🎭 Event' },
  { value: 'cab', label: '🚗 Transfer' },
  { value: 'restaurant', label: '🍽️ Restaurant' },
]

const STATUS_OPTIONS: { value: BookingStatus; label: string }[] = [
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'pending', label: 'Pending' },
  { value: 'cancelled', label: 'Cancelled' },
]

export function BookingForm({ directorId, booking, onSave, onClose }: BookingFormProps) {
  const [type, setType] = useState<BookingType>(booking?.type || 'flight')
  const [status, setStatus] = useState<BookingStatus>(booking?.status || 'confirmed')
  const [date, setDate] = useState(booking?.date || '')
  const [endDate, setEndDate] = useState(booking?.end_date || '')
  const [details, setDetails] = useState<Record<string, string | number>>(
    (booking?.details as unknown as Record<string, string | number>) || {}
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function setDetail(key: string, value: string | number) {
    setDetails((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await onSave({
        director_id: directorId,
        type,
        status,
        date,
        end_date: endDate || undefined,
        details: details as unknown as Booking['details'],
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save booking')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-background w-full max-w-lg h-full overflow-y-auto shadow-xl flex flex-col">
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-background z-10">
          <h2 className="text-lg font-semibold">{booking ? 'Edit Booking' : 'Add Booking'}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-3 py-2">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label>Booking Type *</Label>
            <Select value={type} onValueChange={(v) => { setType(v as BookingType); setDetails({}) }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BOOKING_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as BookingStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {type === 'flight' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Airline *</Label>
                  <Input value={details.airline as string || ''} onChange={(e) => setDetail('airline', e.target.value)} placeholder="IndiGo" required />
                </div>
                <div className="space-y-2">
                  <Label>Flight Number *</Label>
                  <Input value={details.flight_number as string || ''} onChange={(e) => setDetail('flight_number', e.target.value)} placeholder="6E-123" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Origin *</Label>
                  <Input value={details.origin as string || ''} onChange={(e) => setDetail('origin', e.target.value)} placeholder="BOM" required />
                </div>
                <div className="space-y-2">
                  <Label>Destination *</Label>
                  <Input value={details.destination as string || ''} onChange={(e) => setDetail('destination', e.target.value)} placeholder="DEL" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Passenger Name *</Label>
                <Input value={details.passenger_name as string || ''} onChange={(e) => setDetail('passenger_name', e.target.value)} placeholder="John Smith" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Departure *</Label>
                  <Input type="datetime-local" value={details.departure_time as string || ''} onChange={(e) => { setDetail('departure_time', e.target.value); setDate(e.target.value.split('T')[0]) }} required />
                </div>
                <div className="space-y-2">
                  <Label>Arrival *</Label>
                  <Input type="datetime-local" value={details.arrival_time as string || ''} onChange={(e) => setDetail('arrival_time', e.target.value)} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>PNR *</Label>
                <Input value={details.pnr as string || ''} onChange={(e) => setDetail('pnr', e.target.value)} placeholder="ABC123" required />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Seat</Label>
                  <Input value={details.seat as string || ''} onChange={(e) => setDetail('seat', e.target.value)} placeholder="12A" />
                </div>
                <div className="space-y-2">
                  <Label>Terminal</Label>
                  <Input value={details.terminal as string || ''} onChange={(e) => setDetail('terminal', e.target.value)} placeholder="T2" />
                </div>
                <div className="space-y-2">
                  <Label>Gate</Label>
                  <Input value={details.gate as string || ''} onChange={(e) => setDetail('gate', e.target.value)} placeholder="G15" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Class</Label>
                <Select value={details.class as string || ''} onValueChange={(v) => setDetail('class', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Economy">Economy</SelectItem>
                    <SelectItem value="Business">Business</SelectItem>
                    <SelectItem value="First">First</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {type === 'hotel' && (
            <>
              <div className="space-y-2">
                <Label>Property Name *</Label>
                <Input value={details.property_name as string || ''} onChange={(e) => setDetail('property_name', e.target.value)} placeholder="The Oberoi" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>City *</Label>
                  <Input value={details.city as string || ''} onChange={(e) => setDetail('city', e.target.value)} placeholder="Mumbai" required />
                </div>
                <div className="space-y-2">
                  <Label>Confirmation # *</Label>
                  <Input value={details.confirmation_number as string || ''} onChange={(e) => setDetail('confirmation_number', e.target.value)} placeholder="CONF123" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input value={details.address as string || ''} onChange={(e) => setDetail('address', e.target.value)} placeholder="Nariman Point, Mumbai" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Check-in *</Label>
                  <Input type="date" value={details.check_in as string || ''} onChange={(e) => { setDetail('check_in', e.target.value); setDate(e.target.value) }} required />
                </div>
                <div className="space-y-2">
                  <Label>Check-out *</Label>
                  <Input type="date" value={details.check_out as string || ''} onChange={(e) => { setDetail('check_out', e.target.value); setEndDate(e.target.value) }} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Room Type</Label>
                  <Input value={details.room_type as string || ''} onChange={(e) => setDetail('room_type', e.target.value)} placeholder="Deluxe Suite" />
                </div>
                <div className="space-y-2">
                  <Label>Contact</Label>
                  <Input value={details.contact_number as string || ''} onChange={(e) => setDetail('contact_number', e.target.value)} placeholder="+91 22 6632 5757" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={details.notes as string || ''} onChange={(e) => setDetail('notes', e.target.value)} placeholder="Early check-in requested..." />
              </div>
            </>
          )}

          {type === 'event' && (
            <>
              <div className="space-y-2">
                <Label>Event Name *</Label>
                <Input value={details.event_name as string || ''} onChange={(e) => setDetail('event_name', e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Venue *</Label>
                  <Input value={details.venue as string || ''} onChange={(e) => setDetail('venue', e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>City *</Label>
                  <Input value={details.city as string || ''} onChange={(e) => setDetail('city', e.target.value)} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Start Time *</Label>
                  <Input type="datetime-local" value={details.start_time as string || ''} onChange={(e) => { setDetail('start_time', e.target.value); setDate(e.target.value.split('T')[0]) }} required />
                </div>
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Input type="datetime-local" value={details.end_time as string || ''} onChange={(e) => setDetail('end_time', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Ticket #</Label>
                  <Input value={details.ticket_number as string || ''} onChange={(e) => setDetail('ticket_number', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Seat</Label>
                  <Input value={details.seat as string || ''} onChange={(e) => setDetail('seat', e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Dress Code</Label>
                <Input value={details.dress_code as string || ''} onChange={(e) => setDetail('dress_code', e.target.value)} placeholder="Business Formal" />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={details.notes as string || ''} onChange={(e) => setDetail('notes', e.target.value)} />
              </div>
            </>
          )}

          {type === 'cab' && (
            <>
              <div className="space-y-2">
                <Label>Provider *</Label>
                <Input value={details.provider as string || ''} onChange={(e) => setDetail('provider', e.target.value)} placeholder="Uber / Ola / etc." required />
              </div>
              <div className="space-y-2">
                <Label>Pickup Location *</Label>
                <Input value={details.pickup_location as string || ''} onChange={(e) => setDetail('pickup_location', e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Drop Location *</Label>
                <Input value={details.drop_location as string || ''} onChange={(e) => setDetail('drop_location', e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Pickup Time *</Label>
                <Input type="datetime-local" value={details.pickup_time as string || ''} onChange={(e) => { setDetail('pickup_time', e.target.value); setDate(e.target.value.split('T')[0]) }} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Booking ID</Label>
                  <Input value={details.booking_id as string || ''} onChange={(e) => setDetail('booking_id', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Driver Name</Label>
                  <Input value={details.driver_name as string || ''} onChange={(e) => setDetail('driver_name', e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Driver Contact</Label>
                <Input value={details.driver_contact as string || ''} onChange={(e) => setDetail('driver_contact', e.target.value)} />
              </div>
            </>
          )}

          {type === 'restaurant' && (
            <>
              <div className="space-y-2">
                <Label>Restaurant Name *</Label>
                <Input value={details.restaurant_name as string || ''} onChange={(e) => setDetail('restaurant_name', e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Location *</Label>
                <Input value={details.location as string || ''} onChange={(e) => setDetail('location', e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Reservation Time *</Label>
                  <Input type="datetime-local" value={details.reservation_time as string || ''} onChange={(e) => { setDetail('reservation_time', e.target.value); setDate(e.target.value.split('T')[0]) }} required />
                </div>
                <div className="space-y-2">
                  <Label>Party Size *</Label>
                  <Input type="number" min="1" value={details.party_size as number || ''} onChange={(e) => setDetail('party_size', parseInt(e.target.value))} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Confirmation #</Label>
                <Input value={details.confirmation_number as string || ''} onChange={(e) => setDetail('confirmation_number', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={details.notes as string || ''} onChange={(e) => setDetail('notes', e.target.value)} />
              </div>
            </>
          )}

          {/* Hidden date field if not auto-set by type */}
          {(type === 'flight' || type === 'cab' || type === 'event' || type === 'restaurant') && !date && (
            <div className="space-y-2">
              <Label>Date *</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
          )}

          <div className="flex gap-3 pt-4 sticky bottom-0 bg-background pb-2">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Saving...' : booking ? 'Update Booking' : 'Add Booking'}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
