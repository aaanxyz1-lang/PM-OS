'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface BulkAttachLoopModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedLeadIds: string[];
  workspaceId?: string;
  onSuccess?: () => void;
}

interface LeadLoop {
  id: string;
  name: string;
  description?: string;
}

export function BulkAttachLoopModal({
  open,
  onOpenChange,
  selectedLeadIds,
  workspaceId,
  onSuccess,
}: BulkAttachLoopModalProps) {
  const [selectedLoop, setSelectedLoop] = useState('');
  const [loops, setLoops] = useState<LeadLoop[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingLoops, setLoadingLoops] = useState(false);

  useEffect(() => {
    if (open && workspaceId) {
      loadLoops();
    }
  }, [open, workspaceId]);

  const loadLoops = async () => {
    if (!workspaceId) return;
    setLoadingLoops(true);

    try {
      const res = await fetch(`/api/lead-loops?workspace_id=${workspaceId}`);
      if (res.ok) {
        setLoops(await res.json());
      }
    } catch (error) {
      console.error('Failed to load loops:', error);
    } finally {
      setLoadingLoops(false);
    }
  };

  const handleAttach = async () => {
    if (!selectedLoop || !workspaceId) return;
    setLoading(true);

    try {
      const res = await fetch('/api/leads/bulk-attach-loop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspaceId,
          lead_ids: selectedLeadIds,
          lead_loop_id: selectedLoop,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`Attached loop to ${data.updated} leads`);
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error('Failed to attach loop');
      }
    } catch (error) {
      toast.error('Failed to attach loop');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk Attach Lead Loop</DialogTitle>
          <DialogDescription>
            Attach a lead loop to {selectedLeadIds.length} lead{selectedLeadIds.length !== 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Lead Loop</Label>
            <Select value={selectedLoop} onValueChange={setSelectedLoop} disabled={loadingLoops}>
              <SelectTrigger>
                <SelectValue placeholder="Select loop..." />
              </SelectTrigger>
              <SelectContent>
                {loops.map((loop) => (
                  <SelectItem key={loop.id} value={loop.id}>
                    {loop.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleAttach} disabled={!selectedLoop || loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Attach
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
