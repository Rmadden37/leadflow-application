
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
  DialogClose,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { addDoc, collection, serverTimestamp, Timestamp } from "firebase/firestore";
import { useState, useEffect } from "react";
import { Loader2, CalendarIcon, Info } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import type { DispatchType } from "@/types";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
const minutes = ['00', '15', '30', '45'];

const formSchema = z.object({
  customerName: z.string().min(2, { message: "Customer name must be at least 2 characters." }),
  customerPhone: z.string().min(10, { message: "Phone number must be at least 10 digits." }).regex(/^\+?[0-9\s\(\)-]+$/, { message: "Invalid phone number format."}),
  address: z.string().min(5, { message: "Address must be at least 5 characters." }),
  dispatchType: z.enum(["immediate", "scheduled"], { required_error: "Please select a dispatch type." }) as z.ZodType<DispatchType>,
  appointmentDate: z.date().optional(),
  appointmentHour: z.string().optional(),
  appointmentMinute: z.string().optional(),
  photos: z.custom<FileList>().optional(),
}).superRefine((data, ctx) => {
  if (data.dispatchType === "scheduled") {
    if (!data.appointmentDate) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Date is required for scheduled dispatch.", path: ["appointmentDate"] });
    }
    if (!data.appointmentHour) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Hour is required for scheduled dispatch.", path: ["appointmentHour"] });
    }
    if (!data.appointmentMinute) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Minute is required for scheduled dispatch.", path: ["appointmentMinute"] });
    }
    if (data.appointmentDate && data.appointmentHour && data.appointmentMinute) {
      const combinedDateTime = new Date(data.appointmentDate);
      combinedDateTime.setHours(parseInt(data.appointmentHour, 10), parseInt(data.appointmentMinute, 10), 0, 0);
      if (combinedDateTime <= new Date()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Scheduled dispatch time must be in the future.", path: ["appointmentDate"] });
      }
    }
  }
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
      address: "",
      dispatchType: "immediate",
    },
  });

  const dispatchType = form.watch("dispatchType");

  const resetFormAndState = () => {
    form.reset({
      customerName: "",
      customerPhone: "",
      address: "",
      dispatchType: "immediate",
      appointmentDate: undefined,
      appointmentHour: undefined,
      appointmentMinute: undefined,
      photos: undefined,
    });
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

    let scheduledTimestamp: Timestamp | null = null;
    let leadStatus: "waiting_assignment" | "scheduled" = "waiting_assignment";

    if (values.dispatchType === "scheduled" && values.appointmentDate && values.appointmentHour && values.appointmentMinute) {
      const combinedDateTime = new Date(values.appointmentDate);
      combinedDateTime.setHours(parseInt(values.appointmentHour, 10), parseInt(values.appointmentMinute, 10), 0, 0);
      scheduledTimestamp = Timestamp.fromDate(combinedDateTime);
      leadStatus = "scheduled";
    }

    try {
      await addDoc(collection(db, "leads"), {
        customerName: values.customerName,
        customerPhone: values.customerPhone,
        address: values.address,
        dispatchType: values.dispatchType,
        status: leadStatus,
        teamId: user.teamId,
        setterId: user.uid, 
        setterName: user.displayName || user.email, 
        setterLocation: null, 
        assignedCloserId: null,
        assignedCloserName: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        dispositionNotes: "",
        scheduledAppointmentTime: scheduledTimestamp,
        photoUrls: [], // Placeholder for photo URLs, actual upload logic is pending
      });

      toast({
        title: "Lead Created",
        description: `${values.customerName} has been added.`,
      });

      if (values.photos && values.photos.length > 0) {
        console.log("Selected files:", values.photos);
        // Firebase Storage upload logic would go here in a future step
      }

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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-headline text-xl">Create New Lead</DialogTitle>
          <DialogDescription>
            Enter customer details. Address autocomplete and photo uploads are future enhancements.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
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
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input placeholder="123 Main St, Anytown, USA" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dispatchType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Dispatch Type</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="immediate" />
                        </FormControl>
                        <FormLabel className="font-normal">Immediate Dispatch</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="scheduled" />
                        </FormControl>
                        <FormLabel className="font-normal">Scheduled Dispatch</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {dispatchType === "scheduled" && (
              <div className="space-y-3 rounded-md border border-border p-3">
                <FormLabel className="text-sm font-medium">Set Dispatch Time</FormLabel>
                <FormField
                  control={form.control}
                  name="appointmentDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date(new Date().setDate(new Date().getDate() -1))}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-2">
                  <FormField
                    control={form.control}
                    name="appointmentHour"
                    render={({ field }) => (
                      <FormItem>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Hour" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {hours.map(hour => <SelectItem key={hour} value={hour}>{hour}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="appointmentMinute"
                    render={({ field }) => (
                      <FormItem>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Minute" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {minutes.map(minute => <SelectItem key={minute} value={minute}>{minute}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}
            
            <FormField
              control={form.control}
              name="photos"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Photos (Optional)</FormLabel>
                  <FormControl>
                     <Input 
                        type="file" 
                        multiple 
                        accept="image/*"
                        onChange={(e) => field.onChange(e.target.files)} 
                      />
                  </FormControl>
                  <FormDescription>
                    Attach relevant images. Max 5 files. (Upload functionality is pending).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Alert variant="default" className="mt-4">
              <Info className="h-4 w-4" />
              <AlertTitle className="text-xs">Developer Note</AlertTitle>
              <AlertDescription className="text-xs">
                Address autocomplete and photo upload to Firebase Storage are planned future enhancements.
                Currently, photos selected will be logged to the console but not uploaded.
              </AlertDescription>
            </Alert>

            <DialogFooter className="pt-2">
              <DialogClose asChild>
                 <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                    Cancel
                  </Button>
              </DialogClose>
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
