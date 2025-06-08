
"use client";

import {useState, useEffect} from "react";
import type {Closer, UserRole, Lead} from "@/types";
import {useAuth} from "@/hooks/use-auth";
import {useToast} from "@/hooks/use-toast";
import {db} from "@/lib/firebase";
import {collection, query, where, onSnapshot, orderBy} from "firebase/firestore";
import CloserCard from "./closer-card";
import {Card, CardHeader, CardTitle, CardContent} from "@/components/ui/card";
import {Users, Loader2} from "lucide-react";
import {ScrollArea} from "@/components/ui/scroll-area";
import ManageClosersModal from "./off-duty-closers-modal";

export default function CloserLineup() {
  const {user} = useAuth();
  const {toast} = useToast();
  const [closersInLineup, setClosersInLineup] = useState<Closer[]>([]);
  const [isLoadingClosersForLineup, setIsLoadingClosersForLineup] = useState(true);
  const [assignedLeadCloserIds, setAssignedLeadCloserIds] = useState<Set<string>>(new Set());
  const [isLoadingAssignedCloserIds, setIsLoadingAssignedCloserIds] = useState(true);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);

  // Check if user can manage closers (managers and admins)
  const canManageClosers = user?.role === "manager" || user?.role === "admin";

  // Effect 1: Fetch UIDs of closers assigned to ANY lead (waiting_assignment, scheduled, accepted, in_process).
  useEffect(() => {
    if (!user?.teamId) {
      setAssignedLeadCloserIds(new Set());
      setIsLoadingAssignedCloserIds(false);
      return;
    }

    setIsLoadingAssignedCloserIds(true);
    const leadsQuery = query(
      collection(db, "leads"),
      where("teamId", "==", user.teamId),
      where("status", "in", ["waiting_assignment", "scheduled", "accepted", "in_process"])
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
        setAssignedLeadCloserIds(assignedCloserIds);
        setIsLoadingAssignedCloserIds(false);
      },
      (error) => {
        toast({
          title: "Error",
          description: "Failed to load assigned closers. Please refresh the page.",
          variant: "destructive",
        });
        setAssignedLeadCloserIds(new Set());
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

    if (isLoadingAssignedCloserIds) {
      setClosersInLineup([]);
      setIsLoadingClosersForLineup(true);
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
        const allOnDutyClosers = querySnapshot.docs.map((doc) => {
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

        // Log to debug why Ryan Madden might be appearing in lineup
        if (allOnDutyClosers.some(closer => closer.name === "Ryan Madden")) {
          const ryanMadden = allOnDutyClosers.find(closer => closer.name === "Ryan Madden");
          console.log("Ryan Madden status:", { 
            isOnDuty: ryanMadden?.status === "On Duty",
            uid: ryanMadden?.uid,
            hasAssignedLead: assignedLeadCloserIds.has(ryanMadden?.uid || ""),
            assignedCloserIds: Array.from(assignedLeadCloserIds)
          });
        }
        
        const availableClosers = allOnDutyClosers.filter(
          (closer) => !assignedLeadCloserIds.has(closer.uid)
        );

        const sortedAvailableClosers = availableClosers
          .map((closer, index) => ({
            ...closer,
            lineupOrder:
              typeof closer.lineupOrder === "number" ?
                closer.lineupOrder :
                (index + 1) * 100000,
          }))
          .sort((a, b) => {
            const orderA = a.lineupOrder!;
            const orderB = b.lineupOrder!;
            if (orderA !== orderB) {
              return orderA - orderB;
            }
            return a.name.localeCompare(b.name);
          });

        setClosersInLineup(sortedAvailableClosers);
        setIsLoadingClosersForLineup(false);
      },
      (error) => {
        toast({
          title: "Error",
          description: "Failed to load closer lineup. Please refresh the page.",
          variant: "destructive",
        });
        setClosersInLineup([]);
        setIsLoadingClosersForLineup(false);
      }
    );

    return () => unsubscribeClosers();
  }, [user?.teamId, assignedLeadCloserIds, isLoadingAssignedCloserIds]);

  const isOverallLoading = isLoadingAssignedCloserIds || isLoadingClosersForLineup;

  const handleCardClick = () => {
    if (canManageClosers) {
      setIsManageModalOpen(true);
    }
  };

  return (
    <>
      <Card 
        className="h-full flex flex-col bg-white dark:bg-slate-900 shadow-lg hover:shadow-xl transition-all duration-200 border-0 ring-1 ring-slate-200 dark:ring-slate-800"
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 px-6 pt-6">
          <CardTitle className="text-xl sm:text-2xl font-bold font-headline flex items-center text-foreground">
            <div 
              className={`p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg mr-3 ${
                canManageClosers ? 'cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-800/50 transition-colors' : ''
              }`}
              onClick={canManageClosers ? handleCardClick : undefined}
            >
              <Users className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex flex-col">
              <span>Closer Lineup</span>
              <span className="text-sm font-normal text-muted-foreground">
                {canManageClosers ? 'Click icon to manage • Available team members' : 'Available team members'}
              </span>
            </div>
          </CardTitle>
          <div className="flex items-center gap-2">
            {isOverallLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
          </div>
        </CardHeader>
      <CardContent className="flex-grow overflow-hidden px-6 pb-6">
        {closersInLineup.length === 0 && !isOverallLoading ? (
          <div className="flex h-full flex-col items-center justify-center text-center py-12">
            <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full mb-4">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No Available Closers</h3>
            <p className="text-muted-foreground text-sm max-w-xs">
              All closers are currently off duty or assigned to leads.
            </p>
            {user && !user.teamId && (
              <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 px-3 py-1 rounded-md mt-2">
                Error: User missing team assignment
              </p>
            )}
          </div>
        ) : (
          <ScrollArea className="h-[280px] sm:h-[320px] md:h-[380px] lg:h-[420px] xl:h-[480px]">
            <div className="space-y-4 pr-2">
              {closersInLineup.map((closer, index) => (
                <CloserCard
                  key={closer.uid}
                  closer={closer}
                  allowInteractiveToggle={false}
                  position={index + 1}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
    
    {/* Manage Closers Modal */}
    <ManageClosersModal
      isOpen={isManageModalOpen}
      onClose={() => setIsManageModalOpen(false)}
    />
    </>
  );
}
