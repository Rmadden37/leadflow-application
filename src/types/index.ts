import type { Timestamp } from 'firebase/firestore';

export type UserRole = "setter" | "closer" | "manager";

export interface AppUser {
  uid: string;
  email: string | null;
  displayName?: string | null;
  role: UserRole;
  teamId: string;
  availability?: boolean; // For closers
}

export type LeadStatus =
  | "waiting_assignment"
  | "in_process"
  | "sold"
  | "no_sale"
  | "canceled"
  | "rescheduled"
  | "credit_fail";

export interface Lead {
  id: string;
  customerName: string;
  customerPhone: string;
  status: LeadStatus;
  teamId: string;
  assignedCloserId?: string | null;
  assignedCloserName?: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  dispositionNotes?: string;
}

export interface Closer {
  uid: string;
  name: string;
  status: "Available" | "Off Duty"; // Derived from AppUser.availability
  teamId: string;
}
