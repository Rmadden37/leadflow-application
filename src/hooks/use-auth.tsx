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
    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        // User is signed in, see docs for a list of available properties
        // https://firebase.google.com/docs/reference/js/firebase.User
      } else {
        setUser(null);
        setLoading(false);
      }
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
          setUser({ uid: firebaseUser.uid, ...docSnap.data() } as AppUser);
        } else {
          // User document doesn't exist, might be an error or new user not yet in Firestore
          console.error("User document not found for UID:", firebaseUser.uid);
          setUser(null); // Or handle as appropriate, e.g. redirect to profile setup
        }
        setLoading(false);
      }, (error) => {
        console.error("Error fetching user document:", error);
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
    router.push("/login");
    setLoading(false);
  };
  
  if (loading && (pathname !== "/login" && !user)) {
     return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }


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
