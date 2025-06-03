
"use client";

import type { Closer } from "@/types";
import { Card, CardContent } from "@/components/ui/card"; // Removed CardHeader, CardTitle as they are not used
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserCheck, UserX } from "lucide-react";

interface CloserCardProps {
  closer: Closer;
}

export default function CloserCard({ closer }: CloserCardProps) {
  const isOnDuty = closer.status === "On Duty";

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-3">
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={closer.avatarUrl || `https://ui-avatars.com/api/?name=${closer.name.replace(/\s+/g, '+')}&background=random`} />
            <AvatarFallback>{closer.name ? closer.name.substring(0, 2).toUpperCase() : "N/A"}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="text-sm font-medium font-headline">{closer.name}</p>
            <div className={`flex items-center text-xs ${isOnDuty ? "text-green-600" : "text-red-600"}`}>
              {isOnDuty ? (
                <UserCheck className="mr-1 h-4 w-4" />
              ) : (
                <UserX className="mr-1 h-4 w-4" />
              )}
              {closer.status} {/* This will now display "On Duty" or "Off Duty" directly */}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
