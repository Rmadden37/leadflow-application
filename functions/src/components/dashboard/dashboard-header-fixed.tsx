"use client";

import Link from "next/link";
import {LogOut, UserCircle, ClipboardList, PlusCircle} from "lucide-react";
import {ThemeToggleButton} from "@/components/theme-toggle-button-fixed";
import {useState} from "react";

export default function DashboardHeader() {
  const [isCreateLeadModalOpen, setIsCreateLeadModalOpen] = useState(false);
  
  // Temporary user placeholder until useAuth is fixed
  const user = { 
    displayName: "User", 
    email: "user@example.com", 
    role: "user",
    avatarUrl: null 
  };

  const handleSignOut = async () => {
    // Placeholder for sign out functionality
    console.log("Sign out functionality needs to be implemented");
  };

  const getUserInitials = (user: any) => {
    if (user?.displayName) {
      return user.displayName
        .split(' ')
        .map((name: string) => name[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return user?.email?.[0]?.toUpperCase() || 'U';
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md dark:bg-background/95 dark:border-primary/20">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          {/* Left side - Logo/Title */}
          <div className="flex items-center space-x-4">
            <Link 
              href="/dashboard" 
              className="text-xl font-bold text-foreground hover:text-primary transition-colors dark:text-primary dark:hover:text-primary/80"
            >
              Dashboard
            </Link>
          </div>

          {/* Right side - Actions and User */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Create Lead Button */}
            <button
              onClick={() => setIsCreateLeadModalOpen(true)}
              className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 rounded-md px-3 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/80 dark:shadow-primary/20"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Create Lead</span>
              <span className="sm:hidden">Lead</span>
            </button>

            {/* Theme Toggle */}
            <ThemeToggleButton />
            
            {/* User Profile */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 sm:h-10 sm:w-10 border-2 border-border shadow-sm rounded-full bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold flex items-center justify-center">
                  {getUserInitials(user)}
                </div>
                <div className="hidden md:block text-right">
                  <p className="text-sm font-medium text-foreground dark:text-primary">
                    {user?.displayName || 'User'}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {user?.role || 'user'}
                  </p>
                </div>
              </div>

              {/* Sign Out Button */}
              <button
                onClick={handleSignOut}
                className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 rounded-md px-3 dark:border-primary/20 dark:hover:bg-primary/10"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Create Lead Modal Placeholder */}
      {isCreateLeadModalOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-background border rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Create Lead</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Create Lead form component needs to be implemented.
            </p>
            <button
              onClick={() => setIsCreateLeadModalOpen(false)}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-9 rounded-md px-3"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
