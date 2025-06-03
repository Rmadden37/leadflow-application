
"use client";

import { useState, useEffect } from "react";
import type { Lead } from "@/types";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, orderBy, limit } from "firebase/firestore";
import LeadCard from "./lead-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ListChecks, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function LeadQueue() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !user.teamId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    
    // Managers, Setters, and Closers can all see the lead queue for their team.
    const q = query(
      collection(db, "leads"),
      where("teamId", "==", user.teamId),
      where("status", "==", "waiting_assignment"),
      orderBy("createdAt", "asc"), // Oldest leads first
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const leadsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead));
      setLeads(leadsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching lead queue:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  return (
    <Card className="h-full flex flex-col shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-medium font-headline flex items-center">
          <ListChecks className="mr-2 h-6 w-6 text-primary border border-border rounded-sm p-0.5" />
          Lead Queue
        </CardTitle>
        {loading && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden">
        {leads.length === 0 && !loading ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-muted-foreground">Lead queue is empty.</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px] md:h-[400px] pr-4">
            <div className="space-y-4">
              {leads.map(lead => (
                // LeadCard in queue might have different actions or less info
                <LeadCard key={lead.id} lead={lead} context="queue" />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
