
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://nylfetawfgvmawagdpir.supabase.co';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55bGZldGF3Zmd2bWF3YWdkcGlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2MDEwMjksImV4cCI6MjA4NTE3NzAyOX0.uC4mLA_sPf3eVLEMFWfNPUF2Kfk6-rxeudf0XF4mavM';

console.log("[SUPABASE_LIB] Inicializando cliente. URL:", supabaseUrl);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: "pkce",
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false, // OBLIGATORIO: Evita que el SDK intente canjear el código por su cuenta
    storage: window.localStorage,
    storageKey: "mediclinic-auth-token" // Llave personalizada para evitar conflictos con otras apps de Supabase
  },
});
