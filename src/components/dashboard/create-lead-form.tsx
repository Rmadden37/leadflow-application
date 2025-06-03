
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
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

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

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerName: "",
      customerPhone: "",
    },
  });

  const resetFormAndState = () => {
    form.reset();
    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetFormAndState();
    onClose();
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

    try {
      await addDoc(collection(db, "leads"), {
        customerName: values.customerName,
        customerPhone: values.customerPhone,
        status: "waiting_assignment",
        teamId: user.teamId,
        setterId: user.uid, 
        setterName: user.displayName || user.email, 
        setterLocation: null, // Location is no longer captured via this form
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
      handleClose(); 
    } catch (error) {
      console.error("Error creating lead:", error);
      toast({
        title: "Creation Failed",
        description: "Could not create the new lead.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false); 
    }
  }

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-headline text-xl">Create New Lead</DialogTitle>
          <DialogDescription>
            Enter the customer's details to add them to the queue.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
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
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Create Lead"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
