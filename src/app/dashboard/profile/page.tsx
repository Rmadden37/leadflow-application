
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { auth, db } from "@/lib/firebase";
import { updateProfile, sendPasswordResetEmail } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User, Mail, ShieldCheck, Edit3, KeyRound } from "lucide-react";

const profileFormSchema = z.object({
  displayName: z.string().min(2, { message: "Display name must be at least 2 characters." }).max(50, { message: "Display name cannot exceed 50 characters." }),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function ProfilePage() {
  const { user, firebaseUser, loading: authLoading, logout } = useAuth();
  const { toast } = useToast();
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isSendingResetEmail, setIsSendingResetEmail] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      displayName: "",
    },
  });

  useEffect(() => {
    if (user?.displayName) {
      form.reset({ displayName: user.displayName });
    }
  }, [user, form]);

  const handleUpdateProfile = async (values: ProfileFormValues) => {
    if (!firebaseUser || !user) {
      toast({ title: "Error", description: "User not found.", variant: "destructive" });
      return;
    }
    setIsUpdatingProfile(true);
    try {
      // 1. Update Firebase Auth profile
      await updateProfile(firebaseUser, { displayName: values.displayName });

      // 2. Update 'users' collection in Firestore
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, { displayName: values.displayName });

      // 3. If user is a closer, update 'name' in 'closers' collection
      if (user.role === "closer") {
        const closerDocRef = doc(db, "closers", user.uid);
        await updateDoc(closerDocRef, { name: values.displayName });
      }

      toast({
        title: "Profile Updated",
        description: "Your display name has been successfully updated.",
      });
       // The useAuth hook will eventually reflect the change from Firestore,
       // causing a re-render. For immediate UI update in the form:
      form.reset({ displayName: values.displayName });


    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({
        title: "Update Failed",
        description: error.message || "Could not update your profile.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) {
      toast({ title: "Error", description: "Email address not found.", variant: "destructive" });
      return;
    }
    setIsSendingResetEmail(true);
    try {
      await sendPasswordResetEmail(auth, user.email);
      toast({
        title: "Password Reset Email Sent",
        description: "Check your inbox for a password reset link. You will be logged out.",
      });
      // Log out the user after sending the email for security
      setTimeout(async () => {
        await logout();
      }, 3000);
    } catch (error: any) {
      console.error("Error sending password reset email:", error);
      toast({
        title: "Request Failed",
        description: error.message || "Could not send password reset email.",
        variant: "destructive",
      });
    } finally {
      setIsSendingResetEmail(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-[calc(100vh-var(--header-height,4rem))] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
     // This should be handled by AuthProvider redirect, but as a fallback
    return (
        <div className="flex min-h-[calc(100vh-var(--header-height,4rem))] items-center justify-center">
             <p className="text-destructive">User not found. Please log in again.</p>
        </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center">
            <User className="mr-3 h-7 w-7 text-primary" />
            User Profile
          </CardTitle>
          <CardDescription>Manage your personal information and account settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center text-sm">
              <Mail className="mr-2 h-5 w-5 text-muted-foreground" />
              <span className="font-medium">Email:</span>
              <span className="ml-2 text-muted-foreground">{user.email}</span>
            </div>
            <div className="flex items-center text-sm">
              <ShieldCheck className="mr-2 h-5 w-5 text-muted-foreground" />
              <span className="font-medium">Role:</span>
              <span className="ml-2 text-muted-foreground capitalize">{user.role}</span>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleUpdateProfile)} className="space-y-4">
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><Edit3 className="mr-2 h-4 w-4"/>Display Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isUpdatingProfile} className="w-full sm:w-auto">
                {isUpdatingProfile ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  "Save Changes"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex-col items-start space-y-4 border-t pt-6">
            <div>
                <h3 className="text-lg font-medium font-headline flex items-center">
                    <KeyRound className="mr-2 h-5 w-5 text-primary"/>
                    Password Reset
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                    If you need to reset your password, click the button below. A reset link will be sent to your email address.
                </p>
            </div>
          <Button variant="outline" onClick={handlePasswordReset} disabled={isSendingResetEmail} className="w-full sm:w-auto">
            {isSendingResetEmail ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              "Send Password Reset Email"
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
