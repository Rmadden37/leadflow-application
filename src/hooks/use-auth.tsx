
"use client";

import type {User as FirebaseAuthUser} from "firebase/auth";
import {onAuthStateChanged, signOut as firebaseSignOut} from "firebase/auth";
import {doc, getDoc, onSnapshot} from "firebase/firestore";
import {useRouter, usePathname} from "next/navigation";
import type {ReactNode} from "react";
import React, {createContext, useContext, useEffect, useState} from "react";
import type {AppUser} from "@/types";
import {auth, db} from "@/lib/firebase";
import {Loader2} from "lucide-react";

interface AuthContextType {
  firebaseUser: FirebaseAuthUser | null;
  user: AppUser | null;
  loading: boolean;
  teamId: string | null;
  role: AppUser["role"] | null;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({children}: { children: ReactNode }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseAuthUser | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (!fbUser) {
        setUser(null);
        setLoading(false);
      }
      // If fbUser exists, the other useEffect will handle fetching AppUser
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    let unsubscribeUserDoc: (() => void) | undefined;

    if (firebaseUser) {
      setLoading(true);
      const userDocRef = doc(db, "users", firebaseUser.uid);

      unsubscribeUserDoc = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const appUserData = {uid: firebaseUser.uid, ...docSnap.data()} as AppUser;
          console.log("=== USER AUTH DEBUG ===");
          console.log("Firebase User:", {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName
          });
          console.log("App User Data:", appUserData);
          console.log("===");
          setUser(appUserData);
        } else {
          // User document not found - expected for new users
          console.log("User document not found for:", firebaseUser.uid);
          setUser(null);
        }
        setLoading(false);
      }, (error) => {
        // Auth error - set to null and continue
        console.error("Auth error:", error);
        setUser(null);
        setLoading(false);
      });
    } else {
      setUser(null);
      setLoading(false);
    }
    return () => {
      if (unsubscribeUserDoc) {
        unsubscribeUserDoc();
      }
    };
  }, [firebaseUser]);


  useEffect(() => {
    if (!loading && !user && pathname !== "/login") {
      router.push("/login");
    }
    if (!loading && user && pathname === "/login") {
      router.push("/dashboard");
    }
  }, [user, loading, router, pathname]);

  const logout = async () => {
    setLoading(true);
    await firebaseSignOut(auth);
    setUser(null);
    setFirebaseUser(null);
    // router.push will be handled by the effect above
    setLoading(false);
  };

  // Avoid rendering children if loading and not on login page without a user
  // This prevents a flash of content before redirect
  if (loading && pathname !== "/login" && !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const contextValue = {firebaseUser, user, loading, teamId: user?.teamId || null, role: user?.role || null, logout};

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
