'use client';

import { Card, CardContent } from '@/components/ui/card';
import { BreadcrumbNav } from '@/components/breadcrumb-nav';
import { TrendingUp } from 'lucide-react';

export default function PipelinePage() {
  return (
    <div className="p-4 lg:p-8">
      <div className="space-y-6">
        <div>
          <BreadcrumbNav items={[{ label: 'Sales', href: '/app' }, { label: 'Pipeline' }]} />
          <h1 className="text-3xl font-bold tracking-tight">Pipeline</h1>
          <p className="text-muted-foreground mt-1">Kanban board view of your lead pipeline</p>
        </div>

        <Card>
          <CardContent className="py-20">
            <div className="flex flex-col items-center text-center">
              <TrendingUp className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <p className="font-medium text-lg text-slate-700">Pipeline Kanban Board</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Drag and drop leads across pipeline stages to manage your sales workflow
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
