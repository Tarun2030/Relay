export type BookingType = 'flight' | 'hotel' | 'event' | 'cab' | 'restaurant'
export type BookingStatus = 'confirmed' | 'pending' | 'cancelled'
export type ProjectStatus = 'on_track' | 'needs_attention' | 'blocked' | 'completed'

export interface EA {
  id: string
  full_name: string
  email: string
  created_at: string
}

export interface Director {
  id: string
  ea_id: string
  full_name: string
  email?: string
  title?: string
  company?: string
  share_token: string
  created_at: string
}

export interface Booking {
  id: string
  director_id: string
  type: BookingType
  date: string
  end_date?: string
  status: BookingStatus
  details: FlightDetails | HotelDetails | EventDetails | CabDetails | RestaurantDetails
  parsed_from_email: boolean
  created_at: string
  updated_at: string
}

export interface FlightDetails {
  flight_number: string
  airline: string
  origin: string
  destination: string
  departure_time: string
  arrival_time: string
  pnr: string
  seat?: string
  class?: string
  terminal?: string
  gate?: string
  passenger_name: string
}

export interface HotelDetails {
  property_name: string
  city: string
  address: string
  check_in: string
  check_out: string
  confirmation_number: string
  room_type?: string
  contact_number?: string
  notes?: string
}

export interface EventDetails {
  event_name: string
  venue: string
  city: string
  start_time: string
  end_time?: string
  ticket_number?: string
  seat?: string
  dress_code?: string
  notes?: string
}

export interface CabDetails {
  provider: string
  pickup_location: string
  drop_location: string
  pickup_time: string
  booking_id?: string
  driver_name?: string
  driver_contact?: string
}

export interface RestaurantDetails {
  restaurant_name: string
  location: string
  reservation_time: string
  party_size: number
  confirmation_number?: string
  notes?: string
}

export interface CalendarEvent {
  id: string
  director_id: string
  google_event_id?: string
  title: string
  start_time: string
  end_time: string
  location?: string
  description?: string
  meeting_link?: string
  attendees: string[]
  synced_at: string
}

export interface Project {
  id: string
  director_id: string
  name: string
  status: ProjectStatus
  description?: string
  created_at: string
  updated_at: string
  updates?: ProjectUpdate[]
}

export interface ProjectUpdate {
  id: string
  project_id: string
  note: string
  posted_by: string
  created_at: string
}

export interface PushMessage {
  id: string
  director_id: string
  message: string
  is_read: boolean
  created_at: string
}

export type DirectorNoteSection = 'flights' | 'hotels' | 'events' | 'transfers' | 'dining' | 'meetings' | 'projects' | 'general'

export interface DirectorNote {
  id: string
  director_id: string
  section: DirectorNoteSection
  note: string
  is_read: boolean
  created_at: string
}
