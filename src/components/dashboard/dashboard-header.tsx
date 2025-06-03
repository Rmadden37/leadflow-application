
"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, UserCircle, ClipboardList } from "lucide-react";
import AvailabilityToggle from "./availability-toggle";

export default function DashboardHeader() {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center">
        <Link href="/dashboard" className="mr-6 flex items-center space-x-2 text-primary">
          <ClipboardList className="h-8 w-8 border border-border rounded-sm p-0.5" />
          <span className="text-2xl font-bold font-headline">LeadFlow</span>
        </Link>
        <div className="flex flex-1 items-center justify-end space-x-4">
          {user?.role === "closer" && <AvailabilityToggle />}
          <div className="flex items-center space-x-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.displayName ? `https://ui-avatars.com/api/?name=${user.displayName.replace(/\s+/g, '+')}&background=random` : undefined} />
              <AvatarFallback>
                {user?.email ? user.email.substring(0, 2).toUpperCase() : <UserCircle size={20}/>}
              </AvatarFallback>
            </Avatar>
            <div className="hidden sm:flex flex-col text-xs">
              <span className="font-semibold">{user?.displayName || user?.email}</span>
              <span className="text-muted-foreground capitalize">{user?.role}</span>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={logout} aria-label="Logout">
            <LogOut className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </header>
  );
}
