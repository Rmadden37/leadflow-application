
"use client";

import { useState, useEffect } from "react";
import type { Lead, Closer } from "@/types";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import LeadCard from "./lead-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ListChecks, CalendarClock, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { serverTimestamp, writeBatch, doc, Timestamp } from "firebase/firestore";

const FORTY_FIVE_MINUTES_MS = 45 * 60 * 1000;

export default function LeadQueue() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [waitingLeads, setWaitingLeads] = useState<Lead[]>([]);
  const [scheduledLeads, setScheduledLeads] = useState<Lead[]>([]);
  // Removed onDutyClosers and loadingClosers state as direct assignment is handled by Cloud Function

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
      orderBy("createdAt", "asc")
    );

    const unsubscribeWaiting = onSnapshot(qWaiting, (querySnapshot) => {
      const leadsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead));
      setWaitingLeads(leadsData);
      setLoadingWaiting(false);
      // Client-side auto-assignment logic removed - Cloud Function handles this
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
      const leadsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead));
      setScheduledLeads(leadsData);
      setLoadingScheduled(false);

      const now = new Date();
      const leadsToMoveBatch = writeBatch(db);
      let leadsMovedCount = 0;

      querySnapshot.docs.forEach(docSnapshot => {
        const lead = { id: docSnapshot.id, ...docSnapshot.data() } as Lead;
        if (lead.scheduledAppointmentTime && 
            (lead.status === "rescheduled" || lead.status === "scheduled") && 
            !processedScheduledLeadIds.has(lead.id)) {
          const appointmentTime = lead.scheduledAppointmentTime.toDate();
          const timeUntilAppointment = appointmentTime.getTime() - now.getTime();
          
          if (timeUntilAppointment <= FORTY_FIVE_MINUTES_MS) {
            const leadRef = doc(db, "leads", lead.id);
            // Only update status. Cloud Function will pick it up from 'waiting_assignment'.
            // Keep assignedCloserId and assignedCloserName if they exist.
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
          // Cloud Function will handle assignment from here.
        } catch (error) {
          console.error("[LeadQueue - ScheduledList] Error moving scheduled leads:", error);
          toast({
            title: "Update Failed",
            description: "Could not move scheduled leads automatically.",
            variant: "destructive",
          });
          // Revert processed IDs on failure
          const failedLeadIds = querySnapshot.docs
            .filter(docSnapshot => {
                const lead = { id: docSnapshot.id, ...docSnapshot.data() } as Lead;
                 return lead.scheduledAppointmentTime &&
                       (lead.status === "rescheduled" || lead.status === "scheduled") &&
                       (lead.scheduledAppointmentTime.toDate().getTime() - now.getTime() <= FORTY_FIVE_MINUTES_MS) &&
                       processedScheduledLeadIds.has(lead.id); // check if it was part of this batch
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
