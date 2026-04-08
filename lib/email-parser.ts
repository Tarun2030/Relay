import { parseBookingEmail } from './claude'
import type { BookingType } from '@/types'

export interface ParsedBooking {
  type: BookingType
  date: string
  end_date?: string
  details: Record<string, unknown>
}

export async function parseEmailToBooking(rawEmailText: string): Promise<ParsedBooking> {
  const parsed = await parseBookingEmail(rawEmailText)

  if (!parsed.type || !parsed.date || !parsed.details) {
    throw new Error('Invalid booking data parsed from email')
  }

  return {
    type: parsed.type as BookingType,
    date: parsed.date,
    end_date: parsed.end_date,
    details: parsed.details,
  }
}
