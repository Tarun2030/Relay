import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, isAfter, isBefore, startOfDay } from 'date-fns'
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
