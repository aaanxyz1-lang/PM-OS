'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface LoopTemplate {
  id: string;
  name: string;
  description: string | null;
}

interface BulkAttachLoopDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadIds: string[];
  workspaceId: string | undefined;
  onSuccess?: () => void;
}

export function BulkAttachLoopDialog({
  open,
  onOpenChange,
  leadIds,
  workspaceId,
  onSuccess,
}: BulkAttachLoopDialogProps) {
  const [loops, setLoops] = useState<LoopTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedLoopId, setSelectedLoopId] = useState('');

  useEffect(() => {
    if (!open || !workspaceId) return;

    const loadLoops = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/lead-loops?workspace_id=${workspaceId}`
        );
        if (!res.ok) throw new Error('Failed to load loops');
        setLoops(await res.json());
      } catch (e) {
        console.error('Load loops error:', e);
        toast.error('Failed to load loops');
      } finally {
        setLoading(false);
      }
    };

    loadLoops();
  }, [open, workspaceId]);

  const handleAttach = async () => {
    if (!selectedLoopId) {
      toast.error('Please select a loop');
      return;
    }

    setSaving(true);
    let successCount = 0;
    let errorCount = 0;

    for (const leadId of leadIds) {
      try {
        const res = await fetch(`/api/leads/${leadId}/attach-loop`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            loop_template_id: selectedLoopId,
            workspace_id: workspaceId,
          }),
        });

        if (res.ok) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch (e) {
        errorCount++;
      }
    }

    setSaving(false);

    if (successCount > 0) {
      toast.success(`Loop attached to ${successCount} lead${successCount !== 1 ? 's' : ''}`);
      onOpenChange(false);
      onSuccess?.();
    }

    if (errorCount > 0) {
      toast.error(`Failed to attach to ${errorCount} lead${errorCount !== 1 ? 's' : ''}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Attach Loop to {leadIds.length} Lead{leadIds.length !== 1 ? 's' : ''}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="loop-select">Select Loop Template</Label>
            {loading ? (
              <div className="flex items-center justify-center h-10">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : loops.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No loops available. Create one first.
              </p>
            ) : (
              <Select value={selectedLoopId} onValueChange={setSelectedLoopId}>
                <SelectTrigger id="loop-select">
                  <SelectValue placeholder="Choose a loop..." />
                </SelectTrigger>
                <SelectContent>
                  {loops.map((loop) => (
                    <SelectItem key={loop.id} value={loop.id}>
                      {loop.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAttach}
            disabled={saving || !selectedLoopId || loops.length === 0}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Attach Loop'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
