
export type AppointmentStatus = 'Confirmed' | 'Rescheduled' | 'Cancelled' | 'Pending' | 'Completed';

export interface FileAttachment {
  id: string;
  name: string;
  type: string;
  url: string;
  size: string;
  date: string;
}

export interface Patient {
  id: string;
  name: string;
  age: string;
  img: string;
  phone: string;
  email: string;
  address: string;
  lastVisit?: string;
  medicalHistory: string;
  attachments: FileAttachment[];
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
  date: string; // YYYY-MM-DD
  treatment: string;
  status: AppointmentStatus;
  notes?: string;
  avatar?: string;
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  status: 'Active' | 'Vacation' | 'Inactive';
  img: string;
  branch: string;
  phone: string;
  email: string;
  docs: FileAttachment[];
}

export interface Branch {
  id: string;
  name: string;
  address: string;
  location: string;
  status: 'Operativa' | 'Mantenimiento' | 'Cerrada';
  phone: string;
  staffCount: number;
}

export interface Task {
  id: string;
  text: string;
  sub: string;
  completed: boolean;
  priority: 'High' | 'Medium' | 'Low';
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}
