
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
  closer?: Closer;
}

// --- DEMO DATA ---
const DEMO_ANDREA_ROVAYO: Closer = {
  uid: "tdItEd0KOLa4qWk4HV4AaCucZz82",
  name: "Andrea Rovayo",
  status: "On Duty", // Status for card display, actual status could be different in DB
  teamId: "Empire", // Assuming a common teamId for demo
  role: "closer",
  avatarUrl: "https://imgur.com/fzF41qW.jpeg",
  phone: "(786) 973-4134",
  lineupOrder: 1, // Not directly relevant for this display
};

const DEMO_TONY_THE_TIGER_LEAD: Lead = {
  id: "demo-lead-tony",
  customerName: "Tony the Tiger",
  customerPhone: "(555) GRR-EAT",
  address: "Kellogg's HQ, Battle Creek, MI",
  status: "in_process",
  teamId: "Empire", // Assuming a common teamId for demo
  dispatchType: "immediate",
  assignedCloserId: "tdItEd0KOLa4qWk4HV4AaCucZz82",
  assignedCloserName: "Andrea Rovayo",
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
  dispositionNotes: "He said they're GRRREAT!",
  photoUrls: [],
};
// --- END DEMO DATA ---

export default function InProcessLeads() {
  const { user } = useAuth();
  const [displayItems, setDisplayItems] = useState<InProcessDisplayItem[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [loadingClosers, setLoadingClosers] = useState(true);
  const [allTeamClosers, setAllTeamClosers] = useState<Closer[]>([]);

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

  useEffect(() => {
    if (!user || !user.teamId || loadingClosers) {
      if (!user || !user.teamId) setLoadingLeads(false);
      if (loadingClosers) setDisplayItems([]);
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
      setDisplayItems([]);
      setLoadingLeads(false);
    });

    return () => unsubscribeLeads();
  }, [user, allTeamClosers, loadingClosers]);

  if (user?.role === 'setter') {
    return null;
  }

  const isLoading = loadingLeads || loadingClosers;

  const renderDemoContent = () => (
    <div className="space-y-4">
      <Alert variant="default" className="mt-2">
        <Info className="h-4 w-4" />
        <AlertTitle className="font-semibold">Demonstration Mode</AlertTitle>
        <AlertDescription className="text-xs">
          This is a visual demonstration. Andrea Rovayo is shown working on "Tony the Tiger".
          In a real scenario, this would reflect actual data from Firestore, Andrea would be removed from the "Closer Lineup",
          and "Tony the Tiger" would be removed from the "Lead Queue".
        </AlertDescription>
      </Alert>
      <CloserCard
        closer={DEMO_ANDREA_ROVAYO}
        assignedLeadName={DEMO_TONY_THE_TIGER_LEAD.customerName}
        allowInteractiveToggle={false}
      />
      <LeadCard lead={DEMO_TONY_THE_TIGER_LEAD} context="in-process" />
    </div>
  );

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
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
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
          // Show demo content if no real "in_process" leads and not loading
          renderDemoContent()
        )}
      </CardContent>
    </Card>
  );
}
