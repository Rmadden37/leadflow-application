
"use client";

import { useState, useEffect } from "react";
import type { Lead } from "@/types";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, orderBy, limit } from "firebase/firestore";
import LeadCard from "@/components/dashboard/lead-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { History, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRouter } from "next/navigation";

const LEADS_LIMIT = 50; // Initial limit for fetching leads

export default function AllLeadsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [fetchingLeads, setFetchingLeads] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "manager")) {
      // If not a manager, or no user, redirect to dashboard or login
      router.replace(user ? "/dashboard" : "/login");
      return;
    }

    if (user && user.teamId && user.role === "manager") {
      setFetchingLeads(true);
      const q = query(
        collection(db, "leads"),
        where("teamId", "==", user.teamId),
        orderBy("createdAt", "desc"),
        limit(LEADS_LIMIT)
      );

      const unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
          const leadsData = querySnapshot.docs.map(
            (doc) => ({ id: doc.id, ...doc.data() } as Lead)
          );
          setLeads(leadsData);
          setFetchingLeads(false);
        },
        (error) => {
          console.error("Error fetching all leads:", error);
          setFetchingLeads(false);
        }
      );

      return () => unsubscribe();
    }
  }, [user, authLoading, router]);

  if (authLoading || fetchingLeads) {
    return (
      <div className="flex min-h-[calc(100vh-var(--header-height,4rem))] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (user?.role !== 'manager') {
    // This case should ideally be handled by the redirect, but as a fallback:
    return (
        <div className="flex min-h-[calc(100vh-var(--header-height,4rem))] items-center justify-center">
            <p className="text-destructive">Access Denied. You must be a manager to view this page.</p>
        </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center justify-center">
            <History className="mr-3 h-7 w-7 text-primary" />
            All Submitted Leads
          </CardTitle>
        </CardHeader>
        <CardContent>
          {leads.length === 0 && !fetchingLeads ? (
            <div className="flex h-64 items-center justify-center">
              <p className="text-muted-foreground">No leads found for your team.</p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-18rem)] pr-4"> {/* Adjust height as needed */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {leads.map((lead) => (
                  <LeadCard key={lead.id} lead={lead} />
                ))}
              </div>
            </ScrollArea>
          )}
           {leads.length === LEADS_LIMIT && (
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Displaying the {LEADS_LIMIT} most recent leads. Implement pagination for more.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
