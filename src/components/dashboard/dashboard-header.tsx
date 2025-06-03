
"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, UserCircle, ClipboardList, PlusCircle } from "lucide-react";
import AvailabilityToggle from "./availability-toggle";

export default function DashboardHeader() {
  const { user, logout } = useAuth();

  const handleCreateNewLead = () => {
    // TODO: Implement lead creation functionality
    console.log("Create New Lead button clicked - functionality to be implemented.");
    // For now, we can use a toast to indicate it's not yet implemented
    // import { useToast } from "@/hooks/use-toast"; // if you decide to use toast
    // const { toast } = useToast();
    // toast({ title: "Coming Soon!", description: "Lead creation functionality is under development." });
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center">
        <Link href="/dashboard" className="mr-6 flex items-center space-x-2 text-primary">
          <ClipboardList className="h-10 w-10" />
          <span className="text-2xl font-bold font-headline">LeadFlow</span>
        </Link>
        <div className="flex flex-1 items-center justify-end space-x-4">
          <Button onClick={handleCreateNewLead} variant="default" size="sm">
            <PlusCircle className="mr-2 h-5 w-5" />
            Create New Lead
          </Button>
          {user?.role === "closer" && <AvailabilityToggle />}
          <div className="flex items-center space-x-2">
            <Avatar className="h-10 w-10 border border-border">
              <AvatarImage src={user?.displayName ? `https://ui-avatars.com/api/?name=${user.displayName.replace(/\s+/g, '+')}&background=random` : undefined} />
              <AvatarFallback>
                {user?.email ? user.email.substring(0, 2).toUpperCase() : <UserCircle size={24}/>}
              </AvatarFallback>
            </Avatar>
            <div className="hidden sm:flex flex-col text-xs">
              <span className="font-semibold">{user?.displayName || user?.email}</span>
              <span className="text-muted-foreground capitalize">{user?.role}</span>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={logout} aria-label="Logout">
            <LogOut className="h-7 w-7" />
          </Button>
        </div>
      </div>
    </header>
  );
}
