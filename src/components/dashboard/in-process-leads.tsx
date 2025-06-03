
"use client";

import { useState, useEffect } from "react";
import type { Lead, Closer, UserRole } from "@/types";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, orderBy, limit, Timestamp } from "firebase/firestore";
import LeadCard from "./lead-card";
import CloserCard from "./closer-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Activity, Loader2, Ghost, Info } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface InProcessDisplayItem {
  lead: Lead;
  closer?: Closer; // Closer assigned to this lead
}

export default function InProcessLeads() {
  const { user } = useAuth();
  const [displayItems, setDisplayItems] = useState<InProcessDisplayItem[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [loadingClosers, setLoadingClosers] = useState(true);
  const [allTeamClosers, setAllTeamClosers] = useState<Closer[]>([]);

  // Fetch all closers for the team
  useEffect(() => {
    if (!user || !user.teamId) {
      setLoadingClosers(false);
      setAllTeamClosers([]);
      return;
    }
    setLoadingClosers(true);
    const closersQuery = query(
      collection(db, "closers"),
      where("teamId", "==", user.teamId)
    );
    const unsubscribeClosers = onSnapshot(closersQuery, (snapshot) => {
      const closersData = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as Closer));
      setAllTeamClosers(closersData);
      setLoadingClosers(false);
    }, (error) => {
      console.error("[InProcessLeads] Error fetching team closers:", error);
      setLoadingClosers(false);
    });
    return () => unsubscribeClosers();
  }, [user]);

  // Fetch in-process leads and combine with closer data
  useEffect(() => {
    if (!user || !user.teamId || loadingClosers) {
      if (!user || !user.teamId) setLoadingLeads(false);
      return;
    }
    setLoadingLeads(true);

    let q;
    if (user.role === "closer") {
      q = query(
        collection(db, "leads"),
        where("teamId", "==", user.teamId),
        where("assignedCloserId", "==", user.uid),
        where("status", "==", "in_process"),
        orderBy("updatedAt", "desc"),
        limit(10)
      );
    } else if (user.role === "manager") {
      q = query(
        collection(db, "leads"),
        where("teamId", "==", user.teamId),
        where("status", "==", "in_process"),
        orderBy("updatedAt", "desc"),
        limit(20)
      );
    } else {
      // Setters don't see this component
      setDisplayItems([]);
      setLoadingLeads(false);
      return;
    }

    const unsubscribeLeads = onSnapshot(q, (querySnapshot) => {
      const newDisplayItems = querySnapshot.docs.map(doc => {
        const lead = { id: doc.id, ...doc.data() } as Lead;
        const assignedCloser = allTeamClosers.find(c => c.uid === lead.assignedCloserId);
        return { lead, closer: assignedCloser };
      });
      setDisplayItems(newDisplayItems);
      setLoadingLeads(false);
    }, (error) => {
      console.error("[InProcessLeads] Error fetching in-process leads:", error);
      setLoadingLeads(false);
    });

    return () => unsubscribeLeads();
  }, [user, allTeamClosers, loadingClosers]);

  if (user?.role === 'setter') {
    return null;
  }

  const isLoading = loadingLeads || loadingClosers;

  // --- SIMULATION DATA ---
  const sampleFirstUpCloser: Closer = {
    uid: 'sample-first-up-closer-uid',
    name: 'First Up Closer (Demo)',
    status: 'On Duty',
    teamId: user?.teamId || 'Empire',
    role: 'closer',
    avatarUrl: 'https://placehold.co/100x100.png',
    lineupOrder: 1,
  };

  const sampleCaptainCrookLeadAssigned: Lead = {
    id: 'd9126755-72f4-4056-955e-8e3261af7c4e', // From screenshot
    customerName: 'Captain Crook',
    customerPhone: '(123) 456-7890', // From screenshot
    address: '123 Pirate Cove, Tortuga', // Added sample address
    status: 'in_process',
    teamId: user?.teamId || 'Empire', // From screenshot
    dispatchType: 'immediate', // From screenshot (type: "immediate")
    assignedCloserId: sampleFirstUpCloser.uid,
    assignedCloserName: sampleFirstUpCloser.name,
    createdAt: Timestamp.fromDate(new Date('May 24, 2025 21:13:49 UTC-4')), // Parsed from screenshot submissionTime
    updatedAt: Timestamp.now(),
    dispositionNotes: '',
    scheduledAppointmentTime: null,
    setterId: 'sample-setter-id', // Placeholder
    setterName: 'Sample Setter', // Placeholder
    photoUrls: [],
  };
  // --- END SIMULATION DATA ---

  const itemsToRender = displayItems.length > 0 ? displayItems : 
    (!isLoading ? [{ lead: sampleCaptainCrookLeadAssigned, closer: sampleFirstUpCloser }] : []);


  return (
    <Card className="h-full flex flex-col shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-2xl font-bold font-headline flex items-center justify-center w-full">
          <Activity className="mr-2 h-7 w-7 text-primary" />
          In Process Leads
        </CardTitle>
        {isLoading && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden">
        {itemsToRender.length > 0 ? (
          <>
            {displayItems.length === 0 && !isLoading && (
              <Alert variant="default" className="mb-4">
                <Info className="h-4 w-4" />
                <AlertTitle className="font-semibold">Visual Simulation</AlertTitle>
                <AlertDescription className="text-xs">
                  This shows "Captain Crook" assigned to "First Up Closer (Demo)". 
                  In a real scenario, "Captain Crook" would be removed from the "Lead Queue", 
                  and "First Up Closer" from the "Closer Lineup".
                </AlertDescription>
              </Alert>
            )}
            <ScrollArea className="h-[300px] md:h-[400px] pr-4">
              <div className="space-y-4">
                {itemsToRender.map(({ lead, closer }) => (
                  <div key={lead.id} className="space-y-2">
                    {closer && (
                      <CloserCard
                        closer={closer}
                        assignedLeadName={lead.customerName}
                        allowInteractiveToggle={false}
                      />
                    )}
                    <LeadCard lead={lead} context="in-process" />
                  </div>
                ))}
              </div>
            </ScrollArea>
          </>
        ) : !isLoading ? (
           <div className="flex flex-col h-full items-center justify-center text-center">
            <Ghost className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-lg font-medium text-muted-foreground">It's quiet... too quiet.</p>
            <p className="text-sm text-muted-foreground">No leads are currently in process.</p>
          </div>
        ) : (
          // Still loading, show a loader
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

    