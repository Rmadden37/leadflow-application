
"use client";

import InProcessLeads from "@/components/dashboard/in-process-leads";
import CloserLineup from "@/components/dashboard/closer-lineup";
import LeadQueue from "@/components/dashboard/lead-queue";
import OffDutyClosers from "@/components/dashboard/off-duty-closers"; // This is now the button component
import { useAuth } from "@/hooks/use-auth";

export default function DashboardPage() {
  const { user } = useAuth();

  if (!user) return null; // Layout handles redirect

  return (
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
      {/* OffDutyClosers is now a button that opens a modal, still only for managers */}
      {user.role === 'manager' && ( 
        <div className="lg:col-span-1"> 
         <OffDutyClosers />
        </div>
      )}
       {(user.role === 'setter' || user.role === 'closer') && ( // If not manager, this column might be empty or used for something else
        <div className="hidden lg:block lg:col-span-1"> 
         {/* This column can be used for other content for setters/closers if needed */}
        </div>
      )}
    </div>
  );
}
