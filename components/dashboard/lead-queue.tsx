"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function LeadQueue() {
  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle>Lead Queue</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="queue" className="w-full">
          <TabsList>
            <TabsTrigger value="queue">Queue</TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
          </TabsList>
          <TabsContent value="queue">
            <div className="py-2">
              <div className="text-sm text-muted-foreground">
                No leads in queue at the moment.
              </div>
            </div>
          </TabsContent>
          <TabsContent value="scheduled">
            <div className="py-2">
              <div className="text-sm text-muted-foreground">
                No scheduled leads at the moment.
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
