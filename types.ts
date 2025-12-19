
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

export interface User {
  id: string;
  name: string;
  role: 'Admin' | 'Doctor' | 'Recepción' | 'Enfermería';
  img?: string;
  corporateEmail: string;
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

export interface VacationRequest {
  id: string;
  start: string;
  end: string;
  status: 'Aprobada' | 'Pendiente' | 'Rechazada';
  type: 'Vacaciones' | 'Asuntos Propios' | 'Baja';
}

export interface AttendanceRecord {
  id: string;
  date: string;
  type: 'Retraso' | 'Ausencia' | 'Baja Médica' | 'Permiso';
  duration?: string; // Ejemplo: "45 min" o "3 días"
  status: 'Justificado' | 'No Justificado' | 'Pendiente';
  notes?: string;
}

export interface Doctor extends User {
  specialty: string;
  status: 'Active' | 'Vacation' | 'Inactive';
  branch: string;
  phone: string;
  docs: FileAttachment[];
  schedule?: Record<string, DaySchedule>;
  // Datos Laborales
  contractType?: string;
  overtimeHours?: number;
  totalHoursWorked?: number;
  vacationDaysTotal?: number;
  vacationDaysTaken?: number;
  vacationHistory?: VacationRequest[];
  attendanceHistory?: AttendanceRecord[];
  hourlyRate?: number;
}

export interface ClinicSettings {
  name: string;
  logo: string;
  phone: string;
  email: string;
  address: string;
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
