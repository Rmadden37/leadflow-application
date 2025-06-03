
"use client";

import { useState, useEffect } from "react";
import type { Closer, UserRole } from "@/types";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, orderBy, doc, writeBatch } from "firebase/firestore";
import CloserCard from "./closer-card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ManageClosersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ManageClosersModal({ isOpen, onClose }: ManageClosersModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [closers, setClosers] = useState<Closer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUpdatingOrder, setIsUpdatingOrder] = useState(false);

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
      orderBy("lineupOrder", "asc"),
      orderBy("name", "asc") // Secondary sort by name
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const closersData = querySnapshot.docs.map((docSnapshot, index) => {
        const data = docSnapshot.data();
        return {
          uid: docSnapshot.id,
          name: data.name,
          status: data.status as "On Duty" | "Off Duty",
          teamId: data.teamId,
          role: data.role as UserRole,
          avatarUrl: data.avatarUrl,
          phone: data.phone,
          // Use existing lineupOrder or default to a value based on current sort order if missing
          lineupOrder: typeof data.lineupOrder === 'number' ? data.lineupOrder : index * 1000,
        } as Closer;
      });
      // Client-side sort to ensure stable order for UI, especially if lineupOrder was just defaulted
      closersData.sort((a, b) => (a.lineupOrder ?? Infinity) - (b.lineupOrder ?? Infinity) || a.name.localeCompare(b.name));
      setClosers(closersData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching all closers for modal:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isOpen, user]);

  const handleMoveCloser = async (closerUid: string, direction: 'up' | 'down') => {
    setIsUpdatingOrder(true);
    const currentIndex = closers.findIndex(c => c.uid === closerUid);

    if (currentIndex === -1) {
      toast({ title: "Error", description: "Closer not found.", variant: "destructive" });
      setIsUpdatingOrder(false);
      return;
    }

    let otherIndex = -1;
    if (direction === 'up' && currentIndex > 0) {
      otherIndex = currentIndex - 1;
    } else if (direction === 'down' && currentIndex < closers.length - 1) {
      otherIndex = currentIndex + 1;
    }

    if (otherIndex === -1) {
      // This case should be prevented by disabled buttons, but as a safeguard:
      // toast({ title: "Cannot Move", description: "Closer is already at the top/bottom.", variant: "default" });
      setIsUpdatingOrder(false);
      return;
    }

    const closerToMove = closers[currentIndex];
    const otherCloser = closers[otherIndex];

    const batch = writeBatch(db);

    // Ensure lineupOrder is a number. Use current index * 1000 as a fallback if undefined.
    // This helps initialize order for items that might not have had one.
    const orderToMove = typeof closerToMove.lineupOrder === 'number' ? closerToMove.lineupOrder : currentIndex * 1000;
    const orderOther = typeof otherCloser.lineupOrder === 'number' ? otherCloser.lineupOrder : otherIndex * 1000;
    
    // If the orders are identical (e.g. both were just defaulted), differentiate them slightly.
    // This scenario is less likely if defaulting strategy is index-based and unique.
    // For simplicity, we directly swap the determined orders.

    const closerToMoveRef = doc(db, "closers", closerToMove.uid);
    batch.update(closerToMoveRef, { lineupOrder: orderOther });

    const otherCloserRef = doc(db, "closers", otherCloser.uid);
    batch.update(otherCloserRef, { lineupOrder: orderToMove });

    try {
      await batch.commit();
      toast({ title: "Lineup Updated", description: `${closerToMove.name} moved.` });
    } catch (error) {
      console.error("Error updating lineup order:", error);
      toast({ title: "Update Failed", description: "Could not update lineup order.", variant: "destructive" });
    } finally {
      setIsUpdatingOrder(false);
    }
  };


  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center justify-center">
            <Users className="mr-2 h-6 w-6 text-primary" />
            Manage Closer Status & Lineup
          </DialogTitle>
          <DialogDescription className="text-center">
            View all team closers, manage their duty status, and reorder the lineup.
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
            <ScrollArea className="h-[calc(60vh)] max-h-[400px] pr-3">
              <div className="space-y-3">
                {closers.map((closer, index) => (
                  <CloserCard
                    key={closer.uid}
                    closer={closer}
                    allowInteractiveToggle={true}
                    showMoveControls={user?.role === 'manager'}
                    canMoveUp={index > 0}
                    canMoveDown={index < closers.length - 1}
                    onMove={(direction) => handleMoveCloser(closer.uid, direction)}
                    isUpdatingOrder={isUpdatingOrder}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
