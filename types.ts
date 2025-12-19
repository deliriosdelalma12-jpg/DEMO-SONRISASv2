
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
  category?: string;
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
  notes?: string;
  avatar?: string;
}

export type UserRole = 'Admin' | 'Doctor' | 'Recepción' | 'Enfermería';

export interface User {
  id: string;
  username: string;
  password?: string;
  name: string;
  role: UserRole;
  jobTitle: string;
  phone: string;
  identityDocument: string;
  img?: string;
  corporateEmail: string;
  status: 'Activo' | 'Inactivo';
}

export interface DaySchedule {
  morning: { start: string; end: string; active: boolean };
  afternoon: { start: string; end: string; active: boolean };
}

export interface VacationRequest {
  id: string;
  start: string;
  end: string;
  status: 'Pendiente' | 'Aprobada' | 'Rechazada';
  type: 'Vacaciones' | 'Asuntos Propios' | 'Baja';
}

export interface AttendanceRecord {
  id: string;
  date: string;
  type: 'Retraso' | 'Ausencia' | 'Baja Médica' | 'Permiso';
  duration?: string;
  status: 'Pendiente' | 'Justificado' | 'No Justificado';
  notes?: string;
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
  voicePitch: number;
  voiceSpeed: number;
  accent: VoiceAccent;
  model: string;
  hasPaidKey: boolean;
}

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
}

export interface Task {
  id: string;
  text: string;
  sub: string;
  completed: boolean;
  priority: 'High' | 'Medium' | 'Low';
  assigneeId?: string;
  assigneeName?: string;
}
