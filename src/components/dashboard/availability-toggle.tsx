
"use client";

import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

export default function AvailabilityToggle() {
  const { user } = useAuth();
  const { toast } = useToast();
  // Initialize based on user.status. Assuming "On Duty" means available.
  const [isUIDuty, setIsUIDuty] = useState(user?.status === "On Duty");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user?.status !== undefined) {
      setIsUIDuty(user.status === "On Duty");
    }
  }, [user?.status]);

  if (!user || user.role !== "closer") {
    return null;
  }

  const handleToggleAvailability = async (checked: boolean) => {
    if (!user?.uid) return;
    setIsLoading(true);
    setIsUIDuty(checked); // Optimistic update for UI

    const newFirestoreStatus = checked ? "On Duty" : "Off Duty";

    try {
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, {
        status: newFirestoreStatus, // Update the 'status' field in Firestore
      });
      toast({
        title: "Status Updated",
        description: `You are now ${newFirestoreStatus}.`,
      });
    } catch (error) {
      console.error("Error updating availability status:", error);
      setIsUIDuty(!checked); // Revert optimistic update
      toast({
        title: "Update Failed",
        description: "Could not update your availability status.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <Switch
        id="availability-toggle"
        checked={isUIDuty}
        onCheckedChange={handleToggleAvailability}
        disabled={isLoading}
        aria-label={isUIDuty ? "Set to Off Duty" : "Set to On Duty"}
      />
      <Label htmlFor="availability-toggle" className={`text-sm font-medium ${isUIDuty ? 'text-green-600' : 'text-red-600'}`}>
        {isUIDuty ? "On Duty" : "Off Duty"}
      </Label>
    </div>
  );
}
