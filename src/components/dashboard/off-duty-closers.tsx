
"use client";

import { useState, useEffect } from "react";
import type { Closer } from "@/types"; // Using the updated Closer type
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import CloserCard from "./closer-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { UserX, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function OffDutyClosers() {
  const { user } = useAuth(); // user.teamId is from the logged-in user (AppUser)
  const [closers, setClosers] = useState<Closer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !user.teamId || user.role !== 'manager') {
      setLoading(false);
      setClosers([]);
      return;
    }
    setLoading(true);
    
    // Query the 'closers' collection directly
    const q = query(
      collection(db, "closers"), // Changed from "users" to "closers"
      where("teamId", "==", user.teamId),
      where("status", "==", "Off Duty"), 
      orderBy("name", "asc") // Assuming 'name' is the field for display name
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const closersData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          uid: doc.id, // The document ID from 'closers' collection
          name: data.name,
          status: data.status as "On Duty" | "Off Duty",
          teamId: data.teamId,
          role: data.role,
          avatarUrl: data.avatarUrl,
          phone: data.phone,
        } as Closer;
      });
      setClosers(closersData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching off-duty closers:", error);
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

