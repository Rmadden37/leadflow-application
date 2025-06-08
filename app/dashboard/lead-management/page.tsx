"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import ComprehensiveLeadCleanup from "@/components/dashboard/comprehensive-lead-cleanup";
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
      <div className="flex min-h-[300px] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!user || user.role !== "manager") {
    return (
      <div className="container py-10">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground">
              Access restricted. Manager permissions required.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container max-w-md py-10">
      <h1 className="text-2xl font-bold mb-6 text-center">Lead Management</h1>
      
      <div className="grid gap-6">
        <Suspense fallback={<Loader2 className="h-6 w-6 animate-spin mx-auto" />}>
          <ComprehensiveLeadCleanup />
        </Suspense>
      </div>
    </div>
  );
}
