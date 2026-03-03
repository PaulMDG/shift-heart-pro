export type ShiftStatus = "not_started" | "in_progress" | "completed" | "missed";

export interface Client {
  id: string;
  name: string;
  address: string;
  careType: string;
  emergencyContact: string;
  emergencyPhone: string;
  carePlanSummary: string;
  lat: number;
  lng: number;
}

export interface Shift {
  id: string;
  client: Client;
  date: string;
  startTime: string;
  endTime: string;
  status: ShiftStatus;
  adminNotes: string;
  clockInTime?: string;
  clockOutTime?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: "shift" | "swap" | "alert";
}

export const clients: Client[] = [
  {
    id: "c1",
    name: "Joan Williams",
    address: "142 Maple Street, Apt 3B",
    careType: "Personal Care",
    emergencyContact: "Robert Williams",
    emergencyPhone: "(555) 234-5678",
    carePlanSummary: "Assist with morning routine, medication reminders, light meal prep. Client has limited mobility on left side.",
    lat: 40.7128,
    lng: -74.006,
  },
  {
    id: "c2",
    name: "Harold Chen",
    address: "89 Oak Avenue, Suite 1",
    careType: "Companion Care",
    emergencyContact: "Lisa Chen",
    emergencyPhone: "(555) 876-5432",
    carePlanSummary: "Social engagement, light exercise walks, reading assistance. Client enjoys gardening and chess.",
    lat: 40.7148,
    lng: -74.008,
  },
  {
    id: "c3",
    name: "Margaret Davis",
    address: "2100 Pine Road",
    careType: "Medication Supervision",
    emergencyContact: "James Davis",
    emergencyPhone: "(555) 345-6789",
    carePlanSummary: "Medication administration at scheduled times, vital signs monitoring, wound care on right forearm.",
    lat: 40.7168,
    lng: -74.004,
  },
];

export const shifts: Shift[] = [
  {
    id: "s1",
    client: clients[0],
    date: "2026-03-02",
    startTime: "08:00 AM",
    endTime: "12:00 PM",
    status: "not_started",
    adminNotes: "Client prefers warm water for bathing. Please check medication box on kitchen counter.",
  },
  {
    id: "s2",
    client: clients[1],
    date: "2026-03-02",
    startTime: "01:00 PM",
    endTime: "04:00 PM",
    status: "not_started",
    adminNotes: "Take Harold for a 20-min walk if weather permits. His daughter may visit around 2 PM.",
  },
  {
    id: "s3",
    client: clients[2],
    date: "2026-03-03",
    startTime: "09:00 AM",
    endTime: "11:00 AM",
    status: "not_started",
    adminNotes: "New wound dressing supplies in the hallway closet. Vitals log is on the fridge.",
  },
  {
    id: "s4",
    client: clients[0],
    date: "2026-03-04",
    startTime: "08:00 AM",
    endTime: "12:00 PM",
    status: "not_started",
    adminNotes: "Physical therapist visit at 10 AM. Please assist client during session.",
  },
];

export const notifications: Notification[] = [
  {
    id: "n1",
    title: "New Shift Assigned",
    message: "You've been assigned to Joan Williams on March 2nd.",
    time: "2 hours ago",
    read: false,
    type: "shift",
  },
  {
    id: "n2",
    title: "Shift Reminder",
    message: "Your shift with Harold Chen starts in 1 hour.",
    time: "30 min ago",
    read: false,
    type: "shift",
  },
  {
    id: "n3",
    title: "Swap Approved",
    message: "Your shift swap request for March 5th has been approved.",
    time: "1 day ago",
    read: true,
    type: "swap",
  },
];
