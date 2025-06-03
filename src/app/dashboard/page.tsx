
"use client";

import InProcessLeads from "@/components/dashboard/in-process-leads";
import CloserLineup from "@/components/dashboard/closer-lineup";
import LeadQueue from "@/components/dashboard/lead-queue";
import ManageClosersButton from "@/components/dashboard/off-duty-closers"; // Updated import name for clarity
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
      {user.role === 'manager' && ( 
        <div className="lg:col-span-1"> 
         <ManageClosersButton /> {/* Updated component name */}
        </div>
      )}
       {(user.role === 'setter' || user.role === 'closer') && (
        <div className="hidden lg:block lg:col-span-1"> 
        </div>
      )}
    </div>
  );
}
