import { parseBookingEmail } from './claude'
import type { BookingType } from '@/types'

export interface ParsedBooking {
  type: BookingType
  date: string
  end_date?: string
  details: Record<string, unknown>
}

export async function parseEmailToBookings(rawEmailText: string): Promise<ParsedBooking[]> {
  const items = await parseBookingEmail(rawEmailText)

  return items
    .filter((p: ParsedBooking) => p.type && p.date && p.details)
    .map((p: ParsedBooking) => ({
      type: p.type as BookingType,
      date: p.date,
      end_date: p.end_date,
      details: p.details,
    }))
}
