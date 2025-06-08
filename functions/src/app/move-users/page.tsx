"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { db, auth } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { signInWithEmailAndPassword } from "firebase/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, ArrowRight, AlertCircle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UserData {
  uid: string;
  email?: string;
  displayName?: string;
  role?: string;
  teamId?: string;
}

export default function MoveUsersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<string>("");
  const [targetUsers, setTargetUsers] = useState<UserData[]>([]);
  const [ryanTeamId, setRyanTeamId] = useState<string>("");

  const findUsers = async () => {
    if (!user) {
      setResults("❌ Please sign in first");
      return;
    }

    setLoading(true);
    setResults("🔍 Finding users...\n");

    try {
      // Get all users
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const allUsers: UserData[] = [];
      
      usersSnapshot.forEach(doc => {
        allUsers.push({
          uid: doc.id,
          ...doc.data()
        });
      });

      // Find Ryan Madden
      const ryanUser = allUsers.find(userData => 
        userData.email?.includes('ryan.madden') || 
        (userData.displayName || '').toLowerCase().includes('ryan madden')
      );

      if (!ryanUser) {
        setResults(prev => prev + "❌ Ryan Madden not found\n");
        return;
      }

      setRyanTeamId(ryanUser.teamId || "");
      setResults(prev => prev + `✅ Found Ryan Madden on team: ${ryanUser.teamId}\n\n`);

      // Find target users
      const targetNames = ['Sebastian', 'Andrea', 'Joshua'];
      const foundUsers = allUsers.filter(userData => {
        const displayName = userData.displayName || '';
        const email = userData.email || '';
        
        return targetNames.some(name => 
          displayName.toLowerCase().includes(name.toLowerCase()) ||
          email.toLowerCase().includes(name.toLowerCase())
        );
      });

      setTargetUsers(foundUsers);
      setResults(prev => prev + `🎯 Found ${foundUsers.length} target users:\n`);
      
      foundUsers.forEach(userData => {
        const onSameTeam = userData.teamId === ryanUser.teamId;
        setResults(prev => prev + `  - ${userData.displayName || userData.email}\n`);
        setResults(prev => prev + `    Current team: ${userData.teamId}\n`);
        setResults(prev => prev + `    Status: ${onSameTeam ? '✅ Already on Ryan\'s team' : '⚠️  Different team'}\n\n`);
      });

    } catch (error) {
      setResults(prev => prev + `❌ Error: ${error}\n`);
    } finally {
      setLoading(false);
    }
  };

  const moveUsers = async () => {
    if (!user || user.role !== "manager") {
      toast({
        title: "Unauthorized",
        description: "Only managers can move users between teams.",
        variant: "destructive"
      });
      return;
    }

    if (!ryanTeamId) {
      toast({
        title: "Error",
        description: "Please find users first to determine Ryan's team.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    setResults(prev => prev + "\n🔄 Moving users to Ryan's team...\n");

    try {
      let movedCount = 0;

      for (const userData of targetUsers) {
        if (userData.teamId === ryanTeamId) {
          setResults(prev => prev + `✅ ${userData.displayName || userData.email} already on Ryan's team\n`);
          continue;
        }

        setResults(prev => prev + `🔄 Moving ${userData.displayName || userData.email}...\n`);

        // Update user document
        const userRef = doc(db, 'users', userData.uid);
        await updateDoc(userRef, {
          teamId: ryanTeamId,
          updatedAt: new Date()
        });

        // Check if they have a closer record and update it too
        try {
          const closersSnapshot = await getDocs(collection(db, 'closers'));
          const closerDoc = closersSnapshot.docs.find(docSnapshot => docSnapshot.id === userData.uid);
          
          if (closerDoc) {
            setResults(prev => prev + `  🚪 Updating closer record...\n`);
            const closerRef = doc(db, 'closers', userData.uid);
            await updateDoc(closerRef, {
              teamId: ryanTeamId,
              updatedAt: new Date()
            });
          }
        } catch (closerError) {
          setResults(prev => prev + `  ⚠️  Could not update closer record: ${closerError}\n`);
        }

        setResults(prev => prev + `✅ Moved ${userData.displayName || userData.email}\n`);
        movedCount++;
      }

      setResults(prev => prev + `\n🎉 Successfully moved ${movedCount} users to Ryan's team!\n`);
      
      toast({
        title: "Success",
        description: `Moved ${movedCount} users to Ryan's team. They should now be visible in the closer management interface.`,
      });

    } catch (error) {
      setResults(prev => prev + `❌ Error moving users: ${error}\n`);
      toast({
        title: "Error",
        description: "Failed to move some users. Check the results for details.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    try {
      await signInWithEmailAndPassword(auth, "ryan.madden@test.com", "test123");
      toast({
        title: "Success",
        description: "Signed in as Ryan Madden"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to sign in: ${error}`,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-6 w-6" />
            Move Users to Ryan's Team
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {!user ? (
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-2 text-amber-600">
                <AlertCircle className="h-5 w-5" />
                <span>You need to be signed in as a manager to move users</span>
              </div>
              <Button onClick={handleSignIn}>
                Sign in as Ryan Madden
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <Badge variant="outline">
                    Signed in as: {user.displayName || user.email}
                  </Badge>
                  <Badge variant="outline" className="ml-2">
                    Role: {user.role}
                  </Badge>
                  {user.role !== "manager" && (
                    <Badge variant="destructive" className="ml-2">
                      Manager role required
                    </Badge>
                  )}
                </div>
                <div className="space-x-2">
                  <Button onClick={findUsers} disabled={loading} variant="outline">
                    {loading ? "Finding..." : "Find Users"}
                  </Button>
                  <Button 
                    onClick={moveUsers} 
                    disabled={loading || targetUsers.length === 0 || user.role !== "manager"}
                  >
                    {loading ? "Moving..." : "Move Users"}
                  </Button>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <ArrowRight className="h-4 w-4" />
                  What this will do:
                </h3>
                <ul className="text-sm space-y-1">
                  <li>• Find Sebastian Vizcarrondo, Andrea Rovayo, and Joshua Long</li>
                  <li>• Move them to Ryan Madden's team</li>
                  <li>• Update both user and closer records</li>
                  <li>• Make them visible in the closer management interface</li>
                </ul>
              </div>

              {results && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Results</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="whitespace-pre-wrap text-sm font-mono bg-gray-50 dark:bg-gray-900 p-4 rounded-md overflow-auto max-h-96">
                      {results}
                    </pre>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
