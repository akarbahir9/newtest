import { createClient } from '@supabase/supabase-js';

// ------------------------------------------------------------------
// Supabase Client Configuration
// ------------------------------------------------------------------

const supabaseUrl = 'https://grpjgvgvtaylngnqjevp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdycGpndmd2dGF5bG5nbnFqZXZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMTEzOTksImV4cCI6MjA3OTU4NzM5OX0.wjzH1B5pH1gv6rWDUI7iXtJ9GLJRQMVUsVHYR63bNQw';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);