
"use client";

import { useState, useEffect } from "react";
import type { Lead, Closer } from "@/types";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, orderBy, Timestamp as FirestoreTimestamp } from "firebase/firestore"; // Added FirestoreTimestamp
import LeadCard from "./lead-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ListChecks, CalendarClock, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { serverTimestamp, writeBatch, doc } from "firebase/firestore";

const FORTY_FIVE_MINUTES_MS = 45 * 60 * 1000;

// Helper function to attempt parsing various date string formats
function parseDateString(dateString: string): Date | null {
  if (!dateString || typeof dateString !== 'string') return null;
  // Try direct parsing (handles ISO 8601 and some other common formats)
  let date = new Date(dateString);
  if (!isNaN(date.getTime())) return date;

  // Specific handling for "May 24, 2025 at 9:13:49 PM UTC-4" format
  // This is a simplified parser and might need to be more robust for production
  const recognizedFormatMatch = dateString.match(/(\w+\s\d{1,2},\s\d{4})\s(?:at)\s(\d{1,2}:\d{2}:\d{2}\s[AP]M)/i);
  if (recognizedFormatMatch) {
    const datePart = recognizedFormatMatch[1];
    const timePart = recognizedFormatMatch[2];
    date = new Date(`${datePart} ${timePart}`); // This will parse in local timezone
    if (!isNaN(date.getTime())) return date;
  }
  
  console.warn(`[LeadQueue] Could not parse date string: "${dateString}" into a valid Date object.`);
  return null;
}


export default function LeadQueue() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [waitingLeads, setWaitingLeads] = useState<Lead[]>([]);
  const [scheduledLeads, setScheduledLeads] = useState<Lead[]>([]);
  const [loadingWaiting, setLoadingWaiting] = useState(true);
  const [loadingScheduled, setLoadingScheduled] = useState(true);
  const [processedScheduledLeadIds, setProcessedScheduledLeadIds] = useState<Set<string>>(new Set());


  // Effect for fetching waiting_assignment leads
  useEffect(() => {
    if (!user || !user.teamId) {
      setLoadingWaiting(false);
      setWaitingLeads([]);
      return;
    }
    setLoadingWaiting(true);
    
    const qWaiting = query(
      collection(db, "leads"),
      where("teamId", "==", user.teamId),
      where("status", "==", "waiting_assignment"),
      orderBy("submissionTime", "asc") // Order by submissionTime
    );

    const unsubscribeWaiting = onSnapshot(qWaiting, (querySnapshot) => {
      const leadsData = querySnapshot.docs.map(docSnapshot => {
        const data = docSnapshot.data();
        let createdAtTimestamp: FirestoreTimestamp | null = null;

        if (data.submissionTime) {
          if (data.submissionTime instanceof FirestoreTimestamp) {
            createdAtTimestamp = data.submissionTime;
          } else if (typeof data.submissionTime === 'string') {
            const parsedDate = parseDateString(data.submissionTime);
            if (parsedDate) {
              createdAtTimestamp = FirestoreTimestamp.fromDate(parsedDate);
            }
          }
        } else if (data.createdAt instanceof FirestoreTimestamp) { // Fallback to createdAt if submissionTime is not present
            createdAtTimestamp = data.createdAt;
        }


        return {
          id: docSnapshot.id,
          customerName: data.clientName || data.customerName || "Unknown Customer",
          customerPhone: data.phone || data.customerPhone || "N/A",
          address: data.address,
          status: data.status,
          teamId: data.teamId,
          dispatchType: data.type || data.dispatchType || "immediate", // Map from type or dispatchType
          assignedCloserId: data.assignedCloserId || data.assignedCloser || null,
          assignedCloserName: data.assignedCloserName || null,
          createdAt: createdAtTimestamp, // Use the parsed/converted timestamp
          updatedAt: data.updatedAt instanceof FirestoreTimestamp ? data.updatedAt : serverTimestamp(),
          dispositionNotes: data.dispositionNotes || "",
          scheduledAppointmentTime: data.scheduledAppointmentTime instanceof FirestoreTimestamp ? data.scheduledAppointmentTime : (data.scheduledTime instanceof FirestoreTimestamp ? data.scheduledTime : null),
          setterId: data.setterId || null,
          setterName: data.setterName || null,
          setterLocation: data.setterLocation || null,
          photoUrls: data.photoUrls || [],
        } as Lead;
      });
      setWaitingLeads(leadsData);
      setLoadingWaiting(false);
    }, (error) => {
      console.error("[LeadQueue - WaitingList] Error fetching waiting assignment leads:", error);
      setLoadingWaiting(false);
    });

    return () => unsubscribeWaiting();
  }, [user]);


  // Effect for fetching scheduled leads and processing them
  useEffect(() => {
    if (!user || !user.teamId) {
      setLoadingScheduled(false);
      setScheduledLeads([]);
      return;
    }
    setLoadingScheduled(true);

    const qScheduled = query(
      collection(db, "leads"),
      where("teamId", "==", user.teamId),
      where("status", "in", ["rescheduled", "scheduled"]), 
      orderBy("scheduledAppointmentTime", "asc") 
    );

    const unsubscribeScheduled = onSnapshot(qScheduled, async (querySnapshot) => {
      const leadsData = querySnapshot.docs.map(docSnapshot => {
        const data = docSnapshot.data();
        let createdAtTimestamp: FirestoreTimestamp | null = null;
         if (data.submissionTime) {
          if (data.submissionTime instanceof FirestoreTimestamp) {
            createdAtTimestamp = data.submissionTime;
          } else if (typeof data.submissionTime === 'string') {
            const parsedDate = parseDateString(data.submissionTime);
            if (parsedDate) {
              createdAtTimestamp = FirestoreTimestamp.fromDate(parsedDate);
            }
          }
        } else if (data.createdAt instanceof FirestoreTimestamp) {
            createdAtTimestamp = data.createdAt;
        }

        return {
          id: docSnapshot.id,
          customerName: data.clientName || data.customerName || "Unknown Customer",
          customerPhone: data.phone || data.customerPhone || "N/A",
          address: data.address,
          status: data.status,
          teamId: data.teamId,
          dispatchType: data.type || data.dispatchType || "immediate",
          assignedCloserId: data.assignedCloserId || data.assignedCloser || null,
          assignedCloserName: data.assignedCloserName || null,
          createdAt: createdAtTimestamp,
          updatedAt: data.updatedAt instanceof FirestoreTimestamp ? data.updatedAt : serverTimestamp(),
          dispositionNotes: data.dispositionNotes || "",
          scheduledAppointmentTime: data.scheduledAppointmentTime instanceof FirestoreTimestamp ? data.scheduledAppointmentTime : (data.scheduledTime instanceof FirestoreTimestamp ? data.scheduledTime : null),
          setterId: data.setterId || null,
          setterName: data.setterName || null,
          setterLocation: data.setterLocation || null,
          photoUrls: data.photoUrls || [],
        } as Lead;
      });
      setScheduledLeads(leadsData);
      setLoadingScheduled(false);

      const now = new Date();
      const leadsToMoveBatch = writeBatch(db);
      let leadsMovedCount = 0;

      querySnapshot.docs.forEach(docSnapshot => {
        const lead = { id: docSnapshot.id, ...docSnapshot.data() } as Lead; // Re-map to ensure type consistency before checking
        // Ensure scheduledAppointmentTime is a FirestoreTimestamp before calling toDate()
        const leadScheduledAppointmentTime = docSnapshot.data().scheduledAppointmentTime;

        if (leadScheduledAppointmentTime instanceof FirestoreTimestamp &&
            (lead.status === "rescheduled" || lead.status === "scheduled") && 
            !processedScheduledLeadIds.has(lead.id)) {
          const appointmentTime = leadScheduledAppointmentTime.toDate();
          const timeUntilAppointment = appointmentTime.getTime() - now.getTime();
          
          if (timeUntilAppointment <= FORTY_FIVE_MINUTES_MS) {
            const leadRef = doc(db, "leads", lead.id);
            leadsToMoveBatch.update(leadRef, {
              status: "waiting_assignment", 
              updatedAt: serverTimestamp(),
            });
            setProcessedScheduledLeadIds(prev => new Set(prev).add(lead.id));
            leadsMovedCount++;
          }
        }
      });

      if (leadsMovedCount > 0) {
        try {
          await leadsToMoveBatch.commit();
          toast({
            title: "Leads Updated",
            description: `${leadsMovedCount} scheduled lead(s) moved to waiting list for assignment.`,
          });
        } catch (error) {
          console.error("[LeadQueue - ScheduledList] Error moving scheduled leads:", error);
          toast({
            title: "Update Failed",
            description: "Could not move scheduled leads automatically.",
            variant: "destructive",
          });
          const failedLeadIds = querySnapshot.docs
            .filter(docSnapshot => {
                const leadData = docSnapshot.data();
                const leadSchedTime = leadData.scheduledAppointmentTime;
                 return leadSchedTime instanceof FirestoreTimestamp &&
                       (leadData.status === "rescheduled" || leadData.status === "scheduled") &&
                       (leadSchedTime.toDate().getTime() - now.getTime() <= FORTY_FIVE_MINUTES_MS) &&
                       processedScheduledLeadIds.has(docSnapshot.id);
            })
            .map(l => l.id);
          
          setProcessedScheduledLeadIds(prev => {
            const newSet = new Set(prev);
            failedLeadIds.forEach(id => newSet.delete(id));
            return newSet;
          });
        }
      }
    }, (error) => {
      console.error("[LeadQueue - ScheduledList] Error fetching scheduled leads:", error);
      setLoadingScheduled(false);
    });
    
    return () => unsubscribeScheduled();
  }, [user, toast, processedScheduledLeadIds]);


  return (
    <Card className="h-full flex flex-col shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-2xl font-bold font-headline flex items-center justify-center w-full">
          <ListChecks className="mr-2 h-7 w-7 text-primary" />
          Lead Queues
        </CardTitle>
        {(loadingWaiting || loadingScheduled) && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden">
        <Tabs defaultValue="waiting" className="flex flex-col h-full">
          <TabsList className="grid w-full grid-cols-2 mb-2">
            <TabsTrigger value="waiting">
              <ListChecks className="mr-2 h-4 w-4" /> Waiting List
            </TabsTrigger>
            <TabsTrigger value="scheduled">
              <CalendarClock className="mr-2 h-4 w-4" /> Scheduled
            </TabsTrigger>
          </TabsList>
          <TabsContent value="waiting" className="flex-grow overflow-hidden">
            {loadingWaiting ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : waitingLeads.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-muted-foreground">No leads currently waiting for assignment.</p>
              </div>
            ) : (
              <ScrollArea className="h-[280px] md:h-[380px] pr-4">
                <div className="space-y-4">
                  {waitingLeads
                    .map(lead => (
                      <LeadCard key={lead.id} lead={lead} context="queue-waiting" />
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
          <TabsContent value="scheduled" className="flex-grow overflow-hidden">
            {loadingScheduled ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : scheduledLeads.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-muted-foreground">No leads currently scheduled.</p>
              </div>
            ) : (
              <ScrollArea className="h-[280px] md:h-[380px] pr-4">
                <div className="space-y-4">
                  {scheduledLeads.map(lead => (
                    <LeadCard key={lead.id} lead={lead} context="queue-scheduled" />
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

