
"use client";

import type { Closer } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
            <AvatarImage src={`https://ui-avatars.com/api/?name=${closer.name.replace(/\s+/g, '+')}&background=random`} />
            <AvatarFallback>{closer.name.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="text-sm font-medium font-headline">{closer.name}</p>
            <div className={`flex items-center text-xs ${isOnDuty ? "text-green-600" : "text-red-600"}`}>
              {isOnDuty ? (
                <UserCheck className="mr-1 h-3.5 w-3.5" />
              ) : (
                <UserX className="mr-1 h-3.5 w-3.5" />
              )}
              {closer.status} {/* This will now display "On Duty" or "Off Duty" */}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
