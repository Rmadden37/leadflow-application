
"use client";

import { useState, useEffect } from "react";
import type { Lead } from "@/types";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, orderBy, limit } from "firebase/firestore";
import LeadCard from "@/components/dashboard/lead-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
// import { Button } from "@/components/ui/button"; // This was commented out after a previous change
import { History, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRouter } from "next/navigation";

const LEADS_PER_PAGE = 20; // Number of leads to fetch per page/batch

export default function AllLeadsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "manager")) {
      router.replace(user ? "/dashboard" : "/login");
      return;
    }

    if (user && user.teamId && user.role === "manager") {
      setLeadsLoading(true);
      const q = query(
        collection(db, "leads"),
        where("teamId", "==", user.teamId),
        orderBy("createdAt", "desc"),
        limit(LEADS_PER_PAGE * 2) // Fetching a bit more initially, pagination not fully implemented
      );

      const unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
          const leadsData = querySnapshot.docs.map(
            (doc) => ({ id: doc.id, ...doc.data() } as Lead)
          );
          setLeads(leadsData);
          setLeadsLoading(false);
        },
        (error) => {
          console.error("Error fetching leads:", error);
          setLeadsLoading(false);
        }
      );

      return () => unsubscribe();
    }
  }, [user, authLoading, router]);


  if (authLoading || leadsLoading) {
    return (
      <div className="flex min-h-[calc(100vh-var(--header-height,4rem))] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (user?.role !== 'manager') {
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
          <CardTitle className="text-3xl font-bold font-headline flex items-center justify-center">
            <History className="mr-3 h-8 w-8 text-primary" />
            All Submitted Leads
          </CardTitle>
        </CardHeader>
        <CardContent>
          {leads.length === 0 && !leadsLoading ? (
            <div className="flex h-64 items-center justify-center">
              <p className="text-muted-foreground">No leads found for your team.</p>
            </div>
          ) : (
            <>
              <ScrollArea className="h-[calc(100vh-20rem)] pr-4"> {/* Adjust height as needed */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {leads.map((lead) => (
                    <LeadCard key={lead.id} lead={lead} context="all-leads"/>
                  ))}
                </div>
              </ScrollArea>
              {/* Placeholder for future pagination or load more */}
              {leads.length >= LEADS_PER_PAGE * 2 && (
                 <p className="mt-6 text-center text-sm text-muted-foreground">
                    Consider implementing pagination or a "load more" feature for older leads.
                  </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
