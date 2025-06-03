"use client";

import InProcessLeads from "@/components/dashboard/in-process-leads";
import CloserLineup from "@/components/dashboard/closer-lineup";
import LeadQueue from "@/components/dashboard/lead-queue";
import OffDutyClosers from "@/components/dashboard/off-duty-closers";
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
        <CloserLineup />
      </div>
      <div>
        <LeadQueue />
      </div>
      {user.role === 'manager' && ( // Only managers might need to see this prominently.
        <div className="lg:col-span-1"> 
         <OffDutyClosers />
        </div>
      )}
       {(user.role === 'setter' || user.role === 'closer') && ( // OffDutyClosers may not be needed for setter/closer on main dash
        <div className="hidden lg:block lg:col-span-1"> 
         {/* Placeholder for other potential content or leave empty for now */}
        </div>
      )}
    </div>
  );
}
