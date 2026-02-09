'use client';

import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Clock, Zap, ListTodo, User, Mail } from 'lucide-react';

interface OurRecordCardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  summary: any;
  onOpenLead: (leadId: string) => void;
  onContinueExisting: (leadId: string) => void;
  onCreateNewAnyway: (reason: string) => void;
}

export function OurRecordCard({
  open,
  onOpenChange,
  summary,
  onOpenLead,
  onContinueExisting,
  onCreateNewAnyway,
}: OurRecordCardProps) {
  const [showOverrideDialog, setShowOverrideDialog] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');

  const handleCreateNewAnyway = () => {
    if (!overrideReason) return;
    onCreateNewAnyway(overrideReason);
    setShowOverrideDialog(false);
    setOverrideReason('');
    onOpenChange(false);
  };

  if (!summary) return null;

  const mostRecent = summary.mostRecent;
  const tagNames = summary.mostRecent?.tags?.map((t: any) => t.tag?.name).filter(Boolean) || [];

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full max-w-md">
          <SheetHeader>
            <SheetTitle>Our Record</SheetTitle>
            <SheetDescription>
              Found {summary.count} lead{summary.count !== 1 ? 's' : ''} with this phone number
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-120px)] pr-4">
            <div className="space-y-6 py-6">
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">{mostRecent.name}</h3>
                    {mostRecent.businessName && (
                      <p className="text-sm text-muted-foreground">{mostRecent.businessName}</p>
                    )}
                  </div>
                  {summary.count > 1 && (
                    <Badge variant="secondary">{summary.count} records</Badge>
                  )}
                </div>

                <div className="space-y-1 text-sm">
                  {mostRecent.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      {mostRecent.email}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="h-4 w-4" />
                    {mostRecent.assignedUser?.name || 'Unassigned'}
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="font-semibold text-sm">Status</h4>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline">{mostRecent.status || 'Unknown'}</Badge>
                  {mostRecent.qualifiedStatus && (
                    <Badge
                      variant={
                        mostRecent.qualifiedStatus === 'YES'
                          ? 'default'
                          : mostRecent.qualifiedStatus === 'NO'
                            ? 'destructive'
                            : 'secondary'
                      }
                    >
                      {mostRecent.qualifiedStatus === 'YES'
                        ? 'Qualified'
                        : mostRecent.qualifiedStatus === 'NO'
                          ? 'Not Qualified'
                          : 'Pending'}
                    </Badge>
                  )}
                </div>
              </div>

              {tagNames.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">Tags</h4>
                  <div className="flex flex-wrap gap-1">
                    {tagNames.map((tag: string) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {mostRecent.feedbackType && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Feedback</h4>
                  <p className="text-sm text-muted-foreground">{mostRecent.feedbackType.name}</p>
                </div>
              )}

              {summary.activeLoop && (
                <div className="space-y-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-blue-600" />
                    <h4 className="font-semibold text-sm text-blue-900">Active Loop</h4>
                  </div>
                  <p className="text-sm font-medium">{summary.activeLoop.loop?.name}</p>
                  {summary.activeLoop.current_step && (
                    <p className="text-xs text-blue-700">
                      Step: {summary.activeLoop.current_step}
                    </p>
                  )}
                  {summary.activeLoop.next_scheduled_at && (
                    <div className="flex items-center gap-1 text-xs text-blue-700">
                      <Clock className="h-3 w-3" />
                      Next: {new Date(summary.activeLoop.next_scheduled_at).toLocaleDateString()}
                    </div>
                  )}
                </div>
              )}

              {summary.openTasksCount > 0 && (
                <div className="space-y-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="flex items-center gap-2">
                    <ListTodo className="h-4 w-4 text-amber-600" />
                    <h4 className="font-semibold text-sm text-amber-900">
                      {summary.openTasksCount} Open Task{summary.openTasksCount !== 1 ? 's' : ''}
                    </h4>
                  </div>
                </div>
              )}

              {summary.recentActivities && summary.recentActivities.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Recent Activity</h4>
                  <div className="space-y-2">
                    {summary.recentActivities.map((activity: any) => (
                      <div key={activity.id} className="text-xs p-2 bg-slate-50 rounded border">
                        <p className="font-medium">{activity.type}</p>
                        {activity.note && <p className="text-muted-foreground">{activity.note}</p>}
                        <p className="text-muted-foreground text-xs mt-1">
                          {new Date(activity.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              <div className="space-y-2">
                <Button
                  onClick={() => onOpenLead(mostRecent.id)}
                  className="w-full"
                  variant="default"
                >
                  Open Lead Details
                </Button>
                <Button
                  onClick={() => onContinueExisting(mostRecent.id)}
                  className="w-full"
                  variant="outline"
                >
                  Continue Existing Lead
                </Button>
                <Button
                  onClick={() => setShowOverrideDialog(true)}
                  className="w-full"
                  variant="secondary"
                >
                  Create New Anyway
                </Button>
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <AlertDialog open={showOverrideDialog} onOpenChange={setShowOverrideDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Create New Lead</AlertDialogTitle>
            <AlertDialogDescription>
              A lead with this phone already exists. Please provide a reason for creating a new entry.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-4">
            <Select value={overrideReason} onValueChange={setOverrideReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new_inquiry">New inquiry for same customer</SelectItem>
                <SelectItem value="different_business">Different business</SelectItem>
                <SelectItem value="wrong_status">Wrong status recorded earlier</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCreateNewAnyway}
              disabled={!overrideReason}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Create New Lead
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
