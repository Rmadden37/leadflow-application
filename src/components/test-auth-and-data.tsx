"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { auth, db } from "@/lib/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, setDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { Loader2, UserPlus, LogIn, AlertCircle, Search, Bug, Database } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

export default function TestAuthAndData() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("test@example.com");
  const [password, setPassword] = useState("testpassword123");
  const [authUser, setAuthUser] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setAuthUser(user);
      if (user) {
        console.log("Authenticated user:", {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName
        });
      }
    });
    return () => unsubscribe();
  }, []);

  const createTestUserAndData = async () => {
    setIsLoading(true);
    try {
      console.log("=== CREATING TEST USER AND DATA ===");
      
      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      console.log("Created Firebase user:", firebaseUser.uid);
      
      // Create a test team
      const teamRef = await addDoc(collection(db, "teams"), {
        name: "Test Team",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      const teamId = teamRef.id;
      console.log("Created team:", teamId);
      
      // Create user document
      await setDoc(doc(db, "users", firebaseUser.uid), {
        email: firebaseUser.email,
        displayName: "Test Manager",
        role: "manager",
        teamId: teamId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log("Created user document");
      
      // Create Richard Niger as a closer
      const richardCloserRef = await addDoc(collection(db, "closers"), {
        name: "Richard Niger",
        email: "richard.niger@example.com",
        teamId: teamId,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log("Created Richard Niger closer:", richardCloserRef.id);
      
      // Create Marcelo Guerra as a closer
      const marceloCloserRef = await addDoc(collection(db, "closers"), {
        name: "Marcelo Guerra",
        email: "marcelo.guerra@example.com", 
        teamId: teamId,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log("Created Marcelo Guerra closer:", marceloCloserRef.id);
      
      // Create some test leads with Richard and Marcelo assigned
      const leadData = [
        {
          customerName: "John Doe",
          customerEmail: "john@example.com",
          customerPhone: "555-1234",
          status: "waiting_assignment",
          assignedCloserId: richardCloserRef.id,
          teamId: teamId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        },
        {
          customerName: "Jane Smith", 
          customerEmail: "jane@example.com",
          customerPhone: "555-5678",
          status: "accepted",
          assignedCloserId: richardCloserRef.id,
          teamId: teamId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        },
        {
          customerName: "Bob Johnson",
          customerEmail: "bob@example.com", 
          customerPhone: "555-9012",
          status: "in_process",
          assignedCloserId: marceloCloserRef.id,
          teamId: teamId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        },
        {
          customerName: "Alice Wilson",
          customerEmail: "alice@example.com",
          customerPhone: "555-3456", 
          status: "waiting_assignment",
          assignedCloserId: marceloCloserRef.id,
          teamId: teamId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }
      ];
      
      for (const lead of leadData) {
        const leadRef = await addDoc(collection(db, "leads"), lead);
        console.log(`Created lead (${lead.status}):`, leadRef.id);
      }
      
      toast({
        title: "✅ Test Data Created Successfully",
        description: `Created test account, team, Richard Niger & Marcelo Guerra closers, and 4 test leads`,
        duration: 5000,
      });
      
      console.log("=== TEST DATA CREATION COMPLETE ===");
      
    } catch (error: any) {
      console.error("=== TEST DATA CREATION ERROR ===", error);
      let errorMessage = "Failed to create test data";
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "Email already in use - try logging in instead";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "Password too weak - use at least 6 characters";
      } else if (error.code === 'permission-denied') {
        errorMessage = "Permission denied - check Firestore security rules";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "❌ Test Data Creation Failed",
        description: errorMessage,
        variant: "destructive",
        duration: 8000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loginTestUser = async () => {
    setIsLoading(true);
    try {
      console.log("=== LOGGING IN TEST USER ===");
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("Logged in:", userCredential.user.uid);
      
      toast({
        title: "✅ Login Successful",
        description: `Logged in as ${userCredential.user.email}`,
        duration: 3000,
      });
      
    } catch (error: any) {
      console.error("=== LOGIN ERROR ===", error);
      let errorMessage = "Login failed";
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = "User not found - try creating account first";
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = "Wrong password";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Invalid email address";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "❌ Login Failed",
        description: errorMessage,
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const logoutUser = async () => {
    try {
      await signOut(auth);
      toast({
        title: "✅ Logged Out",
        description: "Successfully logged out",
        duration: 3000,
      });
    } catch (error: any) {
      console.error("Logout error:", error);
      toast({
        title: "❌ Logout Failed",
        description: error.message || "Failed to logout",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  return (
    <div className="w-full max-w-md space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-blue-500" />
            Test Authentication & Data Setup
          </CardTitle>
          <CardDescription>
            Create test user, team, Richard Niger & Marcelo Guerra closers, and sample leads to investigate team membership and in-process leads issue.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
          </div>
          
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {authUser && (
            <div className="p-3 bg-green-50 border border-green-200 rounded">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-green-600" />
                    <span className="text-green-700 font-medium">Authenticated</span>
                  </div>
                  <div className="text-sm text-green-600 mt-1">
                    {authUser.email} ({authUser.uid})
                  </div>
                </div>
                <Button 
                  onClick={logoutUser}
                  variant="outline" 
                  size="sm"
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  Logout
                </Button>
              </div>
            </div>
          )}
          
          <div className="flex gap-2">
            <Button
              onClick={createTestUserAndData}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="mr-2 h-4 w-4" />
              )}
              Create Test Data
            </Button>
            
            <Button
              onClick={loginTestUser}
              disabled={isLoading}
              variant="outline"
              className="flex-1"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="mr-2 h-4 w-4" />
              )}
              Login
            </Button>
          </div>
          
          {authUser && (
            <div className="space-y-2">
              <h3 className="font-medium text-sm text-gray-700">Debug Pages</h3>
              <div className="grid grid-cols-1 gap-2">
                <Link href="/debug-richard" className="w-full">
                  <Button variant="outline" size="sm" className="w-full">
                    <Search className="mr-2 h-4 w-4" />
                    Debug Richard Niger
                  </Button>
                </Link>
                <Link href="/debug-firebase" className="w-full">
                  <Button variant="outline" size="sm" className="w-full">
                    <Database className="mr-2 h-4 w-4" />
                    Debug Firebase Data
                  </Button>
                </Link>
                <Link href="/dashboard" className="w-full">
                  <Button variant="outline" size="sm" className="w-full">
                    <Bug className="mr-2 h-4 w-4" />
                    Go to Dashboard
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
