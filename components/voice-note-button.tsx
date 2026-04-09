'use client'

import { useState } from 'react'
import { MessageSquarePlus, Send, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { DirectorNoteSection } from '@/types'

interface NoteButtonProps {
  directorId: string
  section: DirectorNoteSection
  sectionLabel: string
  colorClass: string
}

type State = 'idle' | 'open' | 'sending' | 'sent'

export function VoiceNoteButton({ directorId, section, sectionLabel, colorClass }: NoteButtonProps) {
  const [state, setState] = useState<State>('idle')
  const [text, setText] = useState('')

  async function send() {
    if (!text.trim()) return
    setState('sending')
    await fetch('/api/director-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ director_id: directorId, section, note: text.trim() }),
    })
    setState('sent')
    setTimeout(() => {
      setText('')
      setState('idle')
    }, 2000)
  }

  if (state === 'sent') {
    return (
      <span className={`ml-2 text-xs font-medium flex items-center gap-1 ${colorClass}`}>
        ✓ Sent
      </span>
    )
  }

  if (state === 'idle') {
    return (
      <button
        onClick={() => setState('open')}
        className={`ml-2 flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border border-current/20 hover:border-current/40 transition-colors ${colorClass}`}
        title={`Add a note about ${sectionLabel}`}
      >
        <MessageSquarePlus className="h-3 w-3" />
        <span>Note</span>
      </button>
    )
  }

  // open / sending — inline panel below the header
  return (
    <div className="mt-3 rounded-xl border bg-white shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {sectionLabel} · Note to EA
        </p>
        <button onClick={() => { setText(''); setState('idle') }} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={`Type a note about ${sectionLabel.toLowerCase()}…`}
        className="min-h-[80px] text-sm resize-none"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send()
        }}
      />
      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="outline" onClick={() => { setText(''); setState('idle') }} disabled={state === 'sending'}>
          Cancel
        </Button>
        <Button size="sm" className="gap-1.5" onClick={send} disabled={state === 'sending' || !text.trim()}>
          {state === 'sending'
            ? <><Loader2 className="h-3 w-3 animate-spin" /> Sending…</>
            : <><Send className="h-3 w-3" /> Send to EA</>}
        </Button>
      </div>
    </div>
  )
}
