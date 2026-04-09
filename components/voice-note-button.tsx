'use client'

import { useState, useRef, useEffect } from 'react'
import { Mic, Square, Send, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { DirectorNoteSection } from '@/types'

interface VoiceNoteButtonProps {
  directorId: string
  section: DirectorNoteSection
  sectionLabel: string
  colorClass: string // e.g. 'text-orange-700 hover:bg-orange-100'
}

type State = 'idle' | 'recording' | 'reviewing' | 'sending' | 'sent'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySpeechRecognition = any

export function VoiceNoteButton({
  directorId,
  section,
  sectionLabel,
  colorClass,
}: VoiceNoteButtonProps) {
  const [state, setState] = useState<State>('idle')
  const [finalText, setFinalText] = useState('')
  const [interimText, setInterimText] = useState('')
  const [editedText, setEditedText] = useState('')
  const [supported, setSupported] = useState(true)
  const recognitionRef = useRef<AnySpeechRecognition>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const w = window as any
      if (!w.SpeechRecognition && !w.webkitSpeechRecognition) setSupported(false)
    }
  }, [])

  function startRecording() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!SR) {
      // Fallback: open review panel with empty text input
      setFinalText('')
      setEditedText('')
      setState('reviewing')
      return
    }

    const recognition = new SR()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    let accumulated = ''

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          accumulated += result[0].transcript + ' '
        } else {
          interim = result[0].transcript
        }
      }
      setFinalText(accumulated)
      setInterimText(interim)
    }

    recognition.onend = () => {
      setInterimText('')
      setEditedText(accumulated.trim())
      setState('reviewing')
    }

    recognition.onerror = () => {
      setInterimText('')
      setEditedText(accumulated.trim())
      setState(accumulated.trim() ? 'reviewing' : 'idle')
    }

    recognitionRef.current = recognition
    recognition.start()
    setFinalText('')
    setInterimText('')
    setState('recording')
  }

  function stopRecording() {
    recognitionRef.current?.stop()
  }

  function cancel() {
    recognitionRef.current?.stop()
    setFinalText('')
    setInterimText('')
    setEditedText('')
    setState('idle')
  }

  async function send() {
    const text = editedText.trim()
    if (!text) return
    setState('sending')
    await fetch('/api/director-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ director_id: directorId, section, note: text }),
    })
    setState('sent')
    setTimeout(() => {
      setFinalText('')
      setEditedText('')
      setState('idle')
    }, 2000)
  }

  if (!supported && state === 'idle') {
    return (
      <button
        onClick={() => { setEditedText(''); setState('reviewing') }}
        className={`ml-2 flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border border-current/20 hover:border-current/40 transition-colors ${colorClass}`}
        title={`Leave a note for ${sectionLabel}`}
      >
        <Mic className="h-3 w-3" />
        <span>Note</span>
      </button>
    )
  }

  if (state === 'idle') {
    return (
      <button
        onClick={startRecording}
        className={`ml-2 flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border border-current/20 hover:border-current/40 transition-colors ${colorClass}`}
        title={`Voice note for ${sectionLabel}`}
      >
        <Mic className="h-3 w-3" />
        <span>Note</span>
      </button>
    )
  }

  if (state === 'sent') {
    return (
      <span className="ml-2 text-xs font-medium text-green-600 flex items-center gap-1">
        ✓ Sent to EA
      </span>
    )
  }

  // recording or reviewing panel — renders inline below the header
  return (
    <div className="mt-3 rounded-xl border bg-white shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {sectionLabel} · Note to EA
        </p>
        <button onClick={cancel} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      {state === 'recording' && (
        <>
          <div className="min-h-[60px] text-sm text-foreground">
            {finalText && <span>{finalText}</span>}
            {interimText && <span className="text-muted-foreground">{interimText}</span>}
            {!finalText && !interimText && (
              <span className="text-muted-foreground italic">Listening…</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
            <span className="text-xs text-muted-foreground">Recording</span>
            <Button size="sm" variant="outline" className="ml-auto gap-1.5" onClick={stopRecording}>
              <Square className="h-3 w-3 fill-current" />
              Stop
            </Button>
          </div>
        </>
      )}

      {(state === 'reviewing' || state === 'sending') && (
        <>
          <Textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            placeholder="Type your note here…"
            className="min-h-[80px] text-sm resize-none"
            autoFocus
          />
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" onClick={cancel} disabled={state === 'sending'}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={send}
              disabled={state === 'sending' || !editedText.trim()}
            >
              {state === 'sending'
                ? <><Loader2 className="h-3 w-3 animate-spin" /> Sending…</>
                : <><Send className="h-3 w-3" /> Send to EA</>}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
