
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
  const [closersInLineup, setClosersInLineup] = useState<Closer[]>([]);
  const [isLoadingClosersForLineup, setIsLoadingClosersForLineup] = useState(true);
  const [inProcessLeadAssignedCloserIds, setInProcessLeadAssignedCloserIds] = useState<Set<string>>(new Set());
  const [isLoadingAssignedCloserIds, setIsLoadingAssignedCloserIds] = useState(true);

  // Effect 1: Fetch UIDs of closers assigned to "in_process" leads for the current team.
  useEffect(() => {
    if (!user?.teamId) {
      setInProcessLeadAssignedCloserIds(new Set());
      setIsLoadingAssignedCloserIds(false);
      return;
    }

    setIsLoadingAssignedCloserIds(true);
    const leadsQuery = query(
      collection(db, "leads"),
      where("teamId", "==", user.teamId),
      where("status", "==", "in_process")
    );

    const unsubscribeLeads = onSnapshot(
      leadsQuery,
      (querySnapshot) => {
        const assignedCloserIds = new Set<string>();
        querySnapshot.forEach((doc) => {
          const lead = doc.data() as Lead;
          if (lead.assignedCloserId) {
            assignedCloserIds.add(lead.assignedCloserId);
          }
        });
        setInProcessLeadAssignedCloserIds(assignedCloserIds);
        setIsLoadingAssignedCloserIds(false);
      },
      (error) => {
        console.error(
          "[CloserLineup] Error fetching in-process leads' assigned closers:",
          error
        );
        setInProcessLeadAssignedCloserIds(new Set());
        setIsLoadingAssignedCloserIds(false);
      }
    );
    return () => unsubscribeLeads();
  }, [user?.teamId]);

  // Effect 2: Fetch "On Duty" closers, then filter out those assigned to an "in_process" lead.
  useEffect(() => {
    if (!user?.teamId) {
      setClosersInLineup([]);
      setIsLoadingClosersForLineup(false);
      return;
    }

    // IMPORTANT: Only proceed if the list of assigned closer UIDs is ready.
    // If still loading assigned IDs, clear the lineup to prevent showing stale data.
    if (isLoadingAssignedCloserIds) {
      setClosersInLineup([]); 
      setIsLoadingClosersForLineup(true); // The lineup itself is still considered loading
      return;
    }

    setIsLoadingClosersForLineup(true);
    const closersCollectionQuery = query(
      collection(db, "closers"),
      where("teamId", "==", user.teamId),
      where("status", "==", "On Duty"),
      orderBy("name", "asc") 
    );

    const unsubscribeClosers = onSnapshot(
      closersCollectionQuery,
      (querySnapshot) => {
        let allOnDutyClosers = querySnapshot.docs.map((doc) => {
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

        // Filter out closers who are currently assigned to an "in_process" lead.
        const availableClosers = allOnDutyClosers.filter(
          (closer) => !inProcessLeadAssignedCloserIds.has(closer.uid)
        );
        
        // Sort the remaining available closers by lineupOrder, then by name as a fallback.
        const sortedAvailableClosers = availableClosers
          .map((closer, index) => ({
            ...closer,
            // Ensure lineupOrder is a number for sorting, defaulting if necessary.
            lineupOrder:
              typeof closer.lineupOrder === "number"
                ? closer.lineupOrder
                : (index + 1) * 100000, // Default based on current index if not set
          }))
          .sort((a, b) => {
            const orderA = a.lineupOrder!; // Non-null assertion due to defaulting
            const orderB = b.lineupOrder!;
            if (orderA !== orderB) {
              return orderA - orderB;
            }
            return a.name.localeCompare(b.name); // Fallback sort by name
          });

        setClosersInLineup(sortedAvailableClosers);
        setIsLoadingClosersForLineup(false);
      },
      (error) => {
        console.error("[CloserLineup] Error fetching/filtering closer lineup:", error);
        setClosersInLineup([]);
        setIsLoadingClosersForLineup(false);
      }
    );

    return () => unsubscribeClosers();
  }, [user?.teamId, inProcessLeadAssignedCloserIds, isLoadingAssignedCloserIds]); // Key dependencies

  const isOverallLoading = isLoadingAssignedCloserIds || isLoadingClosersForLineup;

  return (
    <Card className="h-full flex flex-col shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-2xl font-bold font-headline flex items-center justify-center w-full">
          <Users className="mr-2 h-6 w-6 text-primary" />
          Closer Lineup
        </CardTitle>
        {isOverallLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden">
        {closersInLineup.length === 0 && !isOverallLoading ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-muted-foreground">No available closers on duty.</p>
            {user && !user.teamId && <p className="text-xs text-destructive-foreground">Logged-in user is missing a teamId.</p>}
          </div>
        ) : (
           <ScrollArea className="h-[300px] md:h-[400px] pr-4">
            <div className="space-y-3">
              {closersInLineup.map(closer => (
                <CloserCard 
                  key={closer.uid} 
                  closer={closer} 
                  allowInteractiveToggle={false} // In lineup, toggle is not interactive here, managed by status
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
