import { createClient } from '@supabase/supabase-js'

// The publishable key is designed to live in the app; Row Level Security protects the data.
const url = import.meta.env.VITE_SUPABASE_URL || 'https://nxixvwvdbhbsijmhtjyw.supabase.co'
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_D2L-SYODJrjmylV0pqd5rQ_AMjbBR6-'

export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})
