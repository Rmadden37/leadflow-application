
"use client";

import { useState, useEffect } from "react";
import type { Lead, Closer, UserRole } from "@/types";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, orderBy, limit, Timestamp } from "firebase/firestore";
import LeadCard from "./lead-card";
import CloserCard from "./closer-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Activity, Loader2, Ghost } from "lucide-react"; // Removed UserCircle as sample is removed
import { ScrollArea } from "@/components/ui/scroll-area";

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

  // Sample data removed

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
        {displayItems.length === 0 && !isLoading ? (
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
              {displayItems.map(({ lead, closer }) => (
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
              {/* Sample data display logic removed */}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
