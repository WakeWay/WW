-- SUPABASE SQL EDITOR SCRIPT (For Custom Backend)

-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create otps table
CREATE TABLE IF NOT EXISTS public.otps (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    code TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create trip_history table
CREATE TABLE IF NOT EXISTS public.trip_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    trip_id TEXT NOT NULL,
    destination_name TEXT,
    radius_meters NUMERIC NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    alarm_triggered BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Note: No RLS required anymore since our custom backend accesses the DB securely directly.

-- Temporary, read-only trip sharing. The raw share token is never stored.
CREATE TABLE IF NOT EXISTS public.trip_shares (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    trip_id TEXT NOT NULL,
    token_hash TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'revoked', 'expired')),
    destination_name TEXT,
    destination_latitude NUMERIC,
    destination_longitude NUMERIC,
    current_waypoint_index INTEGER NOT NULL DEFAULT 0,
    last_location_latitude NUMERIC,
    last_location_longitude NUMERIC,
    expected_arrival_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS trip_shares_user_trip_idx ON public.trip_shares(user_id, trip_id);
CREATE INDEX IF NOT EXISTS trip_shares_expires_idx ON public.trip_shares(expires_at);

CREATE TABLE IF NOT EXISTS public.trip_share_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    share_id UUID NOT NULL REFERENCES public.trip_shares(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('trip_started', 'near_destination', 'trip_completed', 'share_revoked')),
    waypoint_index INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS trip_share_events_share_idx ON public.trip_share_events(share_id, created_at);
