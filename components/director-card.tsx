'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Copy, Check, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Director } from '@/types'
import { getDirectorShareUrl } from '@/lib/utils'

interface DirectorCardProps {
  director: Director
  stats?: {
    bookings: number
    projects: number
    unreadMessages: number
  }
}

export function DirectorCard({ director, stats }: DirectorCardProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopyLink() {
    const url = getDirectorShareUrl(director.share_token)
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-lg leading-tight">{director.full_name}</h3>
            {director.title && (
              <p className="text-sm text-muted-foreground">{director.title}</p>
            )}
            {director.company && (
              <p className="text-sm text-muted-foreground">{director.company}</p>
            )}
          </div>
          {stats?.unreadMessages ? (
            <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
              {stats.unreadMessages} message{stats.unreadMessages !== 1 ? 's' : ''}
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {stats && (
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>{stats.bookings} booking{stats.bookings !== 1 ? 's' : ''}</span>
            <span>{stats.projects} project{stats.projects !== 1 ? 's' : ''}</span>
          </div>
        )}
        <div className="flex gap-2">
          <Button asChild className="flex-1" size="sm">
            <Link href={`/dashboard/directors/${director.id}`}>Manage</Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            className="gap-1"
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? 'Copied' : 'Copy Link'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
