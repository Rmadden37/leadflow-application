
"use client";

import type { Lead, LeadStatus } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useState } from "react";
import { Loader2 } from "lucide-react";

interface LeadDispositionModalProps {
  lead: Lead;
  isOpen: boolean;
  onClose: () => void;
}

const dispositionOptions: LeadStatus[] = [
  "sold",
  "no_sale",
  "canceled",
  "rescheduled",
  "credit_fail",
];

export default function LeadDispositionModal({ lead, isOpen, onClose }: LeadDispositionModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<LeadStatus | undefined>(undefined);
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!selectedStatus) {
      toast({
        title: "No Status Selected",
        description: "Please select a disposition status.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const leadDocRef = doc(db, "leads", lead.id);
      await updateDoc(leadDocRef, {
        status: selectedStatus,
        dispositionNotes: notes,
        updatedAt: serverTimestamp(),
      });
      toast({
        title: "Disposition Updated",
        description: `Lead marked as ${selectedStatus.replace("_", " ")}.`,
      });
      onClose();
      setSelectedStatus(undefined);
      setNotes("");
    } catch (error) {
      console.error("Error updating disposition:", error);
      toast({
        title: "Update Failed",
        description: "Could not update lead disposition.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-headline">Update Lead Disposition</DialogTitle>
          <DialogDescription>
            Select the outcome for lead: {lead.customerName}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <RadioGroup onValueChange={(value) => setSelectedStatus(value as LeadStatus)} value={selectedStatus}>
            {dispositionOptions.map((status) => (
              <div key={status} className="flex items-center space-x-2">
                <RadioGroupItem value={status} id={`status-${status}`} />
                <Label htmlFor={`status-${status}`} className="capitalize">
                  {status.replace("_", " ")}
                </Label>
              </div>
            ))}
          </RadioGroup>
          <Textarea
            placeholder="Add any relevant notes (optional)..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !selectedStatus}>
            {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Save Disposition"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
