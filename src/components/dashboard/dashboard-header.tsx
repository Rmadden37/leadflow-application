
"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, UserCircle, ClipboardList, PlusCircle, Loader2, History } from "lucide-react";
import AvailabilityToggle from "./availability-toggle";
import CreateLeadForm from "./create-lead-form"; 
import { ThemeToggleButton } from "@/components/theme-toggle-button";
import { useState } from "react";

export default function DashboardHeader() {
  const { user, logout } = useAuth();
  const [isCreateLeadModalOpen, setIsCreateLeadModalOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 max-w-screen-2xl items-center">
          <Link href="/dashboard" className="mr-6 flex items-center space-x-2 text-primary">
            <ClipboardList className="h-8 w-8" />
            <span className="text-2xl font-bold font-headline">LeadFlow</span>
          </Link>
          <nav className="flex items-center space-x-2 mr-auto">
             {user?.role === 'manager' && (
                <Button asChild variant="ghost" size="sm">
                  <Link href="/dashboard/all-leads">
                    <History className="mr-2 h-5 w-5" />
                    All Leads
                  </Link>
                </Button>
            )}
          </nav>
          <div className="flex items-center justify-end space-x-2 md:space-x-4"> {/* Adjusted spacing for smaller screens */}
            {(user?.role === 'setter' || user?.role === 'manager') && (
              <Button onClick={() => setIsCreateLeadModalOpen(true)} variant="primary-solid" size="sm">
                <PlusCircle className="mr-2 h-5 w-5" />
                Create New Lead
              </Button>
            )}
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
            <ThemeToggleButton />
            <Button variant="ghost" size="icon" onClick={logout} aria-label="Logout">
              <LogOut className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </header>
      {(user?.role === 'setter' || user?.role === 'manager') && (
        <CreateLeadForm
          isOpen={isCreateLeadModalOpen}
          onClose={() => setIsCreateLeadModalOpen(false)}
        />
      )}
    </>
  );
}
