
"use client";

import { useState, useEffect, useCallback } from "react";
import type { Lead, Closer, UserRole } from "@/types";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, orderBy, limit, writeBatch, doc, serverTimestamp, Timestamp, getDocs } from "firebase/firestore";
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
  const [onDutyClosers, setOnDutyClosers] = useState<Closer[]>([]);
  const [loadingWaiting, setLoadingWaiting] = useState(true);
  const [loadingScheduled, setLoadingScheduled] = useState(true);
  const [loadingClosers, setLoadingClosers] = useState(true);
  const [processedLeadIds, setProcessedLeadIds] = useState<Set<string>>(new Set()); // For scheduled leads moving to waiting
  const [assignedLeadIds, setAssignedLeadIds] = useState<Set<string>>(new Set()); // For leads processed for auto-assignment


  // Effect to fetch on-duty closers
  useEffect(() => {
    if (!user || !user.teamId) {
      setLoadingClosers(false);
      setOnDutyClosers([]);
      return;
    }
    setLoadingClosers(true);
    const closersQuery = query(
      collection(db, "closers"),
      where("teamId", "==", user.teamId),
      where("status", "==", "On Duty"),
      orderBy("lineupOrder", "asc"),
      orderBy("name", "asc")
    );

    const unsubscribeClosers = onSnapshot(closersQuery, (snapshot) => {
      const closersData = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as Closer));
      setOnDutyClosers(closersData);
      setLoadingClosers(false);
    }, (error) => {
      console.error("[LeadQueue] Error fetching on-duty closers:", error);
      setLoadingClosers(false);
    });

    return () => unsubscribeClosers();
  }, [user]);


  const attemptAutoAssignLead = useCallback(async (lead: Lead, currentClosers: Closer[]) => {
    if (!user || !user.teamId || assignedLeadIds.has(lead.id) || lead.status !== "waiting_assignment") {
      return;
    }

    console.log(`[LeadQueue] Attempting auto-assignment for lead: ${lead.id} (${lead.customerName})`);

    if (currentClosers.length > 0) {
      const nextCloser = currentClosers[0]; // Assign to the first in the lineupOrder
      
      console.log(`[LeadQueue] Assigning lead ${lead.id} to closer ${nextCloser.uid} (${nextCloser.name})`);

      const batch = writeBatch(db);
      const leadRef = doc(db, "leads", lead.id);

      batch.update(leadRef, {
        assignedCloserId: nextCloser.uid,
        assignedCloserName: nextCloser.name,
        status: "in_process",
        updatedAt: serverTimestamp(),
      });

      try {
        await batch.commit();
        setAssignedLeadIds(prev => new Set(prev).add(lead.id));
        toast({
          title: "Lead Assigned",
          description: `Lead "${lead.customerName}" automatically assigned to ${nextCloser.name}.`,
        });
        console.log(`[LeadQueue] Lead ${lead.id} successfully assigned to ${nextCloser.name}.`);
      } catch (error) {
        console.error(`[LeadQueue] Error auto-assigning lead ${lead.id}:`, error);
        toast({
          title: "Assignment Failed",
          description: `Could not automatically assign lead "${lead.customerName}".`,
          variant: "destructive",
        });
      }
    } else {
      console.log(`[LeadQueue] No on-duty closers available to assign lead ${lead.id}.`);
    }
  }, [user, toast, assignedLeadIds]);


  // Effect for fetching and processing waiting_assignment leads
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
      // Removed limit(20) to process all waiting leads for assignment
    );

    const unsubscribeWaiting = onSnapshot(qWaiting, (querySnapshot) => {
      const leadsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead));
      setWaitingLeads(leadsData);
      setLoadingWaiting(false);

      // Attempt to assign new waiting leads
      if (onDutyClosers.length > 0) {
        leadsData.forEach(lead => {
          if (!assignedLeadIds.has(lead.id)) {
            attemptAutoAssignLead(lead, onDutyClosers);
          }
        });
      } else if (!loadingClosers && onDutyClosers.length === 0 && leadsData.length > 0 && !querySnapshot.metadata.hasPendingWrites) {
         // Only log if closers have been loaded and there are none, and there are leads waiting.
         console.log("[LeadQueue - WaitingList] No on-duty closers available to assign waiting leads.");
      }

    }, (error) => {
      console.error("[LeadQueue - WaitingList] Error fetching waiting assignment leads:", error);
      setLoadingWaiting(false);
    });

    return () => unsubscribeWaiting();
  }, [user, onDutyClosers, attemptAutoAssignLead, assignedLeadIds, loadingClosers]);


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
      setScheduledLeads(leadsData); // Update the displayed list of scheduled leads
      setLoadingScheduled(false);

      const now = new Date();
      const leadsToMoveBatch = writeBatch(db);
      const leadsReadyForAssignment: Lead[] = [];

      querySnapshot.docs.forEach(docSnapshot => {
        const lead = { id: docSnapshot.id, ...docSnapshot.data() } as Lead;
        if (lead.scheduledAppointmentTime && (lead.status === "rescheduled" || lead.status === "scheduled") && !processedLeadIds.has(lead.id)) {
          const appointmentTime = lead.scheduledAppointmentTime.toDate();
          const timeUntilAppointment = appointmentTime.getTime() - now.getTime();
          
          if (timeUntilAppointment <= FORTY_FIVE_MINUTES_MS) {
            const leadRef = doc(db, "leads", lead.id);
            leadsToMoveBatch.update(leadRef, {
              status: "waiting_assignment", 
              updatedAt: serverTimestamp(),
            });
            // Prepare this lead for potential auto-assignment after status update
            leadsReadyForAssignment.push({...lead, status: "waiting_assignment"}); 
            setProcessedLeadIds(prev => new Set(prev).add(lead.id)); 
          }
        }
      });

      if (leadsReadyForAssignment.length > 0) {
        try {
          await leadsToMoveBatch.commit();
          toast({
            title: "Leads Updated",
            description: `${leadsReadyForAssignment.length} scheduled lead(s) moved to waiting list.`,
          });
          
          // Now attempt to assign these newly 'waiting_assignment' leads
          if (onDutyClosers.length > 0) {
            leadsReadyForAssignment.forEach(leadToAssign => {
               // Check assignedLeadIds again, as it might have been processed by the other effect if timing was very close
              if (!assignedLeadIds.has(leadToAssign.id)) {
                attemptAutoAssignLead(leadToAssign, onDutyClosers);
              }
            });
          } else if (!loadingClosers) {
            console.log("[LeadQueue - ScheduledList] No on-duty closers available for leads moved from scheduled.");
          }

        } catch (error) {
          console.error("[LeadQueue - ScheduledList] Error moving scheduled leads:", error);
          toast({
            title: "Update Failed",
            description: "Could not move scheduled leads automatically.",
            variant: "destructive",
          });
          const failedLeadIds = leadsReadyForAssignment.map(l => l.id);
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
    
    return () => unsubscribeScheduled();
  }, [user, toast, processedLeadIds, onDutyClosers, attemptAutoAssignLead, assignedLeadIds, loadingClosers]);


  return (
    <Card className="h-full flex flex-col shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-2xl font-bold font-headline flex items-center justify-center w-full">
          <ListChecks className="mr-2 h-7 w-7 text-primary" />
          Lead Queues
        </CardTitle>
        {(loadingWaiting || loadingScheduled || loadingClosers) && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
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
            ) : waitingLeads.filter(lead => lead.status === "waiting_assignment" && !assignedLeadIds.has(lead.id)).length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-muted-foreground">No leads currently waiting for assignment.</p>
              </div>
            ) : (
              <ScrollArea className="h-[280px] md:h-[380px] pr-4">
                <div className="space-y-4">
                  {waitingLeads
                    .filter(lead => lead.status === "waiting_assignment" && !assignedLeadIds.has(lead.id))
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

