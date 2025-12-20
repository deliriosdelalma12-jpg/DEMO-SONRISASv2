
export type AppointmentStatus = 'Confirmed' | 'Rescheduled' | 'Cancelled' | 'Pending' | 'Completed';

export interface FileAttachment {
  id: string;
  name: string;
  type: string;
  url: string;
  size: string;
  date: string;
  description?: string;
  isAiGenerated?: boolean;
}

export interface MedicalReport {
  id: string;
  date: string;
  doctorName: string;
  content: string;
  title: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface ClinicService {
  id: string;
  name: string;
  price: number;
  duration: number; // Duración en minutos para optimizar agenda
}

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  img?: string;
}

// Added Shift interface for granular schedule control
export interface Shift {
  start: string;
  end: string;
  active: boolean;
}

// Added DaySchedule interface for doctor availability tracking
export interface DaySchedule {
  morning: Shift;
  afternoon: Shift;
}

// Added AttendanceRecord for HR and operations management
export interface AttendanceRecord {
  id: string;
  date: string;
  type: 'Retraso' | 'Ausencia' | 'Baja Médica' | 'Permiso' | string; // Allow dynamic types
  duration?: string;
  status: 'Pendiente' | 'Justificado' | 'No Justificado';
  notes?: string;
}

// Added VacationRequest for HR management
export interface VacationRequest {
  id: string;
  start: string;
  end: string;
  daysUsed: number;
  status: 'Pendiente' | 'Aprobada' | 'Rechazada';
  type: 'Vacaciones' | 'Asuntos Propios' | 'Baja';
}

export interface Doctor {
  id: string;
  name: string;
  role: UserRole;
  specialty: string;
  status: 'Active' | 'Inactive' | 'Vacation' | 'Medical Leave';
  img: string;
  branch: string;
  phone: string;
  corporateEmail: string;
  docs: FileAttachment[];
  schedule?: Record<string, DaySchedule>;
  contractType?: string;
  hourlyRate?: number;
  overtimeHours?: number;
  totalHoursWorked?: number;
  vacationDaysTotal?: number;
  vacationDaysTaken?: number;
  vacationHistory?: VacationRequest[];
  attendanceHistory?: AttendanceRecord[];
}

export interface ColorTemplate {
  id: string;
  name: string;
  primary: string;
  dark: string;
  light: string;
}

export type VoiceAccent = 'es-ES-Madrid' | 'es-ES-Canarias' | 'es-LATAM' | 'en-GB' | 'en-US';

export interface AiPhoneSettings {
  phoneNumber: string;
  assistantName: string;
  initialGreeting: string;
  systemPrompt: string;
  instructions: string; // Instrucciones operativas adicionales
  testSpeechText: string;
  voiceName: string;
  voicePitch: number;
  voiceSpeed: number;
  temperature: number;
  accent: VoiceAccent;
  model: string;
  knowledgeBase?: string;
  knowledgeFiles?: FileAttachment[];
}

export type AppLanguage = 'es-ES' | 'es-LATAM' | 'en-GB' | 'en-US';

export interface AppLabels {
  [key: string]: string;
}

export interface VisualSettings {
  titleFontSize: number;
  bodyFontSize: number;
}

// --- NEW TYPES FOR LABOR CONFIGURATION ---
export interface LaborIncidentType {
  id: string;
  name: string;
  requiresJustification: boolean;
  isPaid: boolean;
  color: string; // Hex code or Tailwind class
}

export interface LaborSettings {
  vacationDaysPerYear: number;
  allowCarryOver: boolean; // Permitir acumular días al año siguiente
  businessDaysOnly: boolean; // Contar solo días hábiles
  defaultContractType: string;
  incidentTypes: LaborIncidentType[];
}

export interface ClinicSettings {
  name: string;
  logo: string;
  phone: string;
  email: string;
  address: string;
  currency: string;
  language: AppLanguage;
  services: ClinicService[];
  aiPhoneSettings: AiPhoneSettings;
  defaultTheme: 'light' | 'dark';
  colorTemplate: string;
  labels: AppLabels;
  visuals: VisualSettings;
  laborSettings: LaborSettings; // New field
}

export type UserRole = 'Admin' | 'Doctor' | 'Recepción' | 'Enfermería';

export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: 'High' | 'Medium' | 'Low';
  sub?: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  doctorName: string;
  doctorId: string;
  treatment: string;
  date: string;
  time: string;
  status: AppointmentStatus;
}

export interface Patient {
  id: string;
  name: string;
  birthDate: string;
  gender: 'Masculino' | 'Femenino' | 'Otro';
  identityDocument: string;
  phone: string;
  email: string;
  address: string;
  medicalHistory: string;
  img: string;
  associatedDoctorId?: string;
  associatedDoctorName?: string;
  weight?: string;
  height?: string;
  bloodType?: string;
  allergies?: string[];
  attachments?: FileAttachment[];
  savedReports?: MedicalReport[];
  pathologies?: string;
  diseases?: string;
  surgeries?: string;
  medications?: string;
  history?: { date: string; action: string; description: string; }[];
}
