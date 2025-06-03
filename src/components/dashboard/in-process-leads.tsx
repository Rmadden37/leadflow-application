
"use client";

import { useState, useEffect } from "react";
import type { Lead } from "@/types";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, orderBy, limit, Timestamp } from "firebase/firestore";
import LeadCard from "./lead-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Activity, Loader2, Ghost, UserCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function InProcessLeads() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  // Sample lead for demonstration when the actual list is empty
  const sampleLeadAssignedToAndrea: Lead = {
    id: "sample-lead-andrea-01",
    customerName: "Valued Customer Inc.",
    customerPhone: "(555) 123-DEMO",
    address: "789 Demo Drive, Sampletown",
    status: "in_process",
    teamId: user?.teamId || "demo-team",
    dispatchType: "immediate",
    assignedCloserId: "andrea-rovayo-uid", // Placeholder UID
    assignedCloserName: "Andrea Rovayo",
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    setterName: "Demo Setter",
  };


  useEffect(() => {
    console.log("[InProcessLeads] Hook triggered. User from useAuth:", user);
    if (!user || !user.teamId) {
      console.log("[InProcessLeads] No user or no user.teamId. Skipping query. User:", user);
      setLoading(false);
      setLeads([]);
      return;
    }
    setLoading(true);

    let q;
    console.log(`[InProcessLeads] User role: ${user.role}, teamId: ${user.teamId}, uid: ${user.uid}`);

    if (user.role === "closer") {
      console.log("[InProcessLeads] Querying for closer's in-process leads.");
      q = query(
        collection(db, "leads"),
        where("teamId", "==", user.teamId),
        where("assignedCloserId", "==", user.uid),
        where("status", "==", "in_process"),
        orderBy("updatedAt", "desc"),
        limit(10)
      );
    } else if (user.role === "manager") {
      console.log("[InProcessLeads] Querying for manager's view of in-process leads.");
      q = query(
        collection(db, "leads"),
        where("teamId", "==", user.teamId),
        where("status", "==", "in_process"),
        orderBy("updatedAt", "desc"),
        limit(20)
      );
    } else {
      console.log("[InProcessLeads] User is a setter or unknown role. No in-process leads will be shown for this role.");
      setLeads([]);
      setLoading(false);
      return;
    }

    console.log("[InProcessLeads] Setting up snapshot listener for query:", q);
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      console.log(`[InProcessLeads] Snapshot received. Number of documents: ${querySnapshot.docs.length}`);
      const leadsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead));
      console.log("[InProcessLeads] Mapped leadsData:", leadsData);
      setLeads(leadsData);
      setLoading(false);
    }, (error) => {
      console.error("[InProcessLeads] Error fetching in-process leads:", error);
      setLoading(false);
    });

    return () => {
      console.log("[InProcessLeads] Cleaning up snapshot listener.");
      unsubscribe();
    }
  }, [user]);

  if (user?.role === 'setter') {
    return null; // Setters don't typically see in-process leads list.
  }

  const shouldShowSampleLead = leads.length === 0 && !loading && (user?.role === "closer" || user?.role === "manager");

  return (
    <Card className="h-full flex flex-col shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-2xl font-bold font-headline flex items-center justify-center w-full">
          <Activity className="mr-2 h-7 w-7 text-primary" />
          In Process Leads
        </CardTitle>
        {loading && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden">
        {leads.length === 0 && !loading && !shouldShowSampleLead ? (
          <div className="flex h-full flex-col items-center justify-center text-center p-6">
            <Ghost
              className="h-32 w-32 text-muted-foreground opacity-10 mb-4"
              data-ai-hint="ghost town"
            />
            <p className="text-muted-foreground text-lg">It's quiet... too quiet...</p>
            <p className="text-xs text-muted-foreground mt-1">No leads are currently in process.</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px] md:h-[400px] pr-4">
            <div className="space-y-4">
              {leads.map(lead => (
                <LeadCard key={lead.id} lead={lead} context="in-process" />
              ))}
              {shouldShowSampleLead && (
                <div className="mt-4 p-4 border border-dashed border-primary/50 rounded-lg bg-primary/5">
                  <div className="flex items-center text-sm text-primary mb-3">
                    <UserCircle className="mr-2 h-5 w-5" />
                    <p className="font-medium">Example View: Lead Assigned to Andrea Rovayo</p>
                  </div>
                  <LeadCard lead={sampleLeadAssignedToAndrea} context="in-process" />
                   <p className="text-xs text-muted-foreground mt-3 text-center">
                    This is a sample card showing how a lead assigned to "Andrea Rovayo" would appear.
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
