
"use client";

import { useState, useEffect } from "react";
import type { Closer, UserRole } from "@/types";
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !user.teamId) {
      setLoading(false);
      setClosers([]);
      return;
    }

    setLoading(true);

    // Fetch on-duty closers ordered by name initially. lineupOrder will be handled client-side.
    const q = query(
      collection(db, "closers"),
      where("teamId", "==", user.teamId),
      where("status", "==", "On Duty"),
      orderBy("name", "asc") // Primary sort by name from DB
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
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
          lineupOrder: data.lineupOrder, // This might be undefined
        } as Closer;
      });

      // Client-side defaulting of lineupOrder and then sort
      closersData = closersData.map((closer, index) => ({
        ...closer,
        // Assign a default lineupOrder if it's not a number
        lineupOrder: typeof closer.lineupOrder === 'number' ? closer.lineupOrder : (index + 1) * 100000,
      }));

      closersData.sort((a, b) => {
        const orderA = a.lineupOrder!; // Should be a number after defaulting
        const orderB = b.lineupOrder!;
        if (orderA !== orderB) {
          return orderA - orderB;
        }
        return a.name.localeCompare(b.name); // Fallback to name if orders are identical
      });
      
      setClosers(closersData);
      setLoading(false);
    }, (error) => {
      console.error("[CloserLineup] Error fetching closer lineup:", error);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    }
  }, [user]);

  return (
    <Card className="h-full flex flex-col shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-medium font-headline flex items-center justify-center w-full">
          <Users className="mr-2 h-5 w-5 text-primary" />
          Closer Lineup
        </CardTitle>
        {loading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden">
        {closers.length === 0 && !loading ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-muted-foreground">No closers currently on duty.</p>
            {user && !user.teamId && <p className="text-xs text-destructive-foreground">Logged-in user is missing a teamId.</p>}
          </div>
        ) : (
           <ScrollArea className="h-[300px] md:h-[400px] pr-4">
            <div className="space-y-3">
              {closers.map(closer => (
                <CloserCard key={closer.uid} closer={closer} allowInteractiveToggle={false} />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
