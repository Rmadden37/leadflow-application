
"use client";

import type { Closer } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserCheck, UserX, Loader2, ChevronUp, ChevronDown, Briefcase } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface CloserCardProps {
  closer: Closer;
  allowInteractiveToggle?: boolean;
  onMove?: (direction: 'up' | 'down') => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  showMoveControls?: boolean;
  isUpdatingOrder?: boolean;
  assignedLeadName?: string; // New prop
}

export default function CloserCard({
  closer,
  allowInteractiveToggle = true,
  onMove,
  canMoveUp,
  canMoveDown,
  showMoveControls,
  isUpdatingOrder,
  assignedLeadName,
}: CloserCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const canUserManagerOrSelfToggle = user && (user.role === 'manager' || (user.role === 'closer' && user.uid === closer.uid));
  // If assignedLeadName is present, this card represents a busy closer, so interactive toggle should not be shown.
  const showInteractiveSwitch = canUserManagerOrSelfToggle && allowInteractiveToggle && !assignedLeadName;

  const handleToggleCloserAvailability = async (checked: boolean) => {
    if (!user || !canUserManagerOrSelfToggle || assignedLeadName) return;

    setIsUpdatingStatus(true);
    const newStatus = checked ? "On Duty" : "Off Duty";

    try {
      const closerDocRef = doc(db, "closers", closer.uid);
      await updateDoc(closerDocRef, {
        status: newStatus,
      });
      toast({
        title: "Status Updated",
        description: `${closer.name || 'Closer'}'s status set to ${newStatus}.`,
      });
    } catch (error) {
      console.error("Error updating closer status:", error);
      toast({
        title: "Update Failed",
        description: `Could not update ${closer.name || 'Closer'}'s status.`,
        variant: "destructive",
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const currentStatusIsOnDuty = closer.status === "On Duty";

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow duration-200 dark:bg-black/[.25] dark:border-white/[.08]">
      <CardContent className="p-3">
        <div className="flex items-start space-x-3">
          <Avatar className="h-12 w-12 border border-border">
            <AvatarImage src={closer.avatarUrl || `https://ui-avatars.com/api/?name=${(closer.name || "User").replace(/\s+/g, '+')}&background=random`} />
            <AvatarFallback>{closer.name ? closer.name.substring(0, 2).toUpperCase() : "N/A"}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="text-sm font-bold font-headline">{closer.name || "Unnamed Closer"}</p>
            {assignedLeadName ? (
              <div className="flex items-center text-xs mt-1 text-primary">
                <Briefcase className="mr-1 h-4 w-4" />
                <span>Working on: {assignedLeadName}</span>
              </div>
            ) : showInteractiveSwitch ? (
              <div className="flex items-center space-x-2 mt-1">
                <Switch
                  id={`status-toggle-${closer.uid}`}
                  checked={currentStatusIsOnDuty}
                  onCheckedChange={handleToggleCloserAvailability}
                  disabled={isUpdatingStatus || isUpdatingOrder}
                  aria-label={currentStatusIsOnDuty ? `Set ${closer.name || 'Closer'} to Off Duty` : `Set ${closer.name || 'Closer'} to On Duty`}
                />
                <Label
                  htmlFor={`status-toggle-${closer.uid}`}
                  className={`text-xs font-medium ${currentStatusIsOnDuty ? 'text-accent' : 'text-destructive'}`}
                >
                  {isUpdatingStatus ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    currentStatusIsOnDuty ? "On Duty" : "Off Duty"
                  )}
                </Label>
              </div>
            ) : (
              <div className={`flex items-center text-xs mt-1 ${currentStatusIsOnDuty ? "text-accent" : "text-destructive"}`}>
                {currentStatusIsOnDuty ? (
                  <UserCheck className="mr-1 h-4 w-4" />
                ) : (
                  <UserX className="mr-1 h-4 w-4" />
                )}
                {closer.status}
              </div>
            )}
          </div>
          {showMoveControls && onMove && !assignedLeadName && ( // Hide move controls if closer is assigned
            <div className="flex flex-col space-y-1 ml-auto">
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onMove('up')} disabled={!canMoveUp || isUpdatingStatus || isUpdatingOrder}>
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onMove('down')} disabled={!canMoveDown || isUpdatingStatus || isUpdatingOrder}>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
