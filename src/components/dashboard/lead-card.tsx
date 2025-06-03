
"use client";

import type { Lead, AppUser } from "@/types";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Activity,
  CheckCircle2,
  XCircle,
  Ban,
  CalendarClock,
  CreditCard, // Corrected from CreditCardOff
  User,
  Phone,
  MoreHorizontal,
  ClipboardList
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import LeadDispositionModal from "./lead-disposition-modal";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from 'date-fns';


interface LeadCardProps {
  lead: Lead;
  context?: "in-process" | "queue";
}

const getStatusIcon = (status: Lead["status"]) => {
  switch (status) {
    case "in_process":
      return <Activity className="h-5 w-5 text-blue-500" />;
    case "sold":
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    case "no_sale":
      return <XCircle className="h-5 w-5 text-red-500" />;
    case "canceled":
      return <Ban className="h-5 w-5 text-yellow-500" />;
    case "rescheduled":
      return <CalendarClock className="h-5 w-5 text-purple-500" />;
    case "credit_fail":
      return <CreditCard className="h-5 w-5 text-orange-500" />; // Corrected from CreditCardOff
    case "waiting_assignment":
      return <ClipboardList className="h-5 w-5 text-gray-500" />;
    default:
      return <Activity className="h-5 w-5 text-gray-500" />;
  }
};

const getStatusVariant = (status: Lead["status"]): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case "sold": return "default"; 
    case "in_process": return "secondary";
    case "no_sale":
    case "credit_fail":
    case "canceled":
      return "destructive";
    case "waiting_assignment":
    case "rescheduled":
      return "outline";
    default: return "outline";
  }
}


export default function LeadCard({ lead, context = "in-process" }: LeadCardProps) {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const canUpdateDisposition = user?.role === "closer" && lead.assignedCloserId === user.uid && context === "in-process";

  const timeAgo = lead.updatedAt ? formatDistanceToNow(lead.updatedAt.toDate(), { addSuffix: true }) : 'N/A';

  return (
    <>
      <Card className="shadow-md hover:shadow-lg transition-shadow duration-200">
        <CardHeader className="pb-3 pt-4 px-4">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-base font-semibold font-headline">{lead.customerName}</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">Updated {timeAgo}</CardDescription>
            </div>
            <Badge variant={getStatusVariant(lead.status)} className="capitalize text-xs flex items-center gap-1">
              {getStatusIcon(lead.status)}
              {lead.status.replace("_", " ")}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="text-sm space-y-1 pb-3 px-4">
          <div className="flex items-center text-muted-foreground">
            <Phone className="mr-2 h-4 w-4" />
            <span>{lead.customerPhone}</span>
          </div>
          {context === "in-process" && lead.assignedCloserName && (
            <div className="flex items-center text-muted-foreground">
              <User className="mr-2 h-4 w-4" />
              <span>Assigned to: {lead.assignedCloserName}</span>
            </div>
          )}
        </CardContent>
        {canUpdateDisposition && (
          <CardFooter className="pt-0 pb-3 px-4">
             <Button onClick={() => setIsModalOpen(true)} size="sm" className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
              Update Disposition
            </Button>
          </CardFooter>
        )}
      </Card>
      {canUpdateDisposition && (
        <LeadDispositionModal
          lead={lead}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
}
