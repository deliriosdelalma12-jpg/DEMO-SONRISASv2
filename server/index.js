
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

// Initialize Supabase with Service Role Key for administrative tasks
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
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
      .single();

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
        { id: 'admin_role', name: 'Administrador Global', permissions: ['view_dashboard', 'view_all_data', 'can_edit', 'view_settings'] }
      ],
      labels: { dashboardTitle: "Dashboard Directivo", agendaTitle: "Agenda Centralizada" },
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
        testSpeechText: "Prueba de voz del sistema SaaS."
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

// API: Voximplant Bind Number (Stub using secure env keys)
app.post('/api/voximplant/bind-number', authenticate, async (req, res) => {
  const { clinic_id, phone_number, country } = req.body;
  
  if (!process.env.VOXIMPLANT_API_KEY || !process.env.VOXIMPLANT_ACCOUNT_ID) {
    return res.status(503).json({ error: 'Telephony provider not configured' });
  }

  try {
    // Check if user is admin for this clinic
    const { data: member } = await supabaseAdmin
      .from('clinic_members')
      .select('role')
      .eq('clinic_id', clinic_id)
      .eq('user_id', req.user.id)
      .single();

    if (member?.role !== 'admin') {
      return res.status(403).json({ error: 'Permission denied' });
    }

    // Call Voximplant API here... (using secret keys)
    const mockRemoteId = "vox_" + Date.now();

    // Persist number to Supabase
    const { error } = await supabaseAdmin.from('clinic_phone_numbers').insert({
      clinic_id,
      phone_number,
      provider: 'voximplant',
      country: country || 'ES',
      active: true,
      settings: { remote_id: mockRemoteId }
    });

    if (error) throw error;

    res.json({ status: 'success', phone: phone_number });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve frontend dist folder
app.use(express.static(path.join(__dirname, '../dist')));

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server SaaS active on port ${PORT}`);
});
