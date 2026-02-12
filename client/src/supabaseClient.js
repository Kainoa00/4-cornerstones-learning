import { createClient } from '@supabase/supabase-js'

// Strip whitespace from environment variables to fix header issues
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || 'https://klbqrnwsmrxuzmficesc.supabase.co').trim()
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtsYnFybndzbXJ4dXptZmljZXNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MzQ5NjksImV4cCI6MjA4NjQxMDk2OX0.D7bxRnW5DgHfRJ7kyq6obhkTDr0H4F7-NYM7tW0TJgg').replace(/\s/g, '')

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
