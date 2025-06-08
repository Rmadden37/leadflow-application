"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { requestNotificationPermission, debugToken } from "@/lib/firebase-messaging";
import { doc, setDoc, collection, getDoc, getDocs, query, where, deleteField, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function TestFcmTokens() {
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingTokens, setLoadingTokens] = useState<boolean>(false);
  const [savedTokens, setSavedTokens] = useState<string[]>([]);
  const [hasInvalidToken, setHasInvalidToken] = useState<boolean>(false);
  const { user } = useAuth();

  // Load existing tokens when component mounts
  useEffect(() => {
    async function fetchTokens() {
      if (!user) return;
      
      setLoadingTokens(true);
      try {
        const userTokensRef = doc(db, "userTokens", user.uid);
        const tokenDoc = await getDoc(userTokensRef);
        
        if (tokenDoc.exists()) {
          const tokens = tokenDoc.data().tokens || [];
          setSavedTokens(tokens);
          
          // Check for suspected invalid token
          const suspectToken = "BKG3AGuGG29VYQc4WzjtGnDespL8rW8z6cobGPiml473TcdW9TLPINIHgBe3zzLfh3GzjF_S_64gDjqNKtxTESw";
          if (tokens.includes(suspectToken)) {
            setHasInvalidToken(true);
          }
        }
      } catch (err) {
        console.error("Error loading tokens:", err);
      } finally {
        setLoadingTokens(false);
      }
    }
    
    fetchTokens();
  }, [user]);

  const getAndSaveToken = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to manage notification tokens",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const fcmToken = await requestNotificationPermission();
      
      if (fcmToken) {
        setToken(fcmToken);
        
        // Save token to Firestore
        const userTokensRef = doc(db, "userTokens", user.uid);
        const tokenDoc = await getDoc(userTokensRef);
        
        if (tokenDoc.exists()) {
          // Update existing tokens array
          const tokens = tokenDoc.data().tokens || [];
          if (!tokens.includes(fcmToken)) {
            tokens.push(fcmToken);
            await setDoc(userTokensRef, { tokens }, { merge: true });
            setSavedTokens(tokens);
          }
        } else {
          // Create new document
          const newTokens = [fcmToken];
          await setDoc(userTokensRef, { 
            tokens: newTokens,
            userId: user.uid
          });
          setSavedTokens(newTokens);
        }
        
        toast({
          title: "Success",
          description: "Notification token saved successfully",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to get notification token. Make sure notifications are enabled.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      console.error("Error getting FCM token:", err);
      toast({
        title: "Error",
        description: `Failed to manage notification token: ${err.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const removeInvalidToken = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const userTokensRef = doc(db, "userTokens", user.uid);
      const suspectToken = "BKG3AGuGG29VYQc4WzjtGnDespL8rW8z6cobGPiml473TcdW9TLPINIHgBe3zzLfh3GzjF_S_64gDjqNKtxTESw";
      
      // Remove the invalid token
      const updatedTokens = savedTokens.filter(t => t !== suspectToken);
      await setDoc(userTokensRef, { tokens: updatedTokens }, { merge: true });
      
      setSavedTokens(updatedTokens);
      setHasInvalidToken(false);
      
      toast({
        title: "Success",
        description: "Invalid token removed successfully",
      });
    } catch (err: any) {
      console.error("Error removing invalid token:", err);
      toast({
        title: "Error",
        description: `Failed to remove invalid token: ${err.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const debugCurrentToken = () => {
    if (token) {
      debugToken(token);
      toast({
        title: "Debug Info",
        description: "Token debug information sent to console",
      });
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>FCM Token Management</CardTitle>
        <CardDescription>
          Manage your Firebase Cloud Messaging tokens for push notifications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="request">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="request">Request Token</TabsTrigger>
            <TabsTrigger value="manage">Manage Tokens</TabsTrigger>
          </TabsList>
          
          <TabsContent value="request" className="space-y-4 pt-4">
            <Button
              onClick={getAndSaveToken}
              disabled={loading || !user}
              className="w-full"
            >
              {loading ? "Processing..." : "Request & Save FCM Token"}
            </Button>

            {token && (
              <div className="mt-4 space-y-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-200 rounded-md">
                  <h3 className="font-medium">Your FCM Token:</h3>
                  <p className="text-xs break-all mt-2">{token}</p>
                </div>
                
                <Button 
                  onClick={debugCurrentToken}
                  variant="outline"
                  className="w-full"
                >
                  Debug This Token
                </Button>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="manage" className="space-y-4 pt-4">
            {loadingTokens ? (
              <div className="text-center py-4">Loading your tokens...</div>
            ) : savedTokens.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No FCM tokens found for your account
              </div>
            ) : (
              <div className="space-y-2">
                <h3 className="font-medium">Your Saved Tokens: ({savedTokens.length})</h3>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {savedTokens.map((t, i) => (
                    <div key={i} className="p-2 border rounded-md text-xs break-all">
                      {t === "BKG3AGuGG29VYQc4WzjtGnDespL8rW8z6cobGPiml473TcdW9TLPINIHgBe3zzLfh3GzjF_S_64gDjqNKtxTESw" ? (
                        <div className="text-red-600 font-bold">
                          {t} (SUSPECTED INVALID)
                        </div>
                      ) : (
                        t
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {hasInvalidToken && (
              <Button
                onClick={removeInvalidToken}
                variant="destructive"
                disabled={loading}
                className="w-full"
              >
                {loading ? "Processing..." : "Remove Invalid Token"}
              </Button>
            )}
          </TabsContent>
        </Tabs>

        {!user && (
          <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-200 rounded-md">
            <p>Please log in to manage notification tokens.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
