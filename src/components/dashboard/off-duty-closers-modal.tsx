
"use client";

import { useState, useEffect } from "react";
import type { Closer, UserRole } from "@/types";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import CloserCard from "./closer-card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, Loader2 } from "lucide-react"; // Changed UserX to Users

interface ManageClosersModalProps { // Renamed interface for clarity, was OffDutyClosersModalProps
  isOpen: boolean;
  onClose: () => void;
}

export default function ManageClosersModal({ isOpen, onClose }: ManageClosersModalProps) {
  const { user } = useAuth();
  const [closers, setClosers] = useState<Closer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !user || !user.teamId || user.role !== 'manager') {
      setLoading(false);
      setClosers([]);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, "closers"),
      where("teamId", "==", user.teamId),
      // Removed: where("status", "==", "Off Duty") to fetch all closers
      orderBy("name", "asc")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const closersData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          uid: doc.id,
          name: data.name,
          status: data.status as "On Duty" | "Off Duty",
          teamId: data.teamId,
          role: data.role as UserRole,
          avatarUrl: data.avatarUrl,
          phone: data.phone,
        } as Closer;
      });
      setClosers(closersData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching all closers for modal:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isOpen, user]);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center">
            <Users className="mr-2 h-6 w-6 text-muted-foreground" /> {/* Changed icon */}
            Manage Closer Status
          </DialogTitle>
          <DialogDescription>
            View all team closers and manage their duty status.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : closers.length === 0 ? (
            <div className="flex h-40 items-center justify-center">
              <p className="text-muted-foreground">No closers found for this team.</p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(60vh)] max-h-[400px] pr-3"> {/* Adjusted height */}
              <div className="space-y-3">
                {closers.map(closer => (
                  <CloserCard key={closer.uid} closer={closer} allowInteractiveToggle={true} />
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
