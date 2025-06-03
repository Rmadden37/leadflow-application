
"use client";

import { useState, useEffect, useCallback } from "react";
import type { Lead } from "@/types";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, orderBy, limit, writeBatch, doc, serverTimestamp, Timestamp } from "firebase/firestore";
import LeadCard from "./lead-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ListChecks, CalendarClock, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

const FORTY_FIVE_MINUTES_MS = 45 * 60 * 1000;

export default function LeadQueue() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [waitingLeads, setWaitingLeads] = useState<Lead[]>([]);
  const [scheduledLeads, setScheduledLeads] = useState<Lead[]>([]);
  const [loadingWaiting, setLoadingWaiting] = useState(true);
  const [loadingScheduled, setLoadingScheduled] = useState(true);
  const [processedLeadIds, setProcessedLeadIds] = useState<Set<string>>(new Set());


  useEffect(() => {
    console.log("[LeadQueue - WaitingList] Hook triggered. User from useAuth:", user);
    if (!user || !user.teamId) {
      console.log("[LeadQueue - WaitingList] No user or no user.teamId. Skipping query. User:", user);
      setLoadingWaiting(false);
      setWaitingLeads([]);
      return;
    }
    setLoadingWaiting(true);
    
    const qWaiting = query(
      collection(db, "leads"),
      where("teamId", "==", user.teamId),
      where("status", "==", "waiting_assignment"),
      orderBy("createdAt", "asc"), 
      limit(20)
    );
    console.log("[LeadQueue - WaitingList] Querying for waiting_assignment leads. Query:", qWaiting);

    const unsubscribeWaiting = onSnapshot(qWaiting, (querySnapshot) => {
      console.log(`[LeadQueue - WaitingList] Snapshot received. Number of documents: ${querySnapshot.docs.length}`);
      const leadsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead));
      console.log("[LeadQueue - WaitingList] Mapped waitingLeadsData:", leadsData);
      setWaitingLeads(leadsData);
      setLoadingWaiting(false);
    }, (error) => {
      console.error("[LeadQueue - WaitingList] Error fetching waiting assignment leads:", error);
      setLoadingWaiting(false);
    });

    return () => {
      console.log("[LeadQueue - WaitingList] Cleaning up snapshot listener.");
      unsubscribeWaiting()
    };
  }, [user]);

  // Effect for fetching scheduled leads and processing them
  useEffect(() => {
    console.log("[LeadQueue - ScheduledList] Hook triggered. User from useAuth:", user);
    if (!user || !user.teamId) {
      console.log("[LeadQueue - ScheduledList] No user or no user.teamId. Skipping query. User:", user);
      setLoadingScheduled(false);
      setScheduledLeads([]);
      return;
    }
    setLoadingScheduled(true);

    const qScheduled = query(
      collection(db, "leads"),
      where("teamId", "==", user.teamId),
      where("status", "in", ["rescheduled", "scheduled"]), // Updated to include "scheduled" status
      orderBy("scheduledAppointmentTime", "asc") 
    );
    console.log("[LeadQueue - ScheduledList] Querying for rescheduled and scheduled leads. Query:", qScheduled);


    const unsubscribeScheduled = onSnapshot(qScheduled, async (querySnapshot) => {
      console.log(`[LeadQueue - ScheduledList] Snapshot received. Number of documents: ${querySnapshot.docs.length}`);
      const leadsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead));
      console.log("[LeadQueue - ScheduledList] Mapped scheduledLeadsData:", leadsData);
      setScheduledLeads(leadsData);
      setLoadingScheduled(false);

      // Process leads that need to be moved
      const now = new Date();
      const leadsToMoveBatch = writeBatch(db);
      let movedCount = 0;
      console.log(`[LeadQueue - ScheduledList] Processing ${leadsData.length} scheduled/rescheduled leads at ${now.toISOString()}`);

      leadsData.forEach(lead => {
        // Only process if it has an appointment time and hasn't been processed by this client session yet
        if (lead.scheduledAppointmentTime && (lead.status === "rescheduled" || lead.status === "scheduled") && !processedLeadIds.has(lead.id)) {
          const appointmentTime = lead.scheduledAppointmentTime.toDate();
          const timeUntilAppointment = appointmentTime.getTime() - now.getTime();
          
          console.log(`[LeadQueue - ScheduledList] Lead ID: ${lead.id}, Status: ${lead.status}, Appt Time: ${appointmentTime.toISOString()}, Time Until: ${timeUntilAppointment}ms`);

          // If current time is 45 mins before appointment or appointment has passed
          if (timeUntilAppointment <= FORTY_FIVE_MINUTES_MS) {
            console.log(`[LeadQueue - ScheduledList] Moving lead ID: ${lead.id} to waiting_assignment. Original closer: ${lead.assignedCloserName}`);
            const leadRef = doc(db, "leads", lead.id);
            leadsToMoveBatch.update(leadRef, {
              status: "waiting_assignment", 
              updatedAt: serverTimestamp(),
              // Keep assignedCloserId and assignedCloserName to indicate who it was previously with
            });
            movedCount++;
            setProcessedLeadIds(prev => new Set(prev).add(lead.id)); // Mark as processed
          }
        } else if (processedLeadIds.has(lead.id)) {
            console.log(`[LeadQueue - ScheduledList] Lead ID: ${lead.id} was already processed for moving by this client session.`);
        } else if (!lead.scheduledAppointmentTime && (lead.status === "rescheduled" || lead.status === "scheduled")) {
            console.warn(`[LeadQueue - ScheduledList] Lead ID: ${lead.id} has '${lead.status}' status but no scheduledAppointmentTime.`);
        }
      });

      if (movedCount > 0) {
        console.log(`[LeadQueue - ScheduledList] Committing batch to move ${movedCount} lead(s).`);
        try {
          await leadsToMoveBatch.commit();
          toast({
            title: "Leads Updated",
            description: `${movedCount} scheduled lead(s) moved to waiting list.`,
          });
          console.log(`[LeadQueue - ScheduledList] Successfully moved ${movedCount} lead(s).`);
        } catch (error) {
          console.error("[LeadQueue - ScheduledList] Error moving scheduled leads:", error);
          toast({
            title: "Update Failed",
            description: "Could not move scheduled leads automatically.",
            variant: "destructive",
          });
           // If batch commit fails, remove IDs from processedLeadIds so they can be retried
          const failedLeadIds = leadsData
            .filter(lead => lead.scheduledAppointmentTime && (lead.status === "rescheduled" || lead.status === "scheduled") && (lead.scheduledAppointmentTime.toDate().getTime() - now.getTime() <= FORTY_FIVE_MINUTES_MS))
            .map(lead => lead.id);
          setProcessedLeadIds(prev => {
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
    
    return () => {
      console.log("[LeadQueue - ScheduledList] Cleaning up snapshot listener.");
      unsubscribeScheduled();
    }
  }, [user, toast, processedLeadIds]);


  return (
    <Card className="h-full flex flex-col shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-medium font-headline flex items-center">
          <ListChecks className="mr-2 h-6 w-6 text-primary" />
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
                <p className="text-muted-foreground">No leads waiting</p>
              </div>
            ) : (
              <ScrollArea className="h-[280px] md:h-[380px] pr-4">
                <div className="space-y-4">
                  {waitingLeads.map(lead => (
                    <LeadCard key={lead.id} lead={lead} context="queue" />
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
                    <LeadCard key={lead.id} lead={lead} context="queue" />
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

