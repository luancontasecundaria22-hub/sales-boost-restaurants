import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Restaurant = {
  id: string
  name: string
  google_place_id: string | null
  address: string | null
  lat: number | null
  lng: number | null
  plan: 'starter' | 'pro' | 'ultra'
  locale: 'pt' | 'en'
  owner_id: string
  created_at: string
}
