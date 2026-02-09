'use client';

import { Card, CardContent } from '@/components/ui/card';
import { BreadcrumbNav } from '@/components/breadcrumb-nav';
import { Image } from 'lucide-react';

export default function ContentAssetsPage() {
  return (
    <div className="p-4 lg:p-8">
      <div className="space-y-6">
        <div>
          <BreadcrumbNav
            items={[
              { label: 'Content', href: '/app/content/tasks' },
              { label: 'Assets' },
            ]}
          />
          <h1 className="text-3xl font-bold tracking-tight">Asset Library</h1>
          <p className="text-muted-foreground mt-1">Manage and organize your content assets</p>
        </div>

        <Card>
          <CardContent className="py-20">
            <div className="flex flex-col items-center text-center">
              <Image className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <p className="font-medium text-lg text-slate-700">Asset Library</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Upload and manage images, videos, and other content assets for your campaigns
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
