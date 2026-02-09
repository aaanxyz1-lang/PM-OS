'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Workflow {
  id: string;
  name: string;
  description?: string;
}

interface BulkAttachWorkflowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  selectedLeadIds: string[];
  onSuccess: () => void;
}

export function BulkAttachWorkflowDialog({
  open,
  onOpenChange,
  workspaceId,
  selectedLeadIds,
  onSuccess,
}: BulkAttachWorkflowDialogProps) {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState('');
  const [restartIfExists, setRestartIfExists] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      loadWorkflows();
    }
  }, [open, workspaceId]);

  const loadWorkflows = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/workflows?workspace_id=${workspaceId}`);
      if (res.ok) {
        setWorkflows(await res.json());
      }
    } catch {
      toast.error('Failed to load workflows');
    } finally {
      setLoading(false);
    }
  };

  const handleAttach = async () => {
    if (!selectedWorkflowId) {
      toast.error('Please select a workflow');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/automation/attach-workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspaceId,
          lead_ids: selectedLeadIds,
          workflow_id: selectedWorkflowId,
          restartIfExists,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(
          `Workflow attached to ${data.summary.attachedLeads} lead(s). Created ${data.summary.jobsCreated} automation job(s).`
        );
        onSuccess();
        onOpenChange(false);
        setSelectedWorkflowId('');
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to attach workflow');
      }
    } catch {
      toast.error('Failed to attach workflow');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Attach Automation Workflow</DialogTitle>
          <DialogDescription>
            Attach a workflow to {selectedLeadIds.length} selected lead(s)
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : workflows.length === 0 ? (
          <Alert>
            <AlertDescription>
              No workflows available. Create a workflow first.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="workflow">Select Workflow</Label>
              <Select value={selectedWorkflowId} onValueChange={setSelectedWorkflowId}>
                <SelectTrigger id="workflow">
                  <SelectValue placeholder="Choose workflow..." />
                </SelectTrigger>
                <SelectContent>
                  {workflows.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      <div>
                        <div className="font-medium">{w.name}</div>
                        {w.description && (
                          <div className="text-xs text-slate-500">{w.description}</div>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={restartIfExists}
                  onChange={(e) => setRestartIfExists(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-slate-600">
                  Restart if workflow already attached
                </span>
              </label>
            </div>
          </div>
        )}

        <DialogFooter className="mt-6">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAttach}
            disabled={submitting || !selectedWorkflowId || workflows.length === 0}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Attach Workflow
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
