
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Use the port provided by Railway or fallback to 3000 for local development
const PORT = process.env.PORT || 3000;

// Initialize Supabase with Service Role Key for administrative tasks
// Note: Service Role Key should NEVER be used on the client-side
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

app.use(cors());
app.use(express.json());

// Middleware: Authenticate via Supabase JWT
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No authorization token provided' });
  }

  const token = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.user = user;
  next();
};

// API: Ensure Onboarding (Idempotent)
app.post('/api/onboarding/ensure', authenticate, async (req, res) => {
  const userId = req.user.id;
  const userMetadata = req.user.user_metadata || {};
  const email = req.user.email;

  try {
    // 1. Check if user already has a clinic
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('clinic_id')
      .eq('id', userId)
      .maybeSingle(); // Use maybeSingle to avoid errors if not found

    if (existingUser?.clinic_id) {
      return res.json({ status: 'ok', message: 'User already onboarded', clinic_id: existingUser.clinic_id });
    }

    // 2. Create the Clinic
    const clinicName = userMetadata.clinic_name || `Clínica de ${email}`;
    const { data: clinic, error: cErr } = await supabaseAdmin
      .from('clinics')
      .insert({ 
        name: clinicName,
        owner_id: userId 
      })
      .select()
      .single();

    if (cErr) throw cErr;

    // 3. Create Public User Profile
    await supabaseAdmin.from('users').insert({
      id: userId,
      clinic_id: clinic.id,
      full_name: userMetadata.full_name || email,
      role: 'admin',
      is_active: true,
      username: email.split('@')[0]
    });

    // 4. Create Clinic Membership
    await supabaseAdmin.from('clinic_members').insert({
      clinic_id: clinic.id,
      user_id: userId,
      role: 'admin'
    });

    // 5. Initialize default settings for the tenant
    const defaultSettings = {
      id: clinic.id,
      name: clinicName,
      businessName: clinicName,
      sector: "Salud / Clínica",
      region: "ES",
      logo: "https://raw.githubusercontent.com/lucide-react/lucide/main/icons/hospital.svg",
      phone: userMetadata.owner_phone || "",
      email: email,
      currency: "€",
      language: "es-ES",
      scheduleType: "split",
      branchCount: 1,
      colorTemplate: "ocean",
      defaultTheme: "light",
      roles: [
        { id: 'admin', name: 'Administrador Global', permissions: ['view_dashboard', 'view_agenda', 'view_patients', 'view_doctors', 'view_branches', 'view_metrics', 'view_settings', 'view_all_data', 'can_edit'] }
      ],
      labels: { dashboardTitle: "Dashboard Directivo", agendaTitle: "Agenda Centralizada" },
      visuals: { titleFontSize: 32, bodyFontSize: 16 },
      laborSettings: { vacationDaysPerYear: 30, allowCarryOver: false, incidentTypes: [] },
      appointmentPolicy: { confirmationWindow: 24, leadTimeThreshold: 2, autoConfirmShortNotice: true },
      services: [
        { id: 'S1', name: 'Consulta General', price: 50, duration: 30 }
      ],
      globalSchedule: {
        'Lunes': { morning: { start: '09:00', end: '14:00', active: true }, afternoon: { start: '16:00', end: '20:00', active: true } },
        'Martes': { morning: { start: '09:00', end: '14:00', active: true }, afternoon: { start: '16:00', end: '20:00', active: true } },
        'Miércoles': { morning: { start: '09:00', end: '14:00', active: true }, afternoon: { start: '16:00', end: '20:00', active: true } },
        'Jueves': { morning: { start: '09:00', end: '14:00', active: true }, afternoon: { start: '16:00', end: '20:00', active: true } },
        'Viernes': { morning: { start: '09:00', end: '14:00', active: true }, afternoon: { start: '16:00', end: '20:00', active: true } },
        'Sábado': { morning: { start: '09:00', end: '13:00', active: true }, afternoon: { start: '00:00', end: '00:00', active: false } },
        'Domingo': { morning: { start: '00:00', end: '00:00', active: false }, afternoon: { start: '00:00', end: '00:00', active: false } }
      },
      aiPhoneSettings: {
        assistantName: "Sara",
        clinicDisplayName: clinicName,
        language: "es-ES",
        tone: "formal",
        voiceName: "Zephyr",
        core_version: "1.0.1",
        active: true,
        systemPrompt: "Eres la asistente virtual de " + clinicName,
        initialGreeting: "Hola, bienvenida a " + clinicName + ". ¿En qué puedo ayudarte?",
        testSpeechText: "Prueba de voz del sistema SaaS.",
        instructions: "Ayuda a los pacientes a agendar citas.",
        voice: "default",
        phoneNumber: "",
        aiCompanyName: clinicName,
        voicePitch: 1.0,
        voiceSpeed: 1.0,
        temperature: 0.7,
        accent: "es-ES-Madrid",
        model: "gemini-3-flash-preview",
        escalation_rules: { transfer_number: "", escalate_on_frustration: true },
        policy_texts: { cancel_policy: "", privacy_notice: "" },
        prompt_overrides: {},
        aiEmotion: "Empática",
        aiStyle: "Concisa",
        aiRelation: "Formal (Usted)",
        aiFocus: "Resolutiva",
        configVersion: Date.now()
      }
    };

    await supabaseAdmin.from('tenant_settings').upsert({
      clinic_id: clinic.id,
      settings: defaultSettings
    });

    // 6. Subscription setup (Free Plan)
    await supabaseAdmin.from('subscriptions').insert({
      clinic_id: clinic.id,
      plan: 'free',
      status: 'active',
      limits: { max_patients: 50, max_calls_monthly: 10 }
    });

    res.json({ status: 'created', clinic_id: clinic.id });

  } catch (error) {
    console.error('Onboarding failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Serve frontend dist folder
app.use(express.static(path.join(__dirname, '../dist')));

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Binding to 0.0.0.0 is often required for cloud platforms like Railway
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server SaaS active on port ${PORT}`);
});
