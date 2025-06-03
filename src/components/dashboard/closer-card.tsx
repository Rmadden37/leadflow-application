
"use client";

import type { Closer } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserCheck, UserX, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface CloserCardProps {
  closer: Closer;
  allowInteractiveToggle?: boolean; // New prop
}

export default function CloserCard({ closer, allowInteractiveToggle = true }: CloserCardProps) {
  const { user } = useAuth(); 
  const { toast } = useToast();
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const canUserManagerOrSelfToggle = user && (user.role === 'manager' || (user.role === 'closer' && user.uid === closer.uid));
  const showInteractiveToggle = canUserManagerOrSelfToggle && allowInteractiveToggle;

  const handleToggleCloserAvailability = async (checked: boolean) => {
    if (!user || !canUserManagerOrSelfToggle) return; 
    
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
    <Card className="shadow-sm hover:shadow-md transition-shadow duration-200 dark:bg-black/[.15] dark:border-white/[.08]">
      <CardContent className="p-3">
        <div className="flex items-center space-x-3">
          <Avatar className="h-12 w-12 border border-border">
            <AvatarImage src={closer.avatarUrl || `https://ui-avatars.com/api/?name=${(closer.name || "User").replace(/\s+/g, '+')}&background=random`} />
            <AvatarFallback>{closer.name ? closer.name.substring(0, 2).toUpperCase() : "N/A"}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="text-sm font-medium font-headline">{closer.name || "Unnamed Closer"}</p>
            {showInteractiveToggle ? (
              <div className="flex items-center space-x-2 mt-1">
                <Switch
                  id={`status-toggle-${closer.uid}`}
                  checked={currentStatusIsOnDuty}
                  onCheckedChange={handleToggleCloserAvailability}
                  disabled={isUpdatingStatus}
                  aria-label={currentStatusIsOnDuty ? `Set ${closer.name || 'Closer'} to Off Duty` : `Set ${closer.name || 'Closer'} to On Duty`}
                />
                <Label
                  htmlFor={`status-toggle-${closer.uid}`}
                  className={`text-xs font-medium ${currentStatusIsOnDuty ? 'text-accent' : 'text-destructive'}`}
                >
                  {isUpdatingStatus ? (
                    <Loader2 className="h-3 w-3 animate-spin" /> 
                  ): (
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
        </div>
      </CardContent>
    </Card>
  );
}
