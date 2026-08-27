-- Migration: per-director Google Calendar sync
--
-- Fixes calendar sync so it pulls each director's own calendar instead of
-- always defaulting to the connected Google account's primary calendar,
-- and stops multi-director syncs from overwriting each other's events.
--
-- Run this once against an already-deployed database (matches the change
-- already made to supabase-schema.sql for fresh installs).

-- 1. Let each director have their own Google Calendar ID.
alter table directors add column if not exists calendar_id text;

-- 2. google_event_id was globally unique, so syncing the same calendar for
--    two directors (or any repeat id) silently overwrote the earlier
--    director's row via upsert. Scope uniqueness to (director_id, google_event_id).
alter table calendar_events drop constraint if exists calendar_events_google_event_id_key;
alter table calendar_events add constraint calendar_events_director_id_google_event_id_key
  unique (director_id, google_event_id);

-- 3. calendar_ids on calendar_tokens was dead schema (never read or written) --
--    the per-director model replaces it. Safe to drop.
alter table calendar_tokens drop column if exists calendar_ids;
