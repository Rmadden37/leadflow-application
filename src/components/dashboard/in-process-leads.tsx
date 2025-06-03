
"use client";

import { useState, useEffect } from "react";
import type { Lead } from "@/types";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, orderBy, limit } from "firebase/firestore";
import LeadCard from "./lead-card";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Activity, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function InProcessLeads() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !user.teamId) {
      setLoading(false);
      return;
    }
    setLoading(true);

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
    } else { // Setter might not see this or see team's summary - for now, empty for setter
      setLeads([]);
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const leadsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead));
      setLeads(leadsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching in-process leads:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  if (user?.role === 'setter') {
    return null; // Setters don't typically see in-process leads list.
  }

  return (
    <Card className="h-full flex flex-col shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-medium font-headline flex items-center">
          <Activity className="mr-2 h-6 w-6 text-primary" />
          In Process Leads
        </CardTitle>
        {loading && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden">
        {leads.length === 0 && !loading ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-muted-foreground">No leads currently in process.</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px] md:h-[400px] pr-4">
            <div className="space-y-4">
              {leads.map(lead => (
                <LeadCard key={lead.id} lead={lead} />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
