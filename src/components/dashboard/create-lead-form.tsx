
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { GeoPoint, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useState } from "react";
import { Loader2, MapPin } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Label } from "@/components/ui/label"; // Added Label import

const formSchema = z.object({
  customerName: z.string().min(2, { message: "Customer name must be at least 2 characters." }),
  customerPhone: z.string().min(10, { message: "Phone number must be at least 10 digits." }).regex(/^\+?[0-9\s\(\)-]+$/, { message: "Invalid phone number format."}),
});

interface CreateLeadFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateLeadForm({ isOpen, onClose }: CreateLeadFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerName: "",
      customerPhone: "",
    },
  });

  const resetFormAndState = () => {
    form.reset();
    setCoordinates(null);
    setLocationError(null);
    setIsFetchingLocation(false);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetFormAndState();
    onClose();
  };

  const fetchLocation = () => {
    if (user?.role !== 'setter') {
      setLocationError("Location capture is only available for setters.");
      toast({ title: "Location Capture Not Available", description: "Only users with the 'setter' role can capture location.", variant: "destructive" });
      return;
    }

    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      return;
    }
    setIsFetchingLocation(true);
    setLocationError(null);
    setCoordinates(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setIsFetchingLocation(false);
        toast({ title: "Location Captured", description: "Setter location recorded." });
      },
      (error) => {
        console.error("Error getting location:", error);
        let message = "Could not retrieve location. ";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message += "Permission denied.";
            break;
          case error.POSITION_UNAVAILABLE:
            message += "Location information is unavailable.";
            break;
          case error.TIMEOUT:
            message += "The request to get user location timed out.";
            break;
          default:
            message += "An unknown error occurred.";
            break;
        }
        setLocationError(message);
        setIsFetchingLocation(false);
        toast({ title: "Location Error", description: message, variant: "destructive" });
      },
      { timeout: 10000 } // 10 second timeout
    );
  };


  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !user.teamId) {
      toast({
        title: "Error",
        description: "User information not available. Please try again.",
        variant: "destructive",
      });
      return;
    }
    setIsSubmitting(true);

    let setterLocationData: GeoPoint | null = null;
    // Only capture location if user is a setter and coordinates exist
    if (user.role === 'setter' && coordinates) {
      setterLocationData = new GeoPoint(coordinates.latitude, coordinates.longitude);
    }

    try {
      await addDoc(collection(db, "leads"), {
        customerName: values.customerName,
        customerPhone: values.customerPhone,
        status: "waiting_assignment",
        teamId: user.teamId,
        setterId: user.uid, // UID of the user creating the lead
        setterName: user.displayName || user.email, // Display name of the user creating the lead
        setterLocation: setterLocationData, // GeoPoint if setter, null otherwise
        assignedCloserId: null,
        assignedCloserName: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        dispositionNotes: "",
        scheduledAppointmentTime: null,
      });

      toast({
        title: "Lead Created",
        description: `${values.customerName} has been added to the queue.`,
      });
      handleClose(); // Reset form and close modal
    } catch (error) {
      console.error("Error creating lead:", error);
      toast({
        title: "Creation Failed",
        description: "Could not create the new lead.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false); // Ensure this is set even if handleClose already does
    }
  }

  if (!isOpen) return null;

  const canCaptureLocation = user?.role === 'setter';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-headline text-xl">Create New Lead</DialogTitle>
          <DialogDescription>
            Enter the customer's details. Location will be captured if permission is granted (setters only).
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="customerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="customerPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer Phone</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="(555) 123-4567" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <Label htmlFor="capture-location-button">Setter Location {canCaptureLocation ? "" : "(Setters Only)"}</Label>
              <Button
                id="capture-location-button"
                type="button"
                variant="outline"
                onClick={fetchLocation}
                disabled={isFetchingLocation || !canCaptureLocation}
                className="w-full"
                aria-describedby={!canCaptureLocation ? "location-disabled-description" : undefined}
              >
                {isFetchingLocation ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <MapPin className="mr-2 h-4 w-4" />
                )}
                {coordinates ? "Recapture Location" : "Capture Current Location"}
              </Button>
              {!canCaptureLocation && (
                <p id="location-disabled-description" className="text-xs text-muted-foreground">
                  Location capture is only enabled for users with the 'setter' role.
                </p>
              )}
              {coordinates && canCaptureLocation && (
                <p className="text-xs text-green-600">
                  Location captured: {coordinates.latitude.toFixed(4)}, {coordinates.longitude.toFixed(4)}
                </p>
              )}
              {locationError && (
                <p className="text-xs text-destructive">{locationError}</p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || (isFetchingLocation && canCaptureLocation) }>
                {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Create Lead"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
