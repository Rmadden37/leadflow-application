
"use client";

import {useAuth} from "@/hooks/use-auth";
import {db} from "@/lib/firebase";
import {doc, updateDoc, getDoc} from "firebase/firestore";
import {Switch} from "@/components/ui/switch";
import {Label} from "@/components/ui/label";
import {useToast} from "@/hooks/use-toast";
import {useState, useEffect} from "react";

export default function AvailabilityToggle() {
  const {user} = useAuth(); // `user` here is AppUser (from `users` collection)
  const {toast} = useToast();

  const [isUIDuty, setIsUIDuty] = useState(false); // Default to false, will be updated from Firestore
  const [isLoading, setIsLoading] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  // Effect to fetch initial status from 'closers' collection
  useEffect(() => {
    if (user?.uid && user.role === "closer") {
      const fetchCloserStatus = async () => {
        setIsLoading(true);
        // Assume document ID in 'closers' collection is the same as Firebase Auth UID
        const closerDocRef = doc(db, "closers", user.uid);
        try {
          const docSnap = await getDoc(closerDocRef);
          if (docSnap.exists()) {
            const closerData = docSnap.data();
            setIsUIDuty(closerData.status === "On Duty");
          } else {
            // If no document in 'closers', default to off duty
            setIsUIDuty(false);
            toast({
              title: "Profile Issue",
              description: "Closer profile not found. Please contact support.",
              variant: "destructive",
            });
          }
        } catch (error) {
          toast({
            title: "Connection Error",
            description: "Could not load status. Please refresh the page.",
            variant: "destructive",
          });
          setIsUIDuty(false); // Default to off-duty on error
        } finally {
          setIsLoading(false);
          setInitialLoadDone(true);
        }
      };
      fetchCloserStatus();
    }
  }, [user?.uid, user?.role]);


  if (!user || user.role !== "closer" || !initialLoadDone) {
    // Don't render if not a closer or if initial status hasn't been loaded yet
    // to prevent toggle appearing in an incorrect initial state.
    return null;
  }

  const handleToggleAvailability = async (checked: boolean) => {
    if (!user?.uid) return;
    setIsLoading(true);
    setIsUIDuty(checked); // Optimistic update for UI

    const newFirestoreStatus = checked ? "On Duty" : "Off Duty";

    try {
      // Assume document ID in 'closers' collection is the same as Firebase Auth UID
      const closerDocRef = doc(db, "closers", user.uid);
      await updateDoc(closerDocRef, {
        status: newFirestoreStatus,
      });
      toast({
        title: "Status Updated",
        description: `You are now ${newFirestoreStatus}.`,
      });
    } catch (error) {
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
      <Label htmlFor="availability-toggle" className={`text-sm font-medium ${isUIDuty ? "text-accent" : "text-destructive"}`}>
        {isUIDuty ? "On Duty" : "Off Duty"}
      </Label>
    </div>
  );
}

