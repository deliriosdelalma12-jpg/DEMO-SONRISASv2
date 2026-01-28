
export type AppointmentStatus = 'Confirmed' | 'Reprogramada' | 'Cancelled' | 'Pending' | 'Completed';

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
  duration: number; 
}

export interface Branch {
  id: string;
  name: string;
  address: string;
  city: string;
  province?: string;
  zip: string;
  phone: string;
  email: string;
  status: 'Active' | 'Inactive' | 'Maintenance';
  coordinates: {
    lat: string;
    lng: string;
  };
  img: string;
  manager?: string;
  openingHours?: string;
  schedule?: Record<string, DaySchedule>;
  scheduleType?: 'continuous' | 'split';
  description?: string;
}

export type PermissionId = 
  | 'view_dashboard' 
  | 'view_agenda' 
  | 'view_patients' 
  | 'view_doctors'
  | 'view_branches' 
  | 'view_hr' 
  | 'view_metrics' 
  | 'view_settings' 
  | 'view_all_data' 
  | 'can_edit';     

export interface RoleDefinition {
  id: string;
  name: string;
  permissions: PermissionId[];
  isSystem?: boolean; 
}

export interface User {
  id: string;
  username: string;
  name: string;
  role: string; 
  img?: string;
}

export interface Shift {
  start: string;
  end: string;
  active: boolean;
}

export interface DaySchedule {
  morning: Shift;
  afternoon: Shift;
}

export interface AttendanceRecord {
  id: string;
  date: string;
  type: 'Retraso' | 'Ausencia' | 'Baja Médica' | 'Permiso' | string; 
  duration?: string;
  status: 'Pendiente' | 'Justificado' | 'No Justificado';
  notes?: string;
}

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
  role: string; 
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

export interface AiEscalationRules {
  transfer_number: string;
  escalate_on_frustration: boolean;
}

export interface AiPolicyTexts {
  cancel_policy: string;
  privacy_notice: string;
}

export interface AiPromptOverrides {
  custom_greeting?: string;
  custom_farewell?: string;
}

export interface AiPhoneSettings {
  assistantName: string;
  clinicDisplayName: string;
  language: string;
  voice: string;
  tone: 'formal' | 'cercano';
  phoneNumber: string;
  aiCompanyName: string;
  initialGreeting: string;
  systemPrompt: string;
  instructions: string; 
  testSpeechText: string;
  voiceName: string;
  voicePitch: number;
  voiceSpeed: number;
  temperature: number;
  accent: VoiceAccent;
  model: string;
  escalation_rules: AiEscalationRules;
  policy_texts: AiPolicyTexts;
  prompt_overrides: AiPromptOverrides;
  core_version: string;
  active: boolean;
  aiEmotion: string;
  aiStyle: string;
  aiRelation: string;
  aiFocus: string;
  configVersion: number;
  knowledgeBase?: string;
  knowledgeFiles?: FileAttachment[];
}

export type AppLanguage = 'es-ES' | 'es-LATAM' | 'en-GB' | 'en-US';
export type CountryRegion = 'ES' | 'MX' | 'US' | 'CO' | 'AR' | 'BZ' | 'CR' | 'SV' | 'GT' | 'HN' | 'NI' | 'PA'; 

export interface AppLabels {
  [key: string]: string;
}

export interface VisualSettings {
  titleFontSize: number;
  bodyFontSize: number;
}

export interface LaborIncidentType {
  id: string;
  name: string;
  requiresJustification: boolean;
  isPaid: boolean;
  color: string; 
}

export interface LaborSettings {
  vacationDaysPerYear: number;
  allowCarryOver: boolean; 
  businessDaysOnly: boolean; 
  defaultContractType: string;
  incidentTypes: LaborIncidentType[];
}

export interface AppointmentPolicy {
  confirmationWindow: 24 | 48; 
  leadTimeThreshold: number; 
  autoConfirmShortNotice: boolean; 
}

export interface ClinicSettings {
  id: string; 
  name: string;
  businessName: string;
  sector: string; 
  region: CountryRegion;
  province?: string;
  city?: string;
  branchCount: number; 
  scheduleType: 'continuous' | 'split'; 
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
  laborSettings: LaborSettings;
  appointmentPolicy: AppointmentPolicy; 
  roles: RoleDefinition[];
  globalSchedule: Record<string, DaySchedule>; 
}

export interface Task {
  id: string;
  title: string;
  description?: string; 
  completed: boolean;
  priority: 'High' | 'Medium' | 'Low';
  sub?: string;
  assignedToId: string; 
  createdById: string;
  createdByName: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  doctorName: string;
  doctorId: string;
  branch?: string; 
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
  img: string;
  associatedDoctorId?: string;
  associatedDoctorName?: string;
  weight?: string;
  height?: string;
  bloodType?: string;
  allergies: string[];
  pathologies: string[]; 
  surgeries: string[];    
  medications: string[]; 
  habits: string[];      
  familyHistory: string[]; 
  medicalHistory: string; 
  clinicalSummary?: string; 
  emotionalNotes?: string;  
  attachments?: FileAttachment[];
  savedReports?: MedicalReport[];
  history?: { date: string; action: string; description: string; }[];
}
