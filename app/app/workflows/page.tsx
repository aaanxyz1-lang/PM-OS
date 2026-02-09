'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Play,
  Settings2,
  Loader2,
  Zap,
  Clock,
  CalendarDays,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { useWorkspace } from '@/lib/workspace-context';
import { toast } from 'sonner';

interface Workflow {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  trigger_type: string;
  trigger_meta: any;
  step_count: number;
  last_run: { status: string; created_at: string } | null;
  created_at: string;
}

interface DebugCounts {
  workflows: number;
  tasks: number;
  steps: number;
}

const TRIGGER_ICONS: Record<string, typeof Zap> = {
  MANUAL: Play,
  DAILY: Clock,
  WEEKLY: CalendarDays,
  LEAD_STATUS_CHANGE: Zap,
};

const TRIGGER_LABELS: Record<string, string> = {
  MANUAL: 'Manual',
  DAILY: 'Daily',
  WEEKLY: 'Weekly',
  LEAD_STATUS_CHANGE: 'On Lead Change',
};

export default function WorkflowsPage() {
  const { currentWorkspace, loading: wsLoading } = useWorkspace();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [debugCounts, setDebugCounts] = useState<DebugCounts | null>(null);
  const [newWorkflow, setNewWorkflow] = useState({
    name: '',
    description: '',
    trigger_type: 'MANUAL',
  });

  const loadWorkflows = useCallback(async () => {
    if (!currentWorkspace) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/workflows?workspace_id=${currentWorkspace.id}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('Workflows GET failed:', res.status, err);
        toast.error(err.error || `Failed to load workflows (${res.status})`);
        return;
      }
      setWorkflows(await res.json());
    } catch (e) {
      console.error('Workflows fetch error:', e);
      toast.error('Failed to load workflows');
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace?.id]);

  const loadDebugCounts = useCallback(async () => {
    if (!currentWorkspace) return;
    try {
      const [wfRes, taskRes] = await Promise.all([
        fetch(`/api/workflows?workspace_id=${currentWorkspace.id}`),
        fetch(`/api/tasks?workspace_id=${currentWorkspace.id}`),
      ]);
      const wfData = wfRes.ok ? await wfRes.json() : [];
      const taskData = taskRes.ok ? await taskRes.json() : [];
      const totalSteps = wfData.reduce((acc: number, w: any) => acc + (w.step_count || 0), 0);
      setDebugCounts({
        workflows: wfData.length,
        tasks: taskData.length,
        steps: totalSteps,
      });
    } catch {
      // debug panel is non-critical
    }
  }, [currentWorkspace?.id]);

  useEffect(() => {
    if (!wsLoading) {
      loadWorkflows();
      loadDebugCounts();
    }
  }, [loadWorkflows, loadDebugCounts, wsLoading]);

  const handleToggleActive = async (wf: Workflow) => {
    try {
      const res = await fetch(`/api/workflows/${wf.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: currentWorkspace?.id, is_active: !wf.is_active }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('Toggle active failed:', res.status, err);
        toast.error(err.error || 'Failed to toggle workflow');
        return;
      }
      toast.success(wf.is_active ? 'Workflow deactivated' : 'Workflow activated');
      loadWorkflows();
    } catch (e) {
      console.error('Toggle active error:', e);
      toast.error('Failed to toggle workflow');
    }
  };

  const handleRun = async (wfId: string) => {
    setRunning(wfId);
    try {
      const res = await fetch(`/api/workflows/${wfId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: currentWorkspace?.id }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error('Run workflow failed:', res.status, result);
        toast.error(result.error || `Failed to run workflow (${res.status})`);
        return;
      }
      if (result.status === 'SUCCESS') {
        toast.success(
          `Workflow executed: ${result.tasks_created} tasks, ${result.leads_updated} leads updated, ${result.activities_added} activities`
        );
      } else {
        toast.error(`Workflow completed with errors: ${result.errors?.join(', ')}`);
      }
      loadWorkflows();
      loadDebugCounts();
    } catch (e) {
      console.error('Run workflow error:', e);
      toast.error('Failed to run workflow');
    } finally {
      setRunning(null);
    }
  };

  const handleCreate = async () => {
    if (!newWorkflow.name.trim() || !currentWorkspace) return;
    setSaving(true);
    try {
      const res = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: currentWorkspace.id,
          name: newWorkflow.name,
          description: newWorkflow.description || null,
          trigger_type: newWorkflow.trigger_type,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('Create workflow failed:', res.status, err);
        toast.error(err.error || `Failed to create workflow (${res.status})`);
        return;
      }
      toast.success('Workflow created');
      setCreateOpen(false);
      setNewWorkflow({ name: '', description: '', trigger_type: 'MANUAL' });
      loadWorkflows();
      loadDebugCounts();
    } catch (e) {
      console.error('Create workflow error:', e);
      toast.error('Failed to create workflow');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 lg:p-8">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Workflows</h1>
            <p className="text-muted-foreground mt-1">Automate repetitive tasks and processes</p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Workflow
          </Button>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Workflow</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={newWorkflow.name}
                  onChange={(e) => setNewWorkflow({ ...newWorkflow, name: e.target.value })}
                  placeholder="Workflow name..."
                  onKeyDown={(e) => { if (e.key === 'Enter' && newWorkflow.name.trim()) handleCreate(); }}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={newWorkflow.description}
                  onChange={(e) => setNewWorkflow({ ...newWorkflow, description: e.target.value })}
                  placeholder="What does this workflow do?"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Trigger Type</Label>
                <Select
                  value={newWorkflow.trigger_type}
                  onValueChange={(v) => setNewWorkflow({ ...newWorkflow, trigger_type: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MANUAL">Manual</SelectItem>
                    <SelectItem value="DAILY">Daily</SelectItem>
                    <SelectItem value="WEEKLY">Weekly</SelectItem>
                    <SelectItem value="LEAD_STATUS_CHANGE">On Lead Status Change</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={handleCreate} disabled={!newWorkflow.name.trim() || saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {saving ? 'Creating...' : 'Create Workflow'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {debugCounts && currentWorkspace && (
          <Card className="border-dashed border-slate-300 bg-slate-50/50">
            <CardContent className="py-3 px-4">
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span className="font-medium text-slate-500">Debug</span>
                <span>Workspace: <code className="bg-white px-1.5 py-0.5 rounded text-[10px]">{currentWorkspace.id.slice(0, 8)}...</code></span>
                <span>Workflows: <strong className="text-slate-700">{debugCounts.workflows}</strong></span>
                <span>Tasks: <strong className="text-slate-700">{debugCounts.tasks}</strong></span>
                <span>Steps: <strong className="text-slate-700">{debugCounts.steps}</strong></span>
              </div>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : workflows.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {workflows.map((wf) => {
              const TriggerIcon = TRIGGER_ICONS[wf.trigger_type] || Zap;
              return (
                <Card
                  key={wf.id}
                  className={`transition-all hover:shadow-md ${!wf.is_active ? 'opacity-60' : ''}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center">
                          <TriggerIcon className="h-4 w-4 text-slate-600" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{wf.name}</CardTitle>
                          <Badge variant="outline" className="mt-1 text-xs">
                            {TRIGGER_LABELS[wf.trigger_type]}
                          </Badge>
                        </div>
                      </div>
                      <Switch
                        checked={wf.is_active}
                        onCheckedChange={() => handleToggleActive(wf)}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {wf.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {wf.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{wf.step_count} step{wf.step_count !== 1 ? 's' : ''}</span>
                      {wf.last_run && (
                        <span className="flex items-center gap-1">
                          {wf.last_run.status === 'SUCCESS' ? (
                            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                          ) : (
                            <XCircle className="h-3 w-3 text-red-500" />
                          )}
                          Last run: {new Date(wf.last_run.created_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 gap-1.5"
                        onClick={() => handleRun(wf.id)}
                        disabled={running === wf.id || !wf.is_active}
                      >
                        {running === wf.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Play className="h-3.5 w-3.5" />
                        )}
                        Run Now
                      </Button>
                      <Link href={`/app/workflows/${wf.id}`} className="flex-1">
                        <Button size="sm" variant="outline" className="w-full gap-1.5">
                          <Settings2 className="h-3.5 w-3.5" />
                          Configure
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="py-16">
              <div className="flex flex-col items-center text-center">
                <Zap className="h-12 w-12 text-muted-foreground/40 mb-4" />
                <p className="font-medium text-lg text-slate-700">No workflows yet</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  Create your first workflow to automate tasks
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
