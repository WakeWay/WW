-- Run this in your Supabase SQL Editor

-- 1. Create the trip_history table
CREATE TABLE IF NOT EXISTS public.trip_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    trip_id TEXT NOT NULL,
    destination_name TEXT,
    radius_meters NUMERIC NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    alarm_triggered BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Turn on Row Level Security (RLS)
ALTER TABLE public.trip_history ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Users can insert their own trips
CREATE POLICY "Users can insert their own trips" 
    ON public.trip_history FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- 4. Policy: Users can view their own trips
CREATE POLICY "Users can view their own trips" 
    ON public.trip_history FOR SELECT 
    USING (auth.uid() = user_id);

-- 5. Policy: Users can delete their own trips
CREATE POLICY "Users can delete their own trips" 
    ON public.trip_history FOR DELETE 
    USING (auth.uid() = user_id);
