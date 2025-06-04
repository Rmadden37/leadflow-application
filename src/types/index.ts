
import type { Timestamp, GeoPoint } from 'firebase/firestore';

export type UserRole = "setter" | "closer" | "manager";

export interface AppUser {
  uid: string;
  email: string | null;
  displayName?: string | null; // This can be the general user display name
  role: UserRole;
  teamId: string;
  avatarUrl?: string; // Added avatarUrl
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
  | "scheduled"
  | "credit_fail";

export type DispatchType = "immediate" | "scheduled";

export interface Lead {
  id: string;
  customerName: string;
  customerPhone: string;
  address?: string; // New field for address
  status: LeadStatus;
  teamId: string;
  dispatchType: DispatchType; // New field for dispatch type
  assignedCloserId?: string | null;
  assignedCloserName?: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  dispositionNotes?: string;
  scheduledAppointmentTime?: Timestamp | null; // Will be used for scheduled dispatch time as well
  setterId?: string;
  setterName?: string;
  setterLocation?: GeoPoint | null;
  photoUrls?: string[]; // New field for photo URLs (placeholder for now)
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
  lineupOrder?: number; // Field for managing closer lineup order
}
