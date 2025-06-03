
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
import { doc, updateDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { useState, useEffect } from "react";
import { CalendarIcon, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

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

const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
const minutes = ['00', '15', '30', '45'];

export default function LeadDispositionModal({ lead, isOpen, onClose }: LeadDispositionModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<LeadStatus | undefined>(undefined);
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const [appointmentDate, setAppointmentDate] = useState<Date | undefined>(undefined);
  const [appointmentHour, setAppointmentHour] = useState<string | undefined>(undefined);
  const [appointmentMinute, setAppointmentMinute] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (isOpen) {
      setSelectedStatus(undefined);
      setNotes("");
      setAppointmentDate(undefined);
      setAppointmentHour(undefined);
      setAppointmentMinute(undefined);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!selectedStatus) {
      toast({
        title: "No Status Selected",
        description: "Please select a disposition status.",
        variant: "destructive",
      });
      return;
    }

    let scheduledTimestamp: Timestamp | undefined = undefined;
    if (selectedStatus === "rescheduled") {
      if (!appointmentDate || !appointmentHour || !appointmentMinute) {
        toast({
          title: "Missing Appointment Time",
          description: "Please select a date and time for the rescheduled appointment.",
          variant: "destructive",
        });
        return;
      }
      const combinedDateTime = new Date(appointmentDate);
      combinedDateTime.setHours(parseInt(appointmentHour, 10), parseInt(appointmentMinute, 10), 0, 0);
      
      if (combinedDateTime <= new Date()) {
        toast({
          title: "Invalid Appointment Time",
          description: "Scheduled appointment time must be in the future.",
          variant: "destructive",
        });
        return;
      }
      scheduledTimestamp = Timestamp.fromDate(combinedDateTime);
    }

    setIsLoading(true);
    try {
      const leadDocRef = doc(db, "leads", lead.id);
      const updateData: any = {
        status: selectedStatus,
        dispositionNotes: notes,
        updatedAt: serverTimestamp(),
      };

      if (selectedStatus === "rescheduled" && scheduledTimestamp) {
        updateData.scheduledAppointmentTime = scheduledTimestamp;
      } else {
        // Clear scheduled time if not rescheduled or if it was previously rescheduled and now something else
        updateData.scheduledAppointmentTime = null; 
      }


      await updateDoc(leadDocRef, updateData);
      toast({
        title: "Disposition Updated",
        description: `Lead marked as ${selectedStatus.replace("_", " ")}.`,
      });
      onClose();
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
      <DialogContent className="sm:max-w-md">
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

          {selectedStatus === "rescheduled" && (
            <div className="space-y-3 rounded-md border border-border p-3">
              <Label className="text-sm font-medium">Set Appointment Time</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !appointmentDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {appointmentDate ? format(appointmentDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={appointmentDate}
                    onSelect={setAppointmentDate}
                    initialFocus
                    disabled={(date) => date < new Date(new Date().setDate(new Date().getDate() -1))} // Disable past dates
                  />
                </PopoverContent>
              </Popover>
              <div className="grid grid-cols-2 gap-2">
                <Select onValueChange={setAppointmentHour} value={appointmentHour}>
                  <SelectTrigger placeholder="Hour">
                    <SelectValue placeholder="Hour" />
                  </SelectTrigger>
                  <SelectContent>
                    {hours.map(hour => (
                      <SelectItem key={hour} value={hour}>{hour}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select onValueChange={setAppointmentMinute} value={appointmentMinute}>
                  <SelectTrigger placeholder="Minute">
                    <SelectValue placeholder="Minute" />
                  </SelectTrigger>
                  <SelectContent>
                    {minutes.map(minute => (
                      <SelectItem key={minute} value={minute}>{minute}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

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
