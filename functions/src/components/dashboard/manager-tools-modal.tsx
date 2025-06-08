"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Settings, BarChart3, ClipboardList, Wrench, Building2, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import TeamUserManagement from "./team-user-management";
import LeadManagementSpreadsheet from "./lead-management-spreadsheet";
import FixTeamsButton from "./fix-teams-button";
import AnalyticsDashboard from "./analytics-dashboard";
import InviteNewUserButton from "./invite-new-user-button";

interface ManagerToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ManagerToolsModal({
  isOpen,
  onClose,
}: ManagerToolsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto border-0 bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 shadow-2xl">
        <DialogHeader className="border-b border-slate-200 dark:border-slate-700 pb-4">
          <DialogTitle className="flex items-center text-2xl font-bold font-headline text-foreground">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-slate-600 to-slate-700 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center mr-3 shadow-md">
              <Settings className="h-5 w-5 text-white" />
            </div>
            Manager Tools
          </DialogTitle>
        </DialogHeader>
          
          <Tabs defaultValue="team-management" className="w-full mt-6">
            <TabsList className="grid w-full grid-cols-4 bg-slate-100 dark:bg-slate-800 rounded-lg p-1 shadow-inner">
              <TabsTrigger 
                value="team-management" 
                className="flex items-center data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-md rounded-md transition-all duration-200"
              >
                <Users className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Team Management</span>
                <span className="sm:hidden">Team</span>
              </TabsTrigger>
              <TabsTrigger 
                value="lead-management" 
                className="flex items-center data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-md rounded-md transition-all duration-200"
              >
                <ClipboardList className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Lead Management</span>
                <span className="sm:hidden">Leads</span>
              </TabsTrigger>
              <TabsTrigger 
                value="analytics" 
                className="flex items-center data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-md rounded-md transition-all duration-200"
              >
                <BarChart3 className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Analytics</span>
                <span className="sm:hidden">Analytics</span>
              </TabsTrigger>
              <TabsTrigger 
                value="system-tools" 
                className="flex items-center data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-md rounded-md transition-all duration-200"
              >
                <Wrench className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">System Tools</span>
                <span className="sm:hidden">Tools</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="team-management" className="mt-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Team Management</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Manage team members and send invitations</p>
                </div>
                <InviteNewUserButton 
                  variant="default" 
                  size="sm"
                  className="shadow-sm"
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-medium flex items-center gap-2 text-foreground">
                    <Users className="h-4 w-4" />
                    Current Team
                  </h4>
                  <Badge variant="secondary" className="text-xs">
                    Team Management
                  </Badge>
                </div>

                {/* Team selector card - simplified */}
                <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h5 className="font-medium text-foreground">Empire</h5>
                          <p className="text-sm text-slate-600 dark:text-slate-400">Elite sales team for enterprise-level opportunities</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">Manager</Badge>
                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                          Switch Team
                          <ChevronDown className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Team members section */}
                <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
                  <CardContent className="p-4">
                    <TeamUserManagement />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="lead-management" className="mt-6">
              <LeadManagementSpreadsheet />
            </TabsContent>
            
            <TabsContent value="analytics" className="mt-6">
              <AnalyticsDashboard />
            </TabsContent>
            
            <TabsContent value="system-tools" className="mt-6">
              <div className="space-y-6">
                <FixTeamsButton />
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    );
  }
