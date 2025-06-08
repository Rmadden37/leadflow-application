"use client";

import { Suspense } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import LeadReassignment from "@/components/dashboard/lead-reassignment";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";

export default function AdminToolsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  
  // Redirect non-managers away from this page
  useEffect(() => {
    if (!loading && user && user.role !== "manager") {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);
  
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!user || user.role !== "manager") {
    return (
      <div className="container py-10">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
            <h2 className="text-2xl font-bold mb-2">Access Restricted</h2>
            <p className="text-muted-foreground">
              You do not have permission to access this area.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container py-10">
      <h1 className="text-2xl font-bold mb-6">Admin Tools</h1>
      
      <div className="grid gap-6">
        <Suspense fallback={<Loader2 className="h-6 w-6 animate-spin mx-auto" />}>
          <LeadReassignment />
        </Suspense>
      </div>
    </div>
  );
}
