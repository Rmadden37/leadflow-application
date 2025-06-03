
"use client";

import { useState, useEffect } from "react";
import type { Lead, Closer, UserRole } from "@/types";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, orderBy, limit, Timestamp } from "firebase/firestore";
import LeadCard from "./lead-card";
import CloserCard from "./closer-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Activity, Loader2, Ghost } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface InProcessDisplayItem {
  lead: Lead;
  closer?: Closer; // Closer assigned to this lead
}

// --- Sample Data for Demonstration ---
const sampleCloserAndrea: Closer = {
  uid: "sample-andrea-rovayo-uid", // Unique sample UID
  name: "Andrea Rovayo",
  status: "On Duty", // She's working, so effectively 'On Duty'
  teamId: "sample-team-id",
  role: "closer",
  avatarUrl: `https://placehold.co/100x100.png`, // Generic placeholder, matching image style
  lineupOrder: 1,
};

const sampleLeadAssignedToAndrea: Lead = {
  id: "sample-tony-the-tiger-lead-id", // Unique sample ID
  customerName: "Tony the Tiger",
  customerPhone: "(555) GRR-REAT",
  address: "Kellogg's HQ, Battle Creek, MI",
  status: "in_process",
  teamId: "sample-team-id",
  dispatchType: "immediate",
  assignedCloserId: sampleCloserAndrea.uid,
  assignedCloserName: sampleCloserAndrea.name,
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
  setterName: "Demo Setter",
};
// --- End Sample Data ---

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
          // Display sample data if no real in-process leads
          <ScrollArea className="h-[300px] md:h-[400px] pr-4">
            <div className="space-y-4 p-4 border border-dashed border-muted-foreground rounded-md">
              <p className="text-sm text-muted-foreground text-center mb-3">
                <strong>Example:</strong> Andrea Rovayo assigned to "Tony the Tiger".
              </p>
              <div className="space-y-2">
                <CloserCard
                  closer={{...sampleCloserAndrea, avatarUrl: `https://placehold.co/100x100.png`}}
                  assignedLeadName={sampleLeadAssignedToAndrea.customerName}
                  allowInteractiveToggle={false}
                />
                <LeadCard lead={sampleLeadAssignedToAndrea} context="in-process" />
              </div>
              <p className="text-xs text-muted-foreground text-center mt-4">
                <strong>In a real scenario:</strong>
                <br />
                - "Tony the Tiger" would disappear from the Lead Queue's "Waiting List".
                <br />
                - "Andrea Rovayo" would disappear from the "Closer Lineup".
              </p>
            </div>
          </ScrollArea>
        ) : displayItems.length > 0 ? (
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
            </div>
          </ScrollArea>
        ) : (
           <div className="flex flex-col h-full items-center justify-center text-center">
            <Ghost className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-lg font-medium text-muted-foreground">It's quiet... too quiet.</p>
            <p className="text-sm text-muted-foreground">No leads are currently in process.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
