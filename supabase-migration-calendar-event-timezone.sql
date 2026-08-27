-- Migration: store each synced calendar event's own timezone
--
-- Synced Google Calendar events (calendar_events.start_time/end_time) were
-- rendered on the viewer's local clock, so a director's meeting or on-location
-- event showed in the EA's timezone instead of the event's own. Booking-derived
-- times (flights/hotels/events/cabs/restaurants) already got this treatment;
-- this extends it to calendar-synced events by capturing the IANA zone Google
-- reports for the event alongside the existing UTC instant.
--
-- Run this once against an already-deployed database (matches the change
-- already made to supabase-schema.sql for fresh installs).

alter table calendar_events add column if not exists timezone text;
