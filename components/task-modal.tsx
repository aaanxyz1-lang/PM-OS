'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, Trash2, CheckCircle2, ExternalLink } from 'lucide-react';
import { useWorkspace } from '@/lib/workspace-context';
import { SELECT_UNASSIGNED, normalizeSelectValue, denormalizeSelectValue } from '@/lib/select-utils';
import { toast } from 'sonner';
import Link from 'next/link';

interface TaskModalProps {
  taskId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
  onDelete?: () => void;
  leadId?: string;
  leadName?: string;
}

export function TaskModal({
  taskId,
  open,
  onOpenChange,
  onUpdate,
  onDelete,
  leadId,
  leadName,
}: TaskModalProps) {
  const { currentWorkspace, employees } = useWorkspace();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [task, setTask] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'GENERAL',
    status: 'TODO',
    priority: 'MEDIUM',
    assigned_to_user_id: null as string | null,
    due_at: '',
  });

  useEffect(() => {
    if (open && taskId && currentWorkspace) {
      setIsCreating(false);
      loadTask();
    } else if (open && !taskId) {
      setIsCreating(true);
      setTask(null);
      setFormData({
        title: '',
        description: '',
        type: leadId ? 'LEAD_FOLLOWUP' : 'GENERAL',
        status: 'TODO',
        priority: 'MEDIUM',
        assigned_to_user_id: null,
        due_at: '',
      });
    }
  }, [open, taskId, currentWorkspace, leadId]);

  const loadTask = async () => {
    if (!taskId || !currentWorkspace) return;
    setLoading(true);

    try {
      const res = await fetch(
        `/api/tasks/${taskId}?workspace_id=${currentWorkspace.id}`
      );

      if (res.ok) {
        const taskData = await res.json();
        setTask(taskData);
        setFormData({
          title: taskData.title || '',
          description: taskData.description || '',
          type: taskData.type || 'GENERAL',
          status: taskData.status || 'TODO',
          priority: taskData.priority || 'MEDIUM',
          assigned_to_user_id: taskData.assigned_to_user_id || null,
          due_at: taskData.due_at
            ? new Date(taskData.due_at).toISOString().slice(0, 16)
            : '',
        });
      }
    } catch (error) {
      console.error('Failed to load task:', error);
      toast.error('Failed to load task details');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !currentWorkspace) return;
    setSaving(true);

    try {
      if (isCreating) {
        const res = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspace_id: currentWorkspace.id,
            ...formData,
            lead_id: leadId || null,
            due_at: formData.due_at ? new Date(formData.due_at).toISOString() : null,
          }),
        });

        if (res.ok) {
          toast.success('Task created');
          onOpenChange(false);
          onUpdate?.();
        } else {
          toast.error('Failed to create task');
        }
      } else {
        const res = await fetch(`/api/tasks/${taskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspace_id: currentWorkspace.id,
            ...formData,
            due_at: formData.due_at ? new Date(formData.due_at).toISOString() : null,
          }),
        });

        if (res.ok) {
          toast.success('Task updated');
          onOpenChange(false);
          onUpdate?.();
        } else {
          toast.error('Failed to update task');
        }
      }
    } catch (error) {
      toast.error(isCreating ? 'Failed to create task' : 'Failed to update task');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!taskId || !currentWorkspace) return;
    setSaving(true);

    try {
      const res = await fetch(
        `/api/tasks/${taskId}?workspace_id=${currentWorkspace.id}`,
        { method: 'DELETE' }
      );

      if (res.ok) {
        toast.success('Task deleted');
        onOpenChange(false);
        onDelete?.();
      } else {
        toast.error('Failed to delete task');
      }
    } catch (error) {
      toast.error('Failed to delete task');
    } finally {
      setSaving(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleMarkDone = async () => {
    if (!taskId || !currentWorkspace) return;
    setSaving(true);

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: currentWorkspace.id,
          status: 'DONE',
        }),
      });

      if (res.ok) {
        toast.success('Task marked as done');
        onOpenChange(false);
        onUpdate?.();
      } else {
        toast.error('Failed to update task');
      }
    } catch (error) {
      toast.error('Failed to update task');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isCreating
                ? leadName
                  ? `Create Task for ${leadName}`
                  : 'Create Task'
                : 'Task Details'}
            </DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="Task title..."
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Optional description..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(v) => setFormData({ ...formData, type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GENERAL">General</SelectItem>
                      <SelectItem value="LEAD_FOLLOWUP">Lead Follow-up</SelectItem>
                      <SelectItem value="OPS">Operations</SelectItem>
                      <SelectItem value="CONTENT">Content</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(v) => setFormData({ ...formData, status: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TODO">To Do</SelectItem>
                      <SelectItem value="DOING">Doing</SelectItem>
                      <SelectItem value="DONE">Done</SelectItem>
                      <SelectItem value="BLOCKED">Blocked</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(v) => setFormData({ ...formData, priority: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Assign To</Label>
                <Select
                  value={denormalizeSelectValue(formData.assigned_to_user_id)}
                  onValueChange={(v) =>
                    setFormData({
                      ...formData,
                      assigned_to_user_id: normalizeSelectValue(v),
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SELECT_UNASSIGNED}>Unassigned</SelectItem>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Due Date & Time</Label>
                <Input
                  type="datetime-local"
                  value={formData.due_at}
                  onChange={(e) =>
                    setFormData({ ...formData, due_at: e.target.value })
                  }
                />
              </div>

              {task?.lead && (
                <div className="p-3 bg-slate-50 rounded-lg border">
                  <Label className="text-xs text-muted-foreground">Related Lead</Label>
                  <Link
                    href={`/app/leads/${task.lead.id}`}
                    className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:underline mt-1"
                  >
                    {task.lead.name}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleSave}
                  disabled={!formData.title.trim() || saving}
                  className="flex-1"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {isCreating ? 'Create Task' : 'Save Changes'}
                </Button>

                {!isCreating && formData.status !== 'DONE' && (
                  <Button
                    onClick={handleMarkDone}
                    disabled={saving}
                    variant="outline"
                    className="gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Done
                  </Button>
                )}

                {!isCreating && (
                  <Button
                    onClick={() => setDeleteDialogOpen(true)}
                    disabled={saving}
                    variant="destructive"
                    size="icon"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this task? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
