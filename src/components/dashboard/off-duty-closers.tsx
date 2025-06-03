
"use client";

import { useState, useEffect } from "react";
import type { AppUser, Closer } from "@/types";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import CloserCard from "./closer-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { UserX, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function OffDutyClosers() {
  const { user } = useAuth();
  const [closers, setClosers] = useState<Closer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !user.teamId || user.role !== 'manager') {
      setLoading(false);
      setClosers([]);
      return;
    }
    setLoading(true);
    
    const q = query(
      collection(db, "users"),
      where("teamId", "==", user.teamId),
      where("role", "==", "closer"),
      where("status", "==", "Off Duty"), // Query for status "Off Duty"
      orderBy("displayName", "asc")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const closersData = querySnapshot.docs.map(doc => {
        const data = doc.data() as AppUser;
        return {
          uid: doc.id,
          name: data.displayName || data.email || "Unnamed Closer",
          // If queried for "Off Duty", their display status is "Off Duty"
          status: "Off Duty", 
          teamId: data.teamId,
        } as Closer;
      });
      setClosers(closersData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching off-duty closers:", error);
      // This specific error might be due to a missing index for the new query.
      // Firestore will provide a link in the console to create it.
      // Example error message: "The query requires an index. You can create it here: <link>"
      // Index needed: users collection, teamId (ASC), role (ASC), status (ASC), displayName (ASC)
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  if (user?.role !== 'manager') {
    return null;
  }

  return (
    <Card className="h-full flex flex-col shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-medium font-headline flex items-center">
          <UserX className="mr-2 h-5 w-5 text-muted-foreground" />
          Off Duty Closers
        </CardTitle>
         {loading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden">
        {closers.length === 0 && !loading ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-muted-foreground">No closers are currently off duty.</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px] md:h-[400px] pr-4">
            <div className="space-y-3">
              {closers.map(closer => (
                <CloserCard key={closer.uid} closer={closer} />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
