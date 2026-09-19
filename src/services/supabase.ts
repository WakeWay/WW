import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '@/config';

// TODO: Replace these with your actual Supabase Project URL and Publishable Key
// You can get these from your Supabase Dashboard: Project Settings -> API
const { url: supabaseUrl, publishableKey: supabasePublishableKey } = getSupabaseConfig();

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
