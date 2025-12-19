
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
}

// Added missing interface for attendance tracking
export interface AttendanceRecord {
  id: string;
  date: string;
  type: 'Retraso' | 'Ausencia' | 'Baja Médica' | 'Permiso';
  duration?: string;
  status: 'Pendiente' | 'Justificado' | 'No Justificado';
  notes?: string;
}

// Added missing interface for vacation management
export interface VacationRequest {
  id: string;
  start: string;
  end: string;
  type: 'Vacaciones' | 'Asuntos Propios' | 'Baja';
  status: 'Pendiente' | 'Aprobada' | 'Rechazada';
}

// Added missing interface for scheduling shifts
export interface DaySchedule {
  morning: { start: string; end: string; active: boolean };
  afternoon: { start: string; end: string; active: boolean };
}

export interface Patient {
  id: string;
  name: string;
  birthDate: string; 
  gender: 'Masculino' | 'Femenino' | 'Otro';
  identityDocument: string;
  img: string;
  phone: string;
  email: string;
  address: string;
  medicalHistory: string;
  associatedDoctorId?: string;
  associatedDoctorName?: string;
  weight?: string;
  height?: string;
  bloodType?: string;
  allergies?: string[];
  attachments: FileAttachment[];
  savedReports: MedicalReport[];
  history: {
    date: string;
    action: string;
    description: string;
  }[];
}

export interface Appointment {
  id: string;
  patientName: string;
  patientId: string;
  doctorName: string;
  doctorId: string;
  time: string;
  date: string; 
  treatment: string;
  status: AppointmentStatus;
}

export type UserRole = 'Admin' | 'Doctor' | 'Recepción' | 'Enfermería';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  img?: string;
}

export interface Doctor {
  id: string;
  name: string;
  role: UserRole;
  specialty: string;
  status: 'Active' | 'Inactive' | 'Vacation';
  img: string;
  branch: string;
  phone: string;
  corporateEmail: string;
  docs: FileAttachment[];
  // Added missing HR and scheduling properties
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

export interface RolePermissions {
  visualize: boolean;
  create: boolean;
  modify: boolean;
  delete: boolean;
}

export interface RoleDefinition {
  id: UserRole;
  name: string;
  permissions: RolePermissions;
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
  systemPrompt: string;
  knowledgeBase: string;
  knowledgeFiles: FileAttachment[];
  voiceName: string;
  voicePitch: number; // Actúa como temperatura emocional
  voiceSpeed: number; // Velocidad de habla
  temperature: number; // Temperatura del modelo LLM
  accent: VoiceAccent;
  model: string;
  hasPaidKey: boolean;
}

export type AppLanguage = 'es-ES' | 'es-LATAM' | 'en-GB' | 'en-US';

export interface ClinicSettings {
  name: string;
  logo: string;
  phone: string;
  email: string;
  address: string;
  sector: string;
  description: string;
  specialties: string[];
  services: ClinicService[];
  aiPhoneSettings: AiPhoneSettings;
  defaultTheme: 'light' | 'dark';
  colorTemplate: string;
  roles: RoleDefinition[];
  currency: string;
  language: AppLanguage;
}

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  priority: 'High' | 'Medium' | 'Low';
  sub?: string; // Added missing field used in Dashboard
}
