import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// TODO: Replace these with your actual Supabase Project URL and Anon Key
// You can get these from your Supabase Dashboard: Project Settings -> API
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://ekeicgpjoowrklyrjkbb.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrZWljZ3Bqb293cmtseXJqa2JiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MTgyMDcsImV4cCI6MjA5MjA5NDIwN30.ERtZE2ub3Z0nPrqyFty8pvHny9Ne8jg6F7lMjqOeZiM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
