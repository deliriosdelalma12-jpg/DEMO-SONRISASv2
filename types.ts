
export interface Patient {
  id: string;
  name: string;
  age: string;
  img: string;
  phone: string;
  lastVisit?: string;
}

export interface Appointment {
  id: string;
  patientName: string;
  patientId: string;
  doctorName: string;
  time: string;
  treatment: string;
  status: 'Confirmed' | 'In Progress' | 'Cancelled' | 'Pending';
  avatar?: string;
}

export interface Doctor {
  name: string;
  specialty: string;
  status: 'Active' | 'Vacation' | 'Inactive';
  img: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}
