
import type { Timestamp, GeoPoint } from 'firebase/firestore';

export type UserRole = "setter" | "closer" | "manager";

export interface AppUser {
  uid: string;
  email: string | null;
  displayName?: string | null; // This can be the general user display name
  role: UserRole;
  teamId: string;
  // The status field is now primarily managed in the 'closers' collection for closers
  // This status in AppUser might be a general status or specific to non-closer roles if needed.
  status?: "On Duty" | "Off Duty" | string;
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
  scheduledAppointmentTime?: Timestamp; // New field for rescheduled appointments
  setterId?: string; // UID of the user (setter or manager) who created the lead
  setterName?: string; // Display name of the setter
  setterLocation?: GeoPoint | null; // GeoPoint from Firestore for setter's location
}

// Updated Closer type to reflect the fields in the 'closers' collection
export interface Closer {
  uid: string; // Document ID from 'closers' collection
  name: string;
  status: "On Duty" | "Off Duty";
  teamId: string;
  role?: UserRole; // Role is also in the 'closers' collection as per screenshot
  avatarUrl?: string;
  phone?: string;
}
