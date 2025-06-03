
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
      console.log("[AuthProvider] onAuthStateChanged fired. Firebase user:", fbUser?.uid || null);
      setFirebaseUser(fbUser);
      if (fbUser) {
        // User is signed in
      } else {
        console.log("[AuthProvider] No Firebase user, setting AppUser to null.");
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
      console.log(`[AuthProvider] Firebase user ${firebaseUser.uid} detected. Setting up Firestore listener for 'users' collection.`);
      setLoading(true);
      const userDocRef = doc(db, "users", firebaseUser.uid);
      
      unsubscribeUserDoc = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const appUserData = { uid: firebaseUser.uid, ...docSnap.data() } as AppUser;
          console.log("[AuthProvider] Firestore 'users' document snapshot received for UID:", firebaseUser.uid, "Data:", appUserData);
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
      console.log("[AuthProvider] No Firebase user, ensuring AppUser is null and Firestore listener is not set up.");
      setUser(null); // Ensure user is null if firebaseUser is null
      setLoading(false); // Ensure loading is false
    }
    return () => {
      if (unsubscribeUserDoc) {
        console.log("[AuthProvider] Cleaning up Firestore 'users' document listener for UID:", firebaseUser?.uid || 'N/A');
        unsubscribeUserDoc();
      }
    };
  }, [firebaseUser]);


  useEffect(() => {
    console.log(`[AuthProvider] Navigation effect: loading=${loading}, userExists=${!!user}, pathname=${pathname}`);
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
    console.log("[AuthProvider] logout completed.");
  };
  
  if (loading && (pathname !== "/login" && !user)) {
     console.log("[AuthProvider] Initial loading state or navigating, showing loader.");
     return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  console.log("[AuthProvider] Rendering children. Current auth context value:", { firebaseUser: firebaseUser?.uid, user, loading, teamId: user?.teamId || null, role: user?.role || null });
  return (
    <AuthContext.Provider value={{ firebaseUser, user, loading, teamId: user?.teamId || null, role: user?.role || null, logout }}>
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

