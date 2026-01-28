
import { createClient } from "@supabase/supabase-js"

const getSafeEnv = () => {
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
      return (import.meta as any).env;
    }
  } catch (e) {}
  return {};
};

const env = getSafeEnv();

const supabaseUrl = env.VITE_SUPABASE_URL || 'https://nylfetawfgvmawagdpir.supabase.co'
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55bGZldGF3Zmd2bWF3YWdkcGlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2MDEwMjksImV4cCI6MjA4NTE3NzAyOX0.uC4mLA_sPf3eVLEMFWfNPUF2Kfk6-rxeudf0XF4mavM'

console.log('🛡️ [AUTH_INIT] Inicializando cliente Supabase...');

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false, // Control manual total
    flowType: 'pkce'
  }
})
