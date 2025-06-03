
"use client";

import type { User as FirebaseAuthUser } from "firebase/auth";
import { onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { useRouter, usePathname } from "next/navigation";
import type { ReactNode} from "react";
import React, { createContext, useContext, useEffect, useState } from "react";
import type { AppUser } from "@/types";
import { auth, db } from "@/lib/firebase";
import { Loader2 } from "lucide-react";

interface AuthContextType {
  firebaseUser: FirebaseAuthUser | null;
  user: AppUser | null;
  loading: boolean;
  teamId: string | null;
  role: AppUser["role"] | null;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseAuthUser | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    console.log("[AuthProvider] Setting up onAuthStateChanged listener.");
    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
      console.log("[AuthProvider] onAuthStateChanged triggered. Firebase user:", fbUser?.uid);
      setFirebaseUser(fbUser);
      if (fbUser) {
        // User is signed in
      } else {
        console.log("[AuthProvider] No Firebase user. Clearing AppUser.");
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      console.log("[AuthProvider] Cleaning up onAuthStateChanged listener.");
      unsubscribeAuth();
    }
  }, []);

  useEffect(() => {
    let unsubscribeUserDoc: (() => void) | undefined;

    if (firebaseUser) {
      console.log(`[AuthProvider] Firebase user ${firebaseUser.uid} detected. Setting up snapshot for 'users' collection.`);
      setLoading(true);
      const userDocRef = doc(db, "users", firebaseUser.uid);
      
      unsubscribeUserDoc = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const appUserData = { uid: firebaseUser.uid, ...docSnap.data() } as AppUser;
          console.log("[AuthProvider] User document snapshot received. Data:", appUserData);
          setUser(appUserData);
        } else {
          console.error("[AuthProvider] User document not found in 'users' collection for UID:", firebaseUser.uid);
          setUser(null);
        }
        setLoading(false);
      }, (error) => {
        console.error("[AuthProvider] Error fetching user document from 'users' collection:", error);
        setUser(null);
        setLoading(false);
      });
    } else {
      console.log("[AuthProvider] No Firebase user. Clearing AppUser and ensuring loading is false.");
      setUser(null); 
      setLoading(false); 
    }
    return () => {
      if (unsubscribeUserDoc) {
        console.log("[AuthProvider] Cleaning up user document snapshot listener.");
        unsubscribeUserDoc();
      }
    };
  }, [firebaseUser]);


  useEffect(() => {
    console.log(`[AuthProvider] Auth state change: loading=${loading}, user=${!!user}, pathname=${pathname}`);
    if (!loading && !user && pathname !== "/login") {
      console.log("[AuthProvider] Not loading, no user, not on login page. Redirecting to /login.");
      router.push("/login");
    }
    if (!loading && user && pathname === "/login") {
      console.log("[AuthProvider] Not loading, user exists, on login page. Redirecting to /dashboard.");
      router.push("/dashboard");
    }
  }, [user, loading, router, pathname]);

  const logout = async () => {
    console.log("[AuthProvider] logout called.");
    setLoading(true);
    await firebaseSignOut(auth);
    setUser(null);
    setFirebaseUser(null);
    router.push("/login");
    setLoading(false);
    console.log("[AuthProvider] logout complete.");
  };
  
  if (loading && (pathname !== "/login" && !user)) {
     console.log("[AuthProvider] Showing global loading spinner.");
     return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  const contextValue = { firebaseUser, user, loading, teamId: user?.teamId || null, role: user?.role || null, logout };
  console.log("[AuthProvider] Current auth context value:", contextValue);

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
