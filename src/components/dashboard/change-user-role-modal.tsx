
"use client";

import type { AppUser, UserRole } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { doc, writeBatch, getDoc, serverTimestamp } from "firebase/firestore";
import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface ChangeUserRoleModalProps {
  userToEdit: AppUser;
  isOpen: boolean;
  onClose: () => void;
  managerTeamId: string; 
}

const availableRoles: UserRole[] = ["setter", "closer", "manager"];

export default function ChangeUserRoleModal({ userToEdit, isOpen, onClose, managerTeamId }: ChangeUserRoleModalProps) {
  const { user: managerUser } = useAuth();
  const { toast } = useToast();
  const [selectedRole, setSelectedRole] = useState<UserRole | undefined>(userToEdit.role);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedRole(userToEdit.role);
    }
  }, [isOpen, userToEdit.role]);

  const handleSubmit = async () => {
    if (!selectedRole) {
      toast({ title: "No Role Selected", description: "Please select a new role.", variant: "destructive" });
      return;
    }
    if (!managerUser || managerUser.role !== "manager") {
      toast({ title: "Unauthorized", description: "Only managers can change roles.", variant: "destructive" });
      return;
    }
    if (userToEdit.uid === managerUser.uid) {
        toast({ title: "Action Not Allowed", description: "You cannot change your own role here.", variant: "destructive"});
        return;
    }
    if (userToEdit.role === 'manager' && selectedRole !== 'manager') {
         toast({ title: "Action Not Allowed", description: "Managers cannot be demoted by other managers via this interface.", variant: "destructive"});
        return;
    }


    setIsLoading(true);
    const batch = writeBatch(db);
    const userDocRef = doc(db, "users", userToEdit.uid);

    batch.update(userDocRef, { role: selectedRole });

    const oldRoleIsCloser = userToEdit.role === "closer";
    const newRoleIsCloser = selectedRole === "closer";

    if (newRoleIsCloser && !oldRoleIsCloser) {
      // User is becoming a closer
      const closerDocRef = doc(db, "closers", userToEdit.uid);
      batch.set(closerDocRef, {
        uid: userToEdit.uid,
        name: userToEdit.displayName || userToEdit.email || "Unknown User",
        teamId: userToEdit.teamId, // Should be same as managerTeamId or userToEdit.teamId
        status: "Off Duty",
        role: "closer",
        avatarUrl: userToEdit.avatarUrl || null,
        phone: null, // Or fetch from users if available
        lineupOrder: new Date().getTime(), // Simple default, can be adjusted by manager
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else if (oldRoleIsCloser && !newRoleIsCloser) {
      // User is no longer a closer
      const closerDocRef = doc(db, "closers", userToEdit.uid);
      batch.delete(closerDocRef);
    }

    try {
      await batch.commit();
      toast({
        title: "Role Updated",
        description: `${userToEdit.displayName || userToEdit.email}'s role changed to ${selectedRole}.`,
      });
      onClose();
    } catch (error: any) {
      console.error("Error updating user role:", error);
      toast({
        title: "Update Failed",
        description: error.message || "Could not update user role.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline">Change Role for {userToEdit.displayName || userToEdit.email}</DialogTitle>
          <DialogDescription>
            Select the new role for this user. This will affect their permissions and access.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="role-select">New Role</Label>
            <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as UserRole)}>
              <SelectTrigger id="role-select" className="w-full">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map((role) => (
                  <SelectItem key={role} value={role} className="capitalize">
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={isLoading || !selectedRole || selectedRole === userToEdit.role}>
            {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    