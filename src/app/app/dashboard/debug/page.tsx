"use client";

import DebugInformation from "@/components/dashboard/debug-information";

export default function DebugPage() {
  return (
    <div className="container py-10">
      <h1 className="text-2xl font-bold mb-6">Debug Information</h1>
      <DebugInformation />
    </div>
  );
}
