'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock } from 'lucide-react';
import { useWorkspace } from '@/lib/workspace-context';

export default function SettingsPage() {
  const { currentWorkspace } = useWorkspace();

  return (
    <div className="p-4 lg:p-8">
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-1">Workspace configuration</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Workspace Details</CardTitle>
            <CardDescription>Basic information about your workspace</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Workspace Name</p>
              <p className="font-medium">{currentWorkspace?.name || '-'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Slug</p>
              <p className="font-mono text-sm text-muted-foreground">
                {currentWorkspace?.slug || '-'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Workspace ID</p>
              <p className="font-mono text-xs text-muted-foreground break-all">
                {currentWorkspace?.id || '-'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center text-center">
              <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <Lock className="h-6 w-6 text-slate-400" />
              </div>
              <p className="font-medium text-slate-700">
                Authentication & RBAC coming soon
              </p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Workspace editing, role management, and user invites will be available
                once authentication is implemented.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
