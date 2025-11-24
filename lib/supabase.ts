import { createClient } from '@supabase/supabase-js';

// Use the provided project ID to construct the URL
const supabaseUrl = process.env.SUPABASE_URL || 'https://caqadocpcxrzvlglcboh.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhcWFkb2NwY3hyenZsZ2xjYm9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMTAyMzYsImV4cCI6MjA3OTU4NjIzNn0.CZnf3eFAEicVockUS5BnIjTGlobZc6o1oY39qHGeMhE';

if (!supabaseUrl) {
    console.error("Supabase URL is missing.");
}

if (!supabaseAnonKey) {
    console.warn("Supabase Anon Key is missing. Please set SUPABASE_ANON_KEY in your environment variables to enable data access.");
}

// We provide a placeholder key if the real one is missing. 
// This prevents the 'Uncaught Error' on startup, although API requests will fail (401) until the real key is provided.
export const supabase = createClient(
    supabaseUrl, 
    supabaseAnonKey || 'placeholder-key-to-prevent-crash'
);