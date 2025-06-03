
"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { UserX, ChevronDownSquare } from "lucide-react"; // Using ChevronDownSquare for a "drawer/modal" feel
import OffDutyClosersModal from "./off-duty-closers-modal";

export default function OffDutyClosers() {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (user?.role !== 'manager') {
    return null; 
  }

  return (
    <>
      <Button 
        onClick={() => setIsModalOpen(true)} 
        variant="outline" 
        className="w-full justify-start text-left shadow-md hover:shadow-lg transition-shadow h-auto py-3"
      >
        <div className="flex items-center w-full">
            <UserX className="mr-3 h-7 w-7 text-muted-foreground" />
            <div className="flex-1">
                <p className="text-base font-medium font-headline">Off Duty Closers</p>
                <p className="text-xs text-muted-foreground">Click to view & manage</p>
            </div>
            <ChevronDownSquare className="ml-auto h-5 w-5 text-muted-foreground opacity-70" />
        </div>
      </Button>
      <OffDutyClosersModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
