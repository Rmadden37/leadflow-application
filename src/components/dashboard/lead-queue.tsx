
"use client";

import { useState, useEffect, useCallback } from "react";
import type { Lead } from "@/types";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, orderBy, limit, writeBatch, doc, serverTimestamp } from "firebase/firestore";
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
    if (!user || !user.teamId) {
      setLoadingWaiting(false);
      setLoadingScheduled(false);
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

    const unsubscribeWaiting = onSnapshot(qWaiting, (querySnapshot) => {
      const leadsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead));
      setWaitingLeads(leadsData);
      setLoadingWaiting(false);
    }, (error) => {
      console.error("Error fetching waiting assignment leads:", error);
      setLoadingWaiting(false);
    });

    return () => unsubscribeWaiting();
  }, [user]);

  // Effect for fetching scheduled leads and processing them
  useEffect(() => {
    if (!user || !user.teamId) {
      setLoadingScheduled(false);
      return;
    }
    setLoadingScheduled(true);

    const qScheduled = query(
      collection(db, "leads"),
      where("teamId", "==", user.teamId),
      where("status", "==", "rescheduled"),
      orderBy("scheduledAppointmentTime", "asc") // Order by appointment time to process soonest first
    );

    const unsubscribeScheduled = onSnapshot(qScheduled, async (querySnapshot) => {
      const leadsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead));
      setScheduledLeads(leadsData);
      setLoadingScheduled(false);

      // Process leads that need to be moved
      const now = new Date();
      const leadsToMoveBatch = writeBatch(db);
      let movedCount = 0;

      leadsData.forEach(lead => {
        if (lead.scheduledAppointmentTime && !processedLeadIds.has(lead.id)) {
          const appointmentTime = lead.scheduledAppointmentTime.toDate();
          const timeUntilAppointment = appointmentTime.getTime() - now.getTime();

          // If current time is 45 mins before appointment or appointment has passed
          if (timeUntilAppointment <= FORTY_FIVE_MINUTES_MS) {
            const leadRef = doc(db, "leads", lead.id);
            leadsToMoveBatch.update(leadRef, {
              status: "waiting_assignment", // Move to waiting list
              updatedAt: serverTimestamp(),
              // assignedCloserId and assignedCloserName remain as they were
            });
            movedCount++;
            // Add to processedLeadIds to prevent immediate re-processing by this client
            // This is a client-side guard; backend processing is more robust.
            setProcessedLeadIds(prev => new Set(prev).add(lead.id));
          }
        }
      });

      if (movedCount > 0) {
        try {
          await leadsToMoveBatch.commit();
          toast({
            title: "Leads Updated",
            description: `${movedCount} scheduled lead(s) moved to waiting list.`,
          });
        } catch (error) {
          console.error("Error moving scheduled leads:", error);
          toast({
            title: "Update Failed",
            description: "Could not move scheduled leads automatically.",
            variant: "destructive",
          });
        }
      }
    }, (error) => {
      console.error("Error fetching scheduled leads:", error);
      setLoadingScheduled(false);
    });
    
    return () => unsubscribeScheduled();
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
                <p className="text-muted-foreground">Waiting list is empty.</p>
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
