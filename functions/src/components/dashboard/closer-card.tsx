"use client";

import type {Closer, LeadStatus} from "@/types";
import {Card, CardContent} from "@/components/ui/card";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {UserCheck, UserX, Loader2, ArrowUp, ArrowDown, Briefcase, Crown} from "lucide-react";
import {Switch} from "@/components/ui/switch";
import {Label} from "@/components/ui/label";
import {Button} from "@/components/ui/button";
import ProfileCard from "./profile-card";

import {useAuth} from "@/hooks/use-auth";
import {db} from "@/lib/firebase";
import {doc, updateDoc, serverTimestamp, Timestamp} from "firebase/firestore";
import {useToast} from "@/hooks/use-toast";
import {useState} from "react";

interface CloserCardProps {
  closer: Closer;
  allowInteractiveToggle?: boolean;
  onMove?: (direction: "up" | "down") => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  showMoveControls?: boolean;
  isUpdatingOrder?: boolean;
  assignedLeadName?: string;
  onLeadClick?: () => void;
  onDispositionChange?: (status: LeadStatus, scheduledTime?: Date) => void;
  showDispositionSelector?: boolean;
  currentLeadStatus?: LeadStatus;
  leadId?: string;
  position?: number;
}

export default function CloserCard({
  closer,
  allowInteractiveToggle = true,
  onMove,
  canMoveUp,
  canMoveDown,
  showMoveControls,
  isUpdatingOrder,
  assignedLeadName,
  onLeadClick,
  onDispositionChange,
  showDispositionSelector = false,
  currentLeadStatus,
  leadId,
  position,
}: CloserCardProps) {
  const {user} = useAuth();
  const {toast} = useToast();
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  
  // Check lead status
  const isAcceptedLead = currentLeadStatus === "accepted";
  const isScheduledLead = currentLeadStatus === "scheduled";
  const isWaitingAssignmentLead = currentLeadStatus === "waiting_assignment";

  const canUserManagerOrSelfToggle = user && (user.role === "manager" || user.role === "admin" || (user.role === "closer" && user.uid === closer.uid));
  const showInteractiveSwitch = canUserManagerOrSelfToggle && allowInteractiveToggle && !assignedLeadName;

  const handleToggleCloserAvailability = async (checked: boolean) => {
    if (!user || !canUserManagerOrSelfToggle || assignedLeadName) return;

    setIsUpdatingStatus(true);
    const newStatus = checked ? "On Duty" : "Off Duty";

    try {
      const closerDocRef = doc(db, "closers", closer.uid);
      await updateDoc(closerDocRef, {
        status: newStatus,
      });
      toast({
        title: "Status Updated",
        description: `${closer.name || "Closer"}'s status set to ${newStatus}.`,
      });
    } catch (error) {
      toast({
        title: "Update Failed",
        description: `Could not update ${closer.name || "Closer"}'s status.`,
        variant: "destructive",
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };



  const currentStatusIsOnDuty = closer.status === "On Duty";
  const avatarSrc = closer.avatarUrl || `https://ui-avatars.com/api/?name=${(closer.name || "User").replace(/\s+/g, "+")}&background=random&color=fff`;
  const avatarDataAiHint = closer.avatarUrl ? undefined : (closer.name?.split(" ")[0]?.toLowerCase() || "person");

  return (
    <Card className="shadow-xl hover:shadow-2xl transition-all duration-300 border-0 hover:scale-[1.02] shadow-slate-400/20 dark:shadow-slate-900/40 bg-gradient-to-r from-blue-100/70 via-white to-blue-100/70 dark:from-gray-900 dark:via-blue-950/20 dark:to-gray-900">
      <CardContent className="p-3">
        <div className="flex items-start space-x-2">
          {/* Position indicator */}
          {position && (
            <div className="flex-shrink-0 flex items-center justify-center w-6 h-6 text-white text-xs font-bold rounded-full shadow-md bg-gradient-to-br from-blue-600 to-blue-700">
              {position}
            </div>
          )}
          <Avatar 
            className="h-10 w-10 border-2 shadow-md flex-shrink-0 cursor-pointer transition-colors border-blue-200 dark:border-blue-700 hover:border-blue-300 dark:hover:border-blue-600"
            onClick={() => setIsProfileModalOpen(true)}
          >
            <AvatarImage src={avatarSrc} alt={closer.name || "User"} data-ai-hint={avatarDataAiHint} />
            <AvatarFallback className="font-bold text-xs bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-800 dark:to-blue-900 text-blue-900 dark:text-blue-100">
              {closer.name ? closer.name.substring(0, 2).toUpperCase() : "N/A"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 pr-2">
            <div className="flex items-center gap-1">
              <p className="text-xs font-bold font-headline text-foreground truncate">
                {closer.name || "Unnamed Closer"}
              </p>
            </div>
            {assignedLeadName ? (
              <div 
                className={`flex items-center text-xs mt-1 ${onLeadClick ? 'cursor-pointer hover:text-blue-600 dark:hover:text-blue-200 transition-colors' : ''} text-blue-700 dark:text-blue-300`}
                onClick={onLeadClick}
                role={onLeadClick ? "button" : undefined}
                tabIndex={onLeadClick ? 0 : undefined}
                onKeyDown={onLeadClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onLeadClick(); } } : undefined}
              >
                <Briefcase className="mr-1 h-3 w-3 flex-shrink-0" />
                <span className="font-medium truncate text-xs">Working on: {assignedLeadName}</span>
              </div>
            ) : showInteractiveSwitch ? (
              <div className="flex items-center space-x-2 mt-1">
                <Switch
                  id={`status-toggle-${closer.uid}`}
                  checked={currentStatusIsOnDuty}
                  onCheckedChange={handleToggleCloserAvailability}
                  disabled={isUpdatingStatus || isUpdatingOrder}
                  aria-label={currentStatusIsOnDuty ? `Set ${closer.name || "Closer"} to Off Duty` : `Set ${closer.name || "Closer"} to On Duty`}
                  className="scale-75"
                />
                <Label
                  htmlFor={`status-toggle-${closer.uid}`}
                  className={`text-xs font-medium ${currentStatusIsOnDuty ? "text-green-700 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                >
                  {isUpdatingStatus ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    currentStatusIsOnDuty ? "Available" : "Off Duty"
                  )}
                </Label>
              </div>
            ) : (
              <div className={`flex items-center text-xs mt-1 ${currentStatusIsOnDuty ? "text-green-700 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                {currentStatusIsOnDuty ? (
                  <UserCheck className="mr-1 h-3 w-3" />
                ) : (
                  <UserX className="mr-1 h-3 w-3" />
                )}
                <span className="font-medium">{currentStatusIsOnDuty ? "Available" : "Off Duty"}</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Right side controls - moved to separate row to prevent overlap */}
        {((isWaitingAssignmentLead || isScheduledLead || isAcceptedLead) && onDispositionChange) || 
         (showMoveControls && onMove && !assignedLeadName) ? (
          <div className="flex items-center justify-end space-x-1 mt-2 pt-2 border-t border-blue-100 dark:border-blue-800">
            {/* Single Accept button for waiting_assignment and scheduled leads (managers/admins) */}
            {(isWaitingAssignmentLead || isScheduledLead) && (user?.role === "manager" || user?.role === "admin") && onDispositionChange && (
              <Button 
                size="sm" 
                className="h-6 px-2 text-xs bg-green-600 hover:bg-green-700 text-white border border-green-800"
                onClick={() => {
                  // Skip directly to in_process for managers
                  onDispositionChange("in_process");
                  toast({
                    title: "Lead Accepted",
                    description: "Lead has been accepted and is now in process."
                  });
                }}
              >
                Accept & Start
              </Button>
            )}
            
            {/* Accept Job button for scheduled leads (closers only) */}
            {isScheduledLead && user?.role === "closer" && onDispositionChange && (
              <Button 
                size="sm" 
                className="h-6 px-2 text-xs bg-green-600 hover:bg-green-700 text-white border border-green-800"
                onClick={() => {
                  // Update lead from scheduled to accepted
                  onDispositionChange("accepted");
                  toast({
                    title: "Job Accepted",
                    description: "Job has been accepted."
                  });
                }}
              >
                Accept Job
              </Button>
            )}
            
            {/* Start Working button for accepted leads (closers only) */}
            {isAcceptedLead && user?.role === "closer" && onDispositionChange && (
              <Button 
                size="sm" 
                className="h-6 px-2 text-xs bg-blue-600 hover:bg-blue-700 text-white border border-blue-800"
                onClick={() => {
                  // Update lead from accepted to in_process
                  onDispositionChange("in_process");
                  toast({
                    title: "Lead Status Updated",
                    description: "You are now actively working on this lead."
                  });
                }}
              >
                Start Working
              </Button>
            )}
            

            
            {/* Move Controls */}
            {showMoveControls && onMove && !assignedLeadName && (
              <div className="flex items-center space-x-1 ml-2">
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => onMove("up")} disabled={!canMoveUp || isUpdatingStatus || isUpdatingOrder}>
                  <ArrowUp className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => onMove("down")} disabled={!canMoveDown || isUpdatingStatus || isUpdatingOrder}>
                  <ArrowDown className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        ) : null}
      </CardContent>
      
      {/* Profile Modal */}
      <ProfileCard
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        profile={{
          uid: closer.uid,
          name: closer.name || "Unnamed Closer",
          email: null, // Closers don't have email in the schema
          phone: closer.phone || null,
          avatarUrl: closer.avatarUrl || `https://ui-avatars.com/api/?name=${(closer.name || "User").replace(/\s+/g, "+")}&background=random&color=fff`,
          role: "closer"
        }}
      />
    </Card>
  );
}
