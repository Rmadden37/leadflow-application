
"use client";

import InProcessLeads from "@/components/dashboard/in-process-leads";
import CloserLineup from "@/components/dashboard/closer-lineup";
import LeadQueue from "@/components/dashboard/lead-queue";
import ManageClosersButton from "@/components/dashboard/off-duty-closers";
import { useAuth } from "@/hooks/use-auth";
import { Handshake } from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();

  if (!user) return null; // Layout handles redirect

  const welcomeMessage = user.displayName 
    ? `Welcome back, ${user.displayName}!`
    : user.email 
    ? `Welcome back, ${user.email}!`
    : "Welcome to LeadFlow!";

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Handshake className="h-8 w-8 text-primary hidden sm:block" />
        <h2 className="text-2xl sm:text-3xl font-bold font-headline text-foreground">
          {welcomeMessage}
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <InProcessLeads />
        </div>
        <div>
          <LeadQueue />
        </div>
        <div>
          <CloserLineup />
        </div>
        {user.role === 'manager' && ( 
          <div className="lg:col-span-1"> 
           <ManageClosersButton />
          </div>
        )}
         {(user.role === 'setter' || user.role === 'closer') && (
          <div className="hidden lg:block lg:col-span-1"> 
            {/* This div can be used for a placeholder or other content if needed for these roles */}
          </div>
        )}
      </div>
    </div>
  );
}
