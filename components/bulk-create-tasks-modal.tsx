'use client';

import { useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface BulkCreateTasksModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedLeadIds: string[];
  employees: any[];
  workspaceId?: string;
  onSuccess?: () => void;
}

export function BulkCreateTasksModal({
  open,
  onOpenChange,
  selectedLeadIds,
  employees,
  workspaceId,
  onSuccess,
}: BulkCreateTasksModalProps) {
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [dueRule, setDueRule] = useState('today');
  const [customDate, setCustomDate] = useState('');
  const [assigneeRule, setAssigneeRule] = useState('lead_owner');
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!taskTitle.trim() || !workspaceId) return;

    if (dueRule === 'custom' && !customDate) {
      toast.error('Please select a custom date');
      return;
    }

    if (assigneeRule === 'selected' && !selectedAssignee) {
      toast.error('Please select an assignee');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/leads/bulk-create-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspaceId,
          lead_ids: selectedLeadIds,
          title: taskTitle,
          description: taskDescription || null,
          due_rule: dueRule,
          custom_due_date: customDate ? new Date(customDate).toISOString() : null,
          assignee_rule: assigneeRule,
          assigned_to_user_id: selectedAssignee || null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`Created ${data.created} follow-up tasks`);
        onOpenChange(false);
        setTaskTitle('');
        setTaskDescription('');
        setDueRule('today');
        setCustomDate('');
        setAssigneeRule('lead_owner');
        setSelectedAssignee('');
        onSuccess?.();
      } else {
        toast.error('Failed to create tasks');
      }
    } catch (error) {
      toast.error('Failed to create tasks');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk Create Follow-up Tasks</DialogTitle>
          <DialogDescription>
            Create follow-up tasks for {selectedLeadIds.length} lead{selectedLeadIds.length !== 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Task Title</Label>
            <Input
              placeholder="e.g., Follow up with client..."
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Textarea
              placeholder="Task details..."
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Due Date Rule</Label>
            <Select value={dueRule} onValueChange={setDueRule}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="1">+1 Day</SelectItem>
                <SelectItem value="3">+3 Days</SelectItem>
                <SelectItem value="7">+7 Days</SelectItem>
                <SelectItem value="custom">Custom Date</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {dueRule === 'custom' && (
            <div className="space-y-2">
              <Label>Custom Date</Label>
              <Input
                type="datetime-local"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Assign To</Label>
            <Select value={assigneeRule} onValueChange={setAssigneeRule}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lead_owner">Lead Owner</SelectItem>
                <SelectItem value="selected">Specific Employee</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {assigneeRule === 'selected' && (
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee..." />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!taskTitle.trim() || loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Create Tasks
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
