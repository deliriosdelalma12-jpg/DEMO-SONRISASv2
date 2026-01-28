
import { createClient } from '@supabase/supabase-js';

// URL y KEY específicas del proyecto proporcionadas por el usuario
const SUPABASE_URL = 'https://nylfetawfgvmawagdpir.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55bGZldGF3Zmd2bWF3YWdkcGlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2MDEwMjksImV4cCI6MjA4NTE3NzAyOX0.uC4mLA_sPf3eVLEMFWfNPUF2Kfk6-rxeudf0XF4mavM';

const mask = (str: string) => str ? `${str.substring(0, 6)}...${str.substring(str.length - 4)}` : 'MISSING';

console.group('🛠️ SUPABASE_INIT_DIAGNOSTICS');
console.log('Target URL:', SUPABASE_URL);
console.log('Anon Key:', mask(SUPABASE_ANON_KEY));
console.groupEnd();

// Inicialización con persistencia forzada para evitar cierres de sesión inesperados
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce' // Recomendado para mayor seguridad y compatibilidad
  }
});
