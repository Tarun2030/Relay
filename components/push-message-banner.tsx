'use client'

import { useState } from 'react'
import { X, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PushMessage } from '@/types'
import { formatRelative } from '@/lib/utils'

interface PushMessageBannerProps {
  messages: PushMessage[]
}

export function PushMessageBanner({ messages: initialMessages }: PushMessageBannerProps) {
  const [messages, setMessages] = useState(initialMessages)

  const unread = messages.filter((m) => !m.is_read)
  if (unread.length === 0) return null

  const latest = unread[0]
  const extraCount = unread.length - 1

  async function handleMarkRead(id: string) {
    await fetch(`/api/push?id=${id}`, { method: 'PATCH' })
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, is_read: true } : m))
    )
  }

  async function handleMarkAllRead() {
    await Promise.all(unread.map((m) => fetch(`/api/push?id=${m.id}`, { method: 'PATCH' })))
    setMessages((prev) => prev.map((m) => ({ ...m, is_read: true })))
  }

  return (
    <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-start gap-3">
          <MessageSquare className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-yellow-900">{latest.message}</p>
            <p className="text-xs text-yellow-700 mt-0.5">{formatRelative(latest.created_at)}</p>
            {extraCount > 0 && (
              <p className="text-xs text-yellow-700 mt-1">
                +{extraCount} more message{extraCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7 border-yellow-300 bg-white hover:bg-yellow-50"
              onClick={() => handleMarkRead(latest.id)}
            >
              Mark read
            </Button>
            {extraCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7 border-yellow-300 bg-white hover:bg-yellow-50"
                onClick={handleMarkAllRead}
              >
                Clear all
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
