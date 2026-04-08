import { ExternalLink, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { CalendarEvent } from '@/types'
import { formatDate, formatTime } from '@/lib/utils'

interface CalendarEventRowProps {
  event: CalendarEvent
}

export function CalendarEventRow({ event }: CalendarEventRowProps) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-md border-l-4 bg-green-50 border-green-400">
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm text-green-900">{event.title}</div>
        <div className="text-xs text-green-700 mt-0.5 flex flex-wrap gap-x-3 gap-y-1">
          <span>{formatDate(event.start_time)}</span>
          <span>{formatTime(event.start_time)} – {formatTime(event.end_time)}</span>
          {event.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {event.location}
            </span>
          )}
        </div>
      </div>
      {event.meeting_link && (
        <Button asChild size="sm" variant="outline" className="h-7 text-xs shrink-0 border-green-300 bg-white hover:bg-green-50">
          <a href={event.meeting_link} target="_blank" rel="noopener noreferrer">
            Join <ExternalLink className="h-3 w-3 ml-1" />
          </a>
        </Button>
      )}
    </div>
  )
}
