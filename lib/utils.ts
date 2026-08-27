import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, isAfter, isBefore, startOfDay } from 'date-fns'
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'
import type { BookingType, BookingStatus, ProjectStatus } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateStr: string) {
  return format(new Date(dateStr), 'MMM d, yyyy')
}

export function formatDateTime(dateStr: string) {
  return format(new Date(dateStr), 'MMM d, yyyy h:mm a')
}

export function formatTime(dateStr: string) {
  return format(new Date(dateStr), 'h:mm a')
}

// ─── Timezone-aware formatting ─────────────────────────────────────────────────
// A flight departs at 02:30 *in Dubai* and lands at 07:05 *in London*. Those are
// wall-clock times at two different places, and they must render identically no
// matter where the person looking at the screen happens to be. The plain
// formatDate/formatDateTime/formatTime helpers above use the JS runtime's local
// timezone — that's the browser's, since every consumer is a 'use client'
// component — so they are only correct for viewer-relative things (synced
// calendar meetings, "updated 3 minutes ago", hotel check-in dates with no
// time-of-day). Use the *InZone helpers for anything tied to a location.
//
// STORAGE DESIGN — we accept two shapes for the time string, because we have
// two producers, and we key off whether the string carries a UTC offset:
//
//   1. Offset-bearing ISO instant ("2026-09-06T02:30:00+04:00") — what the email
//      parser in lib/claude.ts is instructed to emit. This is an unambiguous
//      point in time; we convert it into `timeZone` for display.
//   2. Naive wall-clock ("2026-09-06T02:30" / "...T02:30:00") — what
//      <input type="datetime-local"> in components/booking-form.tsx produces.
//      There is no offset to trust, so we interpret the wall clock as already
//      being local to `timeZone` and pin it to a real instant with fromZonedTime
//      before formatting it back out.
//
// Both paths end up rendering the same wall-clock time at the location, which is
// the whole point. `timeZone` is optional: bookings saved before timezones
// existed have none, and fall back to the old viewer-local behavior rather than
// silently claiming a timezone we don't actually know.

/** True when an ISO-ish string carries an explicit UTC offset or a trailing Z. */
function hasUtcOffset(dateStr: string) {
  // Only look after the date part so the "-" in "2026-09-06" isn't mistaken
  // for a negative offset.
  const timePart = dateStr.slice(dateStr.indexOf('T') + 1)
  return /(?:Z|[+-]\d{2}:?\d{2})$/.test(timePart.trim())
}

/** Resolve a stored booking time to a real instant, given the place it belongs to. */
function toInstant(dateStr: string, timeZone: string) {
  return hasUtcOffset(dateStr)
    ? new Date(dateStr)          // already unambiguous
    : fromZonedTime(dateStr, timeZone)  // naive wall clock, read it as local to timeZone
}

/** "2:30 AM" as read off a clock at `timeZone`. Falls back to viewer-local. */
export function formatTimeInZone(dateStr: string, timeZone?: string) {
  if (!timeZone) return formatTime(dateStr)
  return formatInTimeZone(toInstant(dateStr, timeZone), timeZone, 'h:mm a')
}

/** "Sep 6, 2026 2:30 AM" as read off a clock at `timeZone`. Falls back to viewer-local. */
export function formatDateTimeInZone(dateStr: string, timeZone?: string) {
  if (!timeZone) return formatDateTime(dateStr)
  return formatInTimeZone(toInstant(dateStr, timeZone), timeZone, 'MMM d, yyyy h:mm a')
}

/**
 * Short, human hint for which timezone a time is being shown in — the city
 * segment of the IANA name, e.g. "Asia/Dubai" → "Dubai", "America/New_York" →
 * "New York". Returns null when there's no timezone, so callers can render
 * nothing rather than an empty badge.
 */
export function shortTimeZoneLabel(timeZone?: string) {
  if (!timeZone) return null
  const city = timeZone.split('/').pop()
  if (!city) return null
  return city.replace(/_/g, ' ')
}

export function formatRelative(dateStr: string) {
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true })
}

export function isPast(dateStr: string) {
  return isBefore(new Date(dateStr), startOfDay(new Date()))
}

export function isWithinNextDays(dateStr: string, days: number) {
  const date = new Date(dateStr)
  const now = new Date()
  const future = new Date()
  future.setDate(future.getDate() + days)
  return isAfter(date, now) && isBefore(date, future)
}

export const bookingTypeColors: Record<BookingType, {
  bg: string
  border: string
  text: string
  badge: string
  header: string
}> = {
  flight: {
    bg: 'bg-orange-50',
    border: 'border-orange-400',
    text: 'text-orange-800',
    badge: 'bg-orange-100',
    header: 'text-orange-700',
  },
  hotel: {
    bg: 'bg-blue-50',
    border: 'border-blue-400',
    text: 'text-blue-800',
    badge: 'bg-blue-100',
    header: 'text-blue-700',
  },
  event: {
    bg: 'bg-purple-50',
    border: 'border-purple-400',
    text: 'text-purple-800',
    badge: 'bg-purple-100',
    header: 'text-purple-700',
  },
  cab: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-400',
    text: 'text-yellow-800',
    badge: 'bg-yellow-100',
    header: 'text-yellow-700',
  },
  restaurant: {
    bg: 'bg-pink-50',
    border: 'border-pink-400',
    text: 'text-pink-800',
    badge: 'bg-pink-100',
    header: 'text-pink-700',
  },
}

export const meetingColors = {
  bg: 'bg-green-50',
  border: 'border-green-400',
  text: 'text-green-800',
  badge: 'bg-green-100',
  header: 'text-green-700',
}

export const bookingStatusColors: Record<BookingStatus, string> = {
  confirmed: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  cancelled: 'bg-red-100 text-red-700',
}

export const projectStatusColors: Record<ProjectStatus, string> = {
  on_track: 'bg-green-100 text-green-800',
  needs_attention: 'bg-yellow-100 text-yellow-800',
  blocked: 'bg-red-100 text-red-800',
  completed: 'bg-gray-100 text-gray-600',
}

export const projectStatusLabels: Record<ProjectStatus, string> = {
  on_track: 'On Track',
  needs_attention: 'Needs Attention',
  blocked: 'Blocked',
  completed: 'Completed',
}

export const bookingTypeLabels: Record<BookingType, string> = {
  flight: 'Flight',
  hotel: 'Hotel',
  event: 'Event',
  cab: 'Transfer',
  restaurant: 'Dining',
}

export const bookingTypeIcons: Record<BookingType, string> = {
  flight: '✈️',
  hotel: '🏨',
  event: '🎭',
  cab: '🚗',
  restaurant: '🍽️',
}

export function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
}

export function getDirectorShareUrl(token: string) {
  return `${getAppUrl()}/d/${token}`
}
