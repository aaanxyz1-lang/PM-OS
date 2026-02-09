'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { BreadcrumbNav } from '@/components/breadcrumb-nav';
import { useWorkspace } from '@/lib/workspace-context';
import { toast } from 'sonner';
import { Loader2, Play, FileText, Clock, CheckCircle2 } from 'lucide-react';

interface WorkflowRun {
  id: string;
  workflow_id: string;
  workflow_name: string;
  status: string;
  created_tasks_count: number;
  created_at: string;
  updated_at: string;
}

interface WorkflowRunDetails extends WorkflowRun {
  created_tasks: Array<{
    id: string;
    title: string;
    type: string;
    status: string;
    due_at: string | null;
  }>;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  RUNNING: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  FAILED: 'bg-red-100 text-red-700',
};

const TASK_STATUS_COLORS: Record<string, string> = {
  TODO: 'bg-slate-100 text-slate-700',
  DOING: 'bg-blue-100 text-blue-700',
  DONE: 'bg-emerald-100 text-emerald-700',
  BLOCKED: 'bg-red-100 text-red-700',
};

export default function WorkflowRunsPage() {
  const { currentWorkspace, loading: wsLoading } = useWorkspace();
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRun, setSelectedRun] = useState<WorkflowRunDetails | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const loadRuns = async () => {
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
      const workflows = await res.json();
      setRuns(workflows.map((w: any) => ({
        id: w.id,
        workflow_id: w.id,
        workflow_name: w.name,
        status: 'COMPLETED',
        created_tasks_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })));
    } catch (e) {
      console.error('Workflows fetch error:', e);
      toast.error('Failed to load workflows');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!wsLoading) loadRuns();
  }, [currentWorkspace?.id, wsLoading]);

  const handleViewDetails = async (run: WorkflowRun) => {
    setDetailsLoading(true);
    try {
      const res = await fetch(`/api/workflows/${run.workflow_id}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('Workflow details GET failed:', res.status, err);
        toast.error(err.error || 'Failed to load details');
        return;
      }
      const workflow = await res.json();
      const tasksRes = await fetch(
        `/api/workflows/${run.workflow_id}/runs?workspace_id=${currentWorkspace?.id}`
      );
      const tasks = tasksRes.ok ? await tasksRes.json() : [];

      setSelectedRun({
        ...run,
        created_tasks: Array.isArray(tasks) ? tasks : [],
      });
      setDetailsOpen(true);
    } catch (e) {
      console.error('Error loading details:', e);
      toast.error('Failed to load workflow details');
    } finally {
      setDetailsLoading(false);
    }
  };

  return (
    <div className="p-4 lg:p-8">
      <div className="space-y-6">
        <div>
          <BreadcrumbNav
            items={[
              { label: 'Automation', href: '/app/workflows' },
              { label: 'Workflow Runs' },
            ]}
          />
          <h1 className="text-3xl font-bold tracking-tight">Workflow Runs</h1>
          <p className="text-muted-foreground mt-1">
            Track the execution history of your automation workflows
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : runs.length === 0 ? (
          <Card className="bg-slate-50/50 border-slate-200">
            <CardContent className="pt-6 text-center">
              <Play className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 font-medium">No workflow runs yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Run a workflow to see execution history
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {runs.map((run) => (
              <Card key={run.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{run.workflow_name}</h3>
                        <Badge className={`${STATUS_COLORS[run.status]}`}>
                          {run.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-6 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {new Date(run.created_at).toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="h-4 w-4" />
                          {run.created_tasks_count} tasks created
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => handleViewDetails(run)}
                      disabled={detailsLoading}
                    >
                      {detailsLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'View Details'
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedRun?.workflow_name} - Run Details</DialogTitle>
            </DialogHeader>
            {selectedRun && (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Status</p>
                    <Badge className={`${STATUS_COLORS[selectedRun.status]}`}>
                      {selectedRun.status}
                    </Badge>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Executed At</p>
                    <p className="font-medium text-sm">
                      {new Date(selectedRun.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Tasks Created</p>
                    <p className="font-medium text-lg">{selectedRun.created_tasks_count}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Created Tasks</h4>
                  {selectedRun.created_tasks && selectedRun.created_tasks.length > 0 ? (
                    <div className="space-y-2">
                      {selectedRun.created_tasks.map((task) => (
                        <div
                          key={task.id}
                          className="p-3 bg-slate-50 rounded-lg border flex items-start justify-between"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-sm">{task.title}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Type: {task.type}
                            </p>
                            {task.due_at && (
                              <p className="text-xs text-muted-foreground">
                                Due: {new Date(task.due_at).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          <Badge className={`${TASK_STATUS_COLORS[task.status]} text-xs`}>
                            {task.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No tasks were created by this workflow run
                    </p>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
