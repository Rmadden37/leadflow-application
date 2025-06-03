
"use client";

import { useState, useEffect } from "react";
import type { Closer, UserRole, Lead } from "@/types";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import CloserCard from "./closer-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Users, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function CloserLineup() {
  const { user } = useAuth();
  const [closers, setClosers] = useState<Closer[]>([]);
  const [loadingClosers, setLoadingClosers] = useState(true);
  const [inProcessLeadAssignedCloserIds, setInProcessLeadAssignedCloserIds] = useState<Set<string>>(new Set());
  const [loadingLeads, setLoadingLeads] = useState(true);

  // Effect to fetch IDs of closers assigned to in-process leads
  useEffect(() => {
    if (!user || !user.teamId) {
      setLoadingLeads(false);
      setInProcessLeadAssignedCloserIds(new Set());
      return;
    }
    setLoadingLeads(true);
    const leadsQuery = query(
      collection(db, "leads"),
      where("teamId", "==", user.teamId),
      where("status", "==", "in_process")
    );
    const unsubscribeLeads = onSnapshot(leadsQuery, (querySnapshot) => {
      const assignedCloserIds = new Set<string>();
      querySnapshot.forEach(doc => {
        const lead = doc.data() as Lead;
        if (lead.assignedCloserId) {
          assignedCloserIds.add(lead.assignedCloserId);
        }
      });
      setInProcessLeadAssignedCloserIds(assignedCloserIds);
      setLoadingLeads(false);
    }, (error) => {
      console.error("[CloserLineup] Error fetching in-process leads' assigned closers:", error);
      setLoadingLeads(false);
    });
    return () => unsubscribeLeads();
  }, [user]);


  // Effect to fetch and display "On Duty" closers, filtered by those not in inProcessLeadAssignedCloserIds
  useEffect(() => {
    if (!user || !user.teamId) {
      setLoadingClosers(false);
      setClosers([]);
      return;
    }

    // Wait until the assigned closer IDs are loaded before fetching/filtering closers
    if (loadingLeads) {
        // setLoadingClosers(true); // Keep loading true if leads are still loading
        return;
    }

    setLoadingClosers(true);

    const q = query(
      collection(db, "closers"),
      where("teamId", "==", user.teamId),
      where("status", "==", "On Duty"), // Only "On Duty" closers
      orderBy("name", "asc") // Initial sort by name
    );

    const unsubscribeClosers = onSnapshot(q, (querySnapshot) => {
      let closersData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          uid: doc.id,
          name: data.name,
          status: data.status as "On Duty" | "Off Duty",
          teamId: data.teamId,
          role: data.role as UserRole,
          avatarUrl: data.avatarUrl,
          phone: data.phone,
          lineupOrder: data.lineupOrder,
        } as Closer;
      });

      // Filter out closers who are currently assigned to an in-process lead
      const availableClosers = closersData.filter(closer => !inProcessLeadAssignedCloserIds.has(closer.uid));
      
      // Default and sort by lineupOrder client-side for the remaining closers
      const sortedAvailableClosers = availableClosers.map((closer, index) => ({
        ...closer,
        lineupOrder: typeof closer.lineupOrder === 'number' ? closer.lineupOrder : (index + 1) * 100000, // Default if missing
      })).sort((a, b) => {
        const orderA = a.lineupOrder!; 
        const orderB = b.lineupOrder!;
        if (orderA !== orderB) {
          return orderA - orderB;
        }
        return a.name.localeCompare(b.name); // Fallback sort
      });
      
      setClosers(sortedAvailableClosers);
      setLoadingClosers(false);
    }, (error) => {
      console.error("[CloserLineup] Error fetching closer lineup:", error);
      setLoadingClosers(false);
    });

    return () => unsubscribeClosers();
  }, [user, inProcessLeadAssignedCloserIds, loadingLeads]); // Re-run if user, assigned closer IDs, or lead loading state changes

  const isLoading = loadingClosers || loadingLeads;

  return (
    <Card className="h-full flex flex-col shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-2xl font-bold font-headline flex items-center justify-center w-full">
          <Users className="mr-2 h-6 w-6 text-primary" />
          Closer Lineup
        </CardTitle>
        {isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden">
        {closers.length === 0 && !isLoading ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-muted-foreground">No available closers on duty.</p>
            {user && !user.teamId && <p className="text-xs text-destructive-foreground">Logged-in user is missing a teamId.</p>}
          </div>
        ) : (
           <ScrollArea className="h-[300px] md:h-[400px] pr-4">
            <div className="space-y-3">
              {closers.map(closer => (
                <CloserCard 
                  key={closer.uid} 
                  closer={closer} 
                  allowInteractiveToggle={false} // Lineup card is display-only for status
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
