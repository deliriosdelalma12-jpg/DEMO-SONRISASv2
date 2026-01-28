
import { createClient } from '@supabase/supabase-js';

/**
 * Safely retrieves environment variables with hardcoded fallbacks provided by the user.
 * This ensures the application works even if the build environment doesn't inject variables correctly.
 */
const getEnv = (key: string): string => {
  // 1. Try process.env (Node-like or manual injection)
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key] as string;
  }

  // 2. Try import.meta.env (Vite standard)
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      // @ts-ignore
      return import.meta.env[key] as string;
    }
  } catch (e) {
    // Silent catch if import.meta is restricted
  }

  // 3. Last resort: Hardcoded fallbacks for this specific project
  const fallbacks: Record<string, string> = {
    'VITE_SUPABASE_URL': 'https://nylfetawfgvmawagdpir.supabase.co',
    'SUPABASE_URL': 'https://nylfetawfgvmawagdpir.supabase.co',
    'VITE_SUPABASE_ANON_KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55bGZldGF3Zmd2bWF3YWdkcGlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2MDEwMjksImV4cCI6MjA4NTE3NzAyOX0.uC4mLA_sPf3eVLEMFWfNPUF2Kfk6-rxeudf0XF4mavM',
    'SUPABASE_ANON_KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55bGZldGF3Zmd2bWF3YWdkcGlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2MDEwMjksImV4cCI6MjA4NTE3NzAyOX0.uC4mLA_sPf3eVLEMFWfNPUF2Kfk6-rxeudf0XF4mavM'
  };

  return fallbacks[key] || '';
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL') || getEnv('SUPABASE_URL');
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY') || getEnv('SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase configuration missing. Please ensure environment variables are set.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
