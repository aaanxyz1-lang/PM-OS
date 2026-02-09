'use client';

import { Card, CardContent } from '@/components/ui/card';
import { BreadcrumbNav } from '@/components/breadcrumb-nav';
import { FileText } from 'lucide-react';

export default function SOPPage() {
  return (
    <div className="p-4 lg:p-8">
      <div className="space-y-6">
        <div>
          <BreadcrumbNav items={[{ label: 'Operations', href: '/app/tasks' }, { label: 'SOP Runs' }]} />
          <h1 className="text-3xl font-bold tracking-tight">SOP Runs</h1>
          <p className="text-muted-foreground mt-1">Standard operating procedure execution history</p>
        </div>

        <Card>
          <CardContent className="py-20">
            <div className="flex flex-col items-center text-center">
              <FileText className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <p className="font-medium text-lg text-slate-700">SOP Runs History</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Track and view the history of standard operating procedure executions
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
