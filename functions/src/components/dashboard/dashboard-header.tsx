"use client";

import Link from "next/link";
import {useAuth} from "@/hooks/use-auth";
import {Button} from "@/components/ui/button";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {LogOut, UserCircle, ClipboardList, PlusCircle} from "lucide-react";
import AvailabilityToggle from "./availability-toggle";
import {ThemeToggleButton} from "@/components/theme-toggle-button";
import {useState, lazy, Suspense} from "react";
import dynamic from "next/dynamic";
import TeamChatButton from "./floating-team-chat-button";

// Dynamic import with Next.js dynamic to avoid circular dependency issues
const CreateLeadForm = dynamic(() => import("./create-lead-form"), {
  ssr: false,
  loading: () => <div>Loading...</div>
});

export default function DashboardHeader() {
  const {user, logout} = useAuth();
  const [isCreateLeadModalOpen, setIsCreateLeadModalOpen] = useState(false);

  const getAvatarFallbackText = () => {
    if (user?.displayName) return user.displayName.substring(0, 2).toUpperCase();
    if (user?.email) return user.email.substring(0, 2).toUpperCase();
    return <UserCircle size={24}/>;
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border/20 bg-white/95 dark:bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-white/95 dark:supports-[backdrop-filter]:bg-background/95 shadow-sm dark:border-primary/10 dark:shadow-primary/5">
        <div className="container flex h-16 sm:h-18 max-w-7xl mx-auto items-center px-4 sm:px-6 lg:px-8">
          <Link href="/dashboard" className="mr-6 sm:mr-8 flex items-center space-x-3 text-[#3574F2] group">
            <div className="p-2 bg-gradient-to-br from-[#3574F2]/20 to-[#5096F2]/10 rounded-xl group-hover:from-[#3574F2]/30 group-hover:to-[#5096F2]/20 transition-all duration-300 shadow-sm">
              <ClipboardList className="h-6 w-6 sm:h-7 sm:w-7 text-[#3574F2]" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl sm:text-2xl font-bold font-headline bg-gradient-to-r from-[#3574F2] to-[#5096F2] bg-clip-text text-transparent">LeadFlow</span>
              <span className="text-xs text-muted-foreground hidden sm:block">Lead Management System</span>
            </div>
          </Link>
          
          <div className="flex items-center justify-end space-x-2 sm:space-x-3 md:space-x-4 ml-auto">
            {(user?.role === "setter" || user?.role === "manager" || user?.role === "admin") && (
              <Button 
                onClick={() => setIsCreateLeadModalOpen(true)} 
                variant="primary-solid" 
                size="sm" 
                className="hidden sm:flex bg-gradient-to-r from-[#3574F2] to-[#5096F2] hover:from-[#3574F2]/90 hover:to-[#5096F2]/90 shadow-lg shadow-[#3574F2]/25 hover:shadow-xl hover:shadow-[#3574F2]/30 transition-all duration-300 border-0"
              >
                <PlusCircle className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden md:inline">Create New Lead</span>
                <span className="md:hidden">Create</span>
              </Button>
            )}
            {(user?.role === "setter" || user?.role === "manager" || user?.role === "admin") && (
              <Button 
                onClick={() => setIsCreateLeadModalOpen(true)} 
                variant="primary-solid" 
                size="sm" 
                className="sm:hidden bg-gradient-to-r from-[#3574F2] to-[#5096F2] hover:from-[#3574F2]/90 hover:to-[#5096F2]/90 shadow-lg shadow-[#3574F2]/25 border-0"
              >
                <PlusCircle className="h-4 w-4" />
              </Button>
            )}
            
            <TeamChatButton />
            
            {user?.role === "closer" && <AvailabilityToggle />}
            
            <Link 
              href="/dashboard/profile" 
              className="flex items-center space-x-2 p-1.5 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-primary/10 transition-colors"
            >
              <Avatar className="h-8 w-8 sm:h-10 sm:w-10 border-2 border-border shadow-sm">
                <AvatarImage src={user?.avatarUrl || undefined} alt={user?.displayName || user?.email || "User"} />
                <AvatarFallback className="bg-gradient-to-br from-[#3574F2]/20 to-[#5096F2]/10 text-[#3574F2] font-semibold">
                  {getAvatarFallbackText()}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:flex flex-col text-xs">
                <span className="font-semibold text-foreground">{user?.displayName || user?.email}</span>
                <span className="text-muted-foreground capitalize">{user?.role}</span>
              </div>
            </Link>
            
            <div className="block">
              <ThemeToggleButton />
            </div>
            
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={logout} 
              aria-label="Logout" 
              className="h-8 w-8 sm:h-10 sm:w-10 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            >
              <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </div>
        </div>
      </header>
      {(user?.role === "setter" || user?.role === "manager" || user?.role === "admin") && (
        <CreateLeadForm
          isOpen={isCreateLeadModalOpen}
          onClose={() => setIsCreateLeadModalOpen(false)}
        />
      )}
    </>
  );
}
