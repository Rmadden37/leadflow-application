
"use client";

import type { AppUser } from "@/types";
import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, orderBy, doc, deleteDoc, writeBatch } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Users, UserCog, Trash2, ShieldAlert, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ChangeUserRoleModal from "./change-user-role-modal";
import ConfirmUserDeleteModal from "./confirm-user-delete-modal";

export default function TeamUserManagement() {
  const { user: managerUser } = useAuth();
  const { toast } = useToast();
  const [teamUsers, setTeamUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserForRoleChange, setSelectedUserForRoleChange] = useState<AppUser | null>(null);
  const [selectedUserForDelete, setSelectedUserForDelete] = useState<AppUser | null>(null);

  useEffect(() => {
    if (managerUser?.role === "manager" && managerUser.teamId) {
      setLoading(true);
      const usersQuery = query(
        collection(db, "users"),
        where("teamId", "==", managerUser.teamId),
        orderBy("displayName", "asc")
      );

      const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
        const usersData = snapshot.docs
          .map((doc) => ({ uid: doc.id, ...doc.data() } as AppUser))
          .filter(u => u.uid !== managerUser.uid); // Exclude the manager themselves
        setTeamUsers(usersData);
        setLoading(false);
      }, (error) => {
        console.error("Error fetching team users:", error);
        toast({ title: "Error", description: "Could not fetch team users.", variant: "destructive" });
        setLoading(false);
      });

      return () => unsubscribe();
    } else {
      setLoading(false);
      setTeamUsers([]); 
    }
  }, [managerUser, toast]);

  const handleDeleteUser = async (userToDelete: AppUser) => {
    if (!managerUser || managerUser.role !== "manager") {
        toast({ title: "Unauthorized", description: "Only managers can delete users.", variant: "destructive"});
        return;
    }
    if (userToDelete.uid === managerUser.uid) {
        toast({ title: "Action Not Allowed", description: "You cannot delete yourself.", variant: "destructive"});
        return;
    }

    const batch = writeBatch(db);
    const userDocRef = doc(db, "users", userToDelete.uid);
    batch.delete(userDocRef);

    // If the user was a closer, delete their closer record too
    if (userToDelete.role === "closer") {
      const closerDocRef = doc(db, "closers", userToDelete.uid);
      batch.delete(closerDocRef);
    }

    try {
      await batch.commit();
      toast({
        title: "User Records Deleted",
        description: `${userToDelete.displayName || userToDelete.email}'s records have been removed from the application. Note: Full Firebase Authentication account deletion requires backend admin privileges.`,
        duration: 7000, 
      });
      setSelectedUserForDelete(null); // Close modal
    } catch (error: any) {
      console.error("Error deleting user records:", error);
      toast({
        title: "Deletion Failed",
        description: error.message || "Could not delete user records.",
        variant: "destructive",
      });
    }
  };


  if (loading) {
    return (
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold font-headline flex items-center justify-center">
            <Users className="mr-3 h-7 w-7 text-primary" />
            Team User Management
          </CardTitle>
          <CardDescription className="text-center">Loading team members...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!managerUser || managerUser.role !== "manager") {
    return null; 
  }
  
  return (
    <>
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold font-headline flex items-center justify-center">
            <Users className="mr-3 h-7 w-7 text-primary" />
            Team User Management
          </CardTitle>
          <CardDescription className="text-center">Manage roles and access for your team members.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {teamUsers.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No other team members found (you are not listed here).</p>
          ) : (
            <ul className="divide-y divide-border">
              {teamUsers.map((teamMember) => (
                <li key={teamMember.uid} className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10 border">
                      <AvatarImage src={teamMember.avatarUrl || undefined} alt={teamMember.displayName || teamMember.email || "User"} />
                      <AvatarFallback>
                        {teamMember.displayName ? teamMember.displayName.substring(0, 2).toUpperCase() : (teamMember.email ? teamMember.email.substring(0, 2).toUpperCase() : "??")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{teamMember.displayName || "No Name"}</p>
                      <p className="text-sm text-muted-foreground">{teamMember.email}</p>
                      <p className="text-xs text-muted-foreground capitalize flex items-center">
                        {teamMember.role === 'manager' ? <ShieldCheck className="mr-1 h-3 w-3 text-primary" /> : <UserCog className="mr-1 h-3 w-3" />}
                        Role: {teamMember.role}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2 mt-2 sm:mt-0 self-end sm:self-center">
                    <Button variant="outline" size="sm" onClick={() => setSelectedUserForRoleChange(teamMember)}>
                      <UserCog className="mr-1.5 h-4 w-4" /> Change Role
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => setSelectedUserForDelete(teamMember)} disabled={teamMember.role === 'manager'}>
                      <Trash2 className="mr-1.5 h-4 w-4" /> Delete
                    </Button>
                     {teamMember.role === 'manager' && (
                        <p className="text-xs text-muted-foreground flex items-center ml-2">
                            <ShieldAlert className="h-3 w-3 mr-1 text-orange-500"/> Cannot delete other managers.
                        </p>
                     )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {selectedUserForRoleChange && (
        <ChangeUserRoleModal
          userToEdit={selectedUserForRoleChange}
          isOpen={!!selectedUserForRoleChange}
          onClose={() => setSelectedUserForRoleChange(null)}
          managerTeamId={managerUser.teamId}
        />
      )}

      {selectedUserForDelete && (
        <ConfirmUserDeleteModal
          userToDelete={selectedUserForDelete}
          isOpen={!!selectedUserForDelete}
          onClose={() => setSelectedUserForDelete(null)}
          onConfirmDelete={() => handleDeleteUser(selectedUserForDelete)}
        />
      )}
    </>
  );
}
