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
  const [isAvailable, setIsAvailable] = useState(user?.availability ?? false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user?.availability !== undefined) {
      setIsAvailable(user.availability);
    }
  }, [user?.availability]);

  if (!user || user.role !== "closer") {
    return null;
  }

  const handleToggleAvailability = async (checked: boolean) => {
    if (!user?.uid) return;
    setIsLoading(true);
    setIsAvailable(checked); // Optimistic update

    try {
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, {
        availability: checked,
      });
      toast({
        title: "Status Updated",
        description: `You are now ${checked ? "Available" : "Off Duty"}.`,
      });
    } catch (error) {
      console.error("Error updating availability:", error);
      setIsAvailable(!checked); // Revert optimistic update
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
        checked={isAvailable}
        onCheckedChange={handleToggleAvailability}
        disabled={isLoading}
        aria-label={isAvailable ? "Set to Off Duty" : "Set to Available"}
      />
      <Label htmlFor="availability-toggle" className={`text-sm font-medium ${isAvailable ? 'text-green-600' : 'text-red-600'}`}>
        {isAvailable ? "Available" : "Off Duty"}
      </Label>
    </div>
  );
}
