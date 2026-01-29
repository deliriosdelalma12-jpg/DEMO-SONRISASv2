
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Cliente Admin para operaciones de base de datos (Railway side)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || 'https://nylfetawfgvmawagdpir.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

app.use(cors());
app.use(express.json());

// Middleware: Autenticación via Supabase JWT
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No authorization token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) throw new Error('Invalid token');
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Sesión no válida' });
  }
};

// API: Asegurar Onboarding (Lógica de Negocio en Railway)
app.post('/api/onboarding/ensure', authenticate, async (req, res) => {
  const userId = req.user.id;
  const userMetadata = req.user.user_metadata || {};
  const email = req.user.email;

  console.log(`[SERVER_ONBOARDING] Procesando usuario: ${email} (${userId})`);

  try {
    // 1. Verificar si el usuario ya tiene clínica asignada (Evita duplicados)
    const { data: existingProfile } = await supabaseAdmin
      .from('users')
      .select('clinic_id, clinics(id)')
      .eq('id', userId)
      .maybeSingle();

    if (existingProfile?.clinic_id) {
      console.log(`[SERVER_ONBOARDING] Usuario ya configurado. ClinicID: ${existingProfile.clinic_id}`);
      return res.json({ status: 'ok', clinic_id: existingProfile.clinic_id });
    }

    // 2. Crear la Clínica en Railway
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

    // 3. Crear Perfil de Usuario vinculado
    await supabaseAdmin.from('users').upsert({
      id: userId,
      clinic_id: clinic.id,
      full_name: userMetadata.full_name || email,
      role: 'admin',
      is_active: true,
      username: email.split('@')[0]
    });

    // 4. Inicializar Configuración del Tenant (JSONB)
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
      labels: { dashboardTitle: "Panel de Gestión", agendaTitle: "Agenda Central" },
      visuals: { titleFontSize: 32, bodyFontSize: 16 },
      laborSettings: { vacationDaysPerYear: 30, allowCarryOver: false, incidentTypes: [] },
      appointmentPolicy: { confirmationWindow: 24, leadTimeThreshold: 2, autoConfirmShortNotice: true },
      services: [{ id: 'S1', name: 'Consulta General', price: 50, duration: 30 }],
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
        systemPrompt: "Asistente de " + clinicName,
        initialGreeting: "Hola, bienvenida a " + clinicName,
        testSpeechText: "Prueba de voz.",
        instructions: "Gestiona citas médicas.",
        voice: "default", phoneNumber: "", aiCompanyName: clinicName,
        voicePitch: 1.0, voiceSpeed: 1.0, temperature: 0.7, accent: "es-ES-Madrid",
        model: "gemini-3-flash-preview",
        escalation_rules: { transfer_number: "", escalate_on_frustration: true },
        policy_texts: { cancel_policy: "", privacy_notice: "" },
        prompt_overrides: {}, aiEmotion: "Empática", aiStyle: "Concisa",
        aiRelation: "Formal (Usted)", aiFocus: "Resolutiva", configVersion: Date.now()
      }
    };

    await supabaseAdmin.from('tenant_settings').upsert({
      clinic_id: clinic.id,
      settings: defaultSettings
    });

    console.log(`[SERVER_ONBOARDING] Infraestructura creada con éxito para ${email}`);
    res.json({ status: 'created', clinic_id: clinic.id });

  } catch (error) {
    console.error('[SERVER_ONBOARDING_ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});

app.use(express.static(path.join(__dirname, '../dist')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../dist/index.html')));

app.listen(PORT, '0.0.0.0', () => console.log(`Railway Server Active on port ${PORT}`));
