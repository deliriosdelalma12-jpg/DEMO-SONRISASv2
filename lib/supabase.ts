import { createClient } from "@supabase/supabase-js"

/**
 * Robust environment variable access.
 * In some environments, import.meta.env might be undefined if Vite hasn't processed the file.
 * This helper ensures we always have an object to read from, preventing 'Cannot read properties of undefined' errors.
 */
const getSafeEnv = () => {
  try {
    // Check if import.meta and import.meta.env exist safely
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
      return (import.meta as any).env;
    }
  } catch (e) {
    // Silently fail and return empty object
  }
  return {};
};

const env = getSafeEnv();

// Provide hardcoded fallbacks for development/production stability if env vars are missing
const supabaseUrl = env.VITE_SUPABASE_URL || 'https://nylfetawfgvmawagdpir.supabase.co'
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55bGZldGF3Zmd2bWF3YWdkcGlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2MDEwMjksImV4cCI6MjA4NTE3NzAyOX0.uC4mLA_sPf3eVLEMFWfNPUF2Kfk6-rxeudf0XF4mavM'

if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY) {
  console.warn("[SUPABASE_ENV] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not found in environment, using production defaults.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
