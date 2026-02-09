'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Plus,
  Play,
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
  ListOrdered,
  Zap,
  ClipboardList,
  ArrowUpDown,
  MessageSquare,
  Send,
  Calendar,
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
  created_at: string;
}

interface WorkflowStep {
  id: string;
  workflow_id: string;
  step_order: number;
  step_type: string;
  config: Record<string, any>;
  created_at: string;
}

interface WorkflowRun {
  id: string;
  run_date: string;
  status: string;
  created_at: string;
}

const STEP_TYPE_ICONS: Record<string, typeof ClipboardList> = {
  CREATE_TASK: ClipboardList,
  UPDATE_LEAD: ArrowUpDown,
  ADD_ACTIVITY: MessageSquare,
  SCHEDULE_MESSAGE: Send,
  CREATE_FOLLOWUP_TASK: Calendar,
  SET_NEXT_TOUCH: Calendar,
};

const STEP_TYPE_LABELS: Record<string, string> = {
  CREATE_TASK: 'Create Task',
  UPDATE_LEAD: 'Update Lead',
  ADD_ACTIVITY: 'Add Activity',
  SCHEDULE_MESSAGE: 'Schedule Message',
  CREATE_FOLLOWUP_TASK: 'Create Follow-up Task',
  SET_NEXT_TOUCH: 'Set Next Touch',
};

const STEP_TYPE_COLORS: Record<string, string> = {
  CREATE_TASK: 'bg-blue-50 border-blue-200 text-blue-700',
  UPDATE_LEAD: 'bg-amber-50 border-amber-200 text-amber-700',
  ADD_ACTIVITY: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  SCHEDULE_MESSAGE: 'bg-purple-50 border-purple-200 text-purple-700',
  CREATE_FOLLOWUP_TASK: 'bg-indigo-50 border-indigo-200 text-indigo-700',
  SET_NEXT_TOUCH: 'bg-cyan-50 border-cyan-200 text-cyan-700',
};

export default function WorkflowDetailPage() {
  const params = useParams();
  const router = useRouter();
  const workflowId = params.id as string;
  const { currentWorkspace, loading: wsLoading } = useWorkspace();
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [savingStep, setSavingStep] = useState(false);
  const [deletingStep, setDeletingStep] = useState<string | null>(null);
  const [addStepOpen, setAddStepOpen] = useState(false);
  const [messageTemplates, setMessageTemplates] = useState<any[]>([]);
  const [newStep, setNewStep] = useState({
    step_type: 'CREATE_TASK',
    title_template: '',
    task_type: 'GENERAL',
    priority: 'MEDIUM',
    due_offset_days: '0',
    assign_rule: 'lead_owner',
    new_status: 'in_progress',
    note_template: '',
    activity_type: 'note',
    templateId: '',
    delayUnit: 'HOURS',
    delayValue: '0',
    taskTitleTemplate: 'Follow-up: {{businessName}}',
    createFollowupTask: false,
    followupDueOffsetUnit: 'HOURS',
    followupDueOffsetValue: '0',
  });

  const loadWorkflow = useCallback(async () => {
    if (!currentWorkspace) return;
    setLoading(true);
    try {
      const [workflowRes, templatesRes] = await Promise.all([
        fetch(`/api/workflows/${workflowId}?workspace_id=${currentWorkspace.id}`),
        fetch(`/api/message-templates?workspace_id=${currentWorkspace.id}`),
      ]);

      if (!workflowRes.ok) {
        const err = await workflowRes.json().catch(() => ({}));
        console.error('Workflow GET failed:', workflowRes.status, err);
        toast.error(err.error || `Failed to load workflow (${workflowRes.status})`);
        return;
      }

      const data = await workflowRes.json();
      setWorkflow(data.workflow);
      setSteps(data.steps);
      setRuns(data.runs);

      if (templatesRes.ok) {
        setMessageTemplates(await templatesRes.json());
      }
    } catch (e) {
      console.error('Workflow fetch error:', e);
      toast.error('Failed to load workflow');
    } finally {
      setLoading(false);
    }
  }, [workflowId, currentWorkspace?.id]);

  useEffect(() => {
    if (!wsLoading) loadWorkflow();
  }, [loadWorkflow, wsLoading]);

  const handleRun = async () => {
    setRunning(true);
    try {
      const res = await fetch(`/api/workflows/${workflowId}/run`, {
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
          `${result.tasks_created} tasks created, ${result.leads_updated} leads updated, ${result.activities_added} activities added`
        );
      } else {
        toast.error(`Errors: ${result.errors?.join(', ')}`);
      }
      loadWorkflow();
    } catch (e) {
      console.error('Run workflow error:', e);
      toast.error('Failed to run workflow');
    } finally {
      setRunning(false);
    }
  };

  const handleAddStep = async () => {
    let config: Record<string, any> = {};

    if (newStep.step_type === 'CREATE_TASK') {
      config = {
        title_template: newStep.title_template || 'New Task',
        type: newStep.task_type,
        priority: newStep.priority,
        due_offset_days: parseInt(newStep.due_offset_days) || 0,
        assign_rule: newStep.assign_rule,
      };
    } else if (newStep.step_type === 'UPDATE_LEAD') {
      config = { new_status: newStep.new_status };
    } else if (newStep.step_type === 'ADD_ACTIVITY') {
      config = {
        note_template: newStep.note_template || 'Workflow activity',
        type: newStep.activity_type,
      };
    } else if (newStep.step_type === 'SCHEDULE_MESSAGE') {
      config = {
        templateId: newStep.templateId,
        delayUnit: newStep.delayUnit,
        delayValue: parseInt(newStep.delayValue) || 0,
        createFollowupTask: newStep.createFollowupTask,
        followupDueOffsetUnit: newStep.followupDueOffsetUnit,
        followupDueOffsetValue: parseInt(newStep.followupDueOffsetValue) || 0,
        assignRule: 'leadOwner',
      };
    } else if (newStep.step_type === 'CREATE_FOLLOWUP_TASK') {
      config = {
        taskTitleTemplate: newStep.taskTitleTemplate || 'Follow-up: {{businessName}}',
        delayUnit: newStep.delayUnit,
        delayValue: parseInt(newStep.delayValue) || 0,
        assignRule: 'leadOwner',
      };
    } else if (newStep.step_type === 'SET_NEXT_TOUCH') {
      config = {
        delayUnit: newStep.delayUnit,
        delayValue: parseInt(newStep.delayValue) || 0,
      };
    }

    setSavingStep(true);
    try {
      const res = await fetch(`/api/workflows/${workflowId}/steps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: currentWorkspace?.id,
          step_type: newStep.step_type,
          config,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('Add step failed:', res.status, err);
        toast.error(err.error || `Failed to add step (${res.status})`);
        return;
      }
      toast.success('Step added');
      setAddStepOpen(false);
      setNewStep({
        step_type: 'CREATE_TASK',
        title_template: '',
        task_type: 'GENERAL',
        priority: 'MEDIUM',
        due_offset_days: '0',
        assign_rule: 'lead_owner',
        new_status: 'in_progress',
        note_template: '',
        activity_type: 'note',
        templateId: '',
        delayUnit: 'HOURS',
        delayValue: '0',
        taskTitleTemplate: 'Follow-up: {{businessName}}',
        createFollowupTask: false,
        followupDueOffsetUnit: 'HOURS',
        followupDueOffsetValue: '0',
      });
      loadWorkflow();
    } catch (e) {
      console.error('Add step error:', e);
      toast.error('Failed to add step');
    } finally {
      setSavingStep(false);
    }
  };

  const handleDeleteStep = async (stepId: string) => {
    if (!confirm('Remove this step?')) return;
    setDeletingStep(stepId);
    try {
      const res = await fetch(
        `/api/workflows/${workflowId}/steps/${stepId}?workspace_id=${currentWorkspace?.id}`,
        { method: 'DELETE' }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('Delete step failed:', res.status, err);
        toast.error(err.error || `Failed to remove step (${res.status})`);
        return;
      }
      toast.success('Step removed');
      loadWorkflow();
    } catch (e) {
      console.error('Delete step error:', e);
      toast.error('Failed to remove step');
    } finally {
      setDeletingStep(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Workflow not found</p>
        <Link href="/app/workflows">
          <Button variant="outline" className="mt-4">Back to Workflows</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8">
      <div className="space-y-6">
        <Link href="/app/workflows">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Workflows
          </Button>
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{workflow.name}</h1>
            {workflow.description && (
              <p className="text-muted-foreground mt-1">{workflow.description}</p>
            )}
            <div className="flex items-center gap-3 mt-2">
              <Badge variant="outline">{workflow.trigger_type}</Badge>
              <Badge variant={workflow.is_active ? 'default' : 'secondary'}>
                {workflow.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>
          <Button onClick={handleRun} disabled={running || !workflow.is_active} className="gap-2">
            {running ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {running ? 'Running...' : 'Run Now'}
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <ListOrdered className="h-5 w-5" />
                  Steps ({steps.length})
                </CardTitle>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setAddStepOpen(true)}>
                  <Plus className="h-3.5 w-3.5" />
                  Add Step
                </Button>
              </CardHeader>
              <CardContent>
                {steps.length > 0 ? (
                  <div className="space-y-3">
                    {steps.map((step, idx) => {
                      const Icon = STEP_TYPE_ICONS[step.step_type] || Zap;
                      const colorClass = STEP_TYPE_COLORS[step.step_type] || '';
                      return (
                        <div key={step.id} className={`rounded-lg border p-4 ${colorClass}`}>
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              <div className="flex items-center justify-center h-7 w-7 rounded-full bg-white border text-xs font-bold shrink-0">
                                {idx + 1}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <Icon className="h-4 w-4" />
                                  <span className="font-medium text-sm">
                                    {STEP_TYPE_LABELS[step.step_type]}
                                  </span>
                                </div>
                                <div className="mt-1 text-xs space-y-0.5">
                                  {step.step_type === 'CREATE_TASK' && (
                                    <>
                                      <p>Title: {step.config.title_template}</p>
                                      <p>Type: {step.config.type} | Priority: {step.config.priority}</p>
                                      <p>Due: +{step.config.due_offset_days || 0} day(s) | Assign: {step.config.assign_rule}</p>
                                    </>
                                  )}
                                  {step.step_type === 'UPDATE_LEAD' && (
                                    <p>Set status to: {step.config.new_status}</p>
                                  )}
                                  {step.step_type === 'ADD_ACTIVITY' && (
                                    <>
                                      <p>Note: {step.config.note_template}</p>
                                      <p>Type: {step.config.type}</p>
                                    </>
                                  )}
                                  {step.step_type === 'SCHEDULE_MESSAGE' && (
                                    <>
                                      <p>Delay: +{step.config.delayValue} {step.config.delayUnit?.toLowerCase()}</p>
                                      <p>Template: {messageTemplates.find((t: any) => t.id === step.config.templateId)?.name || 'Unknown'}</p>
                                      {step.config.createFollowupTask && (
                                        <p>Creates follow-up task</p>
                                      )}
                                    </>
                                  )}
                                  {step.step_type === 'CREATE_FOLLOWUP_TASK' && (
                                    <>
                                      <p>Title: {step.config.taskTitleTemplate}</p>
                                      <p>Delay: +{step.config.delayValue} {step.config.delayUnit?.toLowerCase()}</p>
                                    </>
                                  )}
                                  {step.step_type === 'SET_NEXT_TOUCH' && (
                                    <p>Next touch: +{step.config.delayValue} {step.config.delayUnit?.toLowerCase()}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteStep(step.id)}
                              disabled={deletingStep === step.id}
                              className="shrink-0"
                            >
                              {deletingStep === step.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5 text-red-500" />
                              )}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Zap className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      No steps yet. Add a step to define what this workflow does.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Run History</CardTitle>
              </CardHeader>
              <CardContent>
                {runs.length > 0 ? (
                  <div className="space-y-3">
                    {runs.map((run) => (
                      <div key={run.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          {run.status === 'SUCCESS' ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                          <span>{run.status}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(run.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No runs yet
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <Dialog open={addStepOpen} onOpenChange={setAddStepOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Workflow Step</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Step Type</Label>
                <Select
                  value={newStep.step_type}
                  onValueChange={(v) => setNewStep({ ...newStep, step_type: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CREATE_TASK">Create Task</SelectItem>
                    <SelectItem value="UPDATE_LEAD">Update Lead</SelectItem>
                    <SelectItem value="ADD_ACTIVITY">Add Activity</SelectItem>
                    <SelectItem value="SCHEDULE_MESSAGE">Schedule Message</SelectItem>
                    <SelectItem value="CREATE_FOLLOWUP_TASK">Create Follow-up Task</SelectItem>
                    <SelectItem value="SET_NEXT_TOUCH">Set Next Touch</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {newStep.step_type === 'CREATE_TASK' && (
                <>
                  <div className="space-y-2">
                    <Label>Title Template</Label>
                    <Input
                      value={newStep.title_template}
                      onChange={(e) => setNewStep({ ...newStep, title_template: e.target.value })}
                      placeholder="e.g. Follow up with {lead_name}"
                    />
                    <p className="text-xs text-muted-foreground">
                      Use {'{lead_name}'} to insert the lead name
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Task Type</Label>
                      <Select value={newStep.task_type} onValueChange={(v) => setNewStep({ ...newStep, task_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="GENERAL">General</SelectItem>
                          <SelectItem value="LEAD_FOLLOWUP">Lead Follow-up</SelectItem>
                          <SelectItem value="OPS">Operations</SelectItem>
                          <SelectItem value="CONTENT">Content</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Priority</Label>
                      <Select value={newStep.priority} onValueChange={(v) => setNewStep({ ...newStep, priority: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LOW">Low</SelectItem>
                          <SelectItem value="MEDIUM">Medium</SelectItem>
                          <SelectItem value="HIGH">High</SelectItem>
                          <SelectItem value="URGENT">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Due Offset (days)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={newStep.due_offset_days}
                        onChange={(e) => setNewStep({ ...newStep, due_offset_days: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Assign Rule</Label>
                      <Select value={newStep.assign_rule} onValueChange={(v) => setNewStep({ ...newStep, assign_rule: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="lead_owner">Lead Owner</SelectItem>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              )}

              {newStep.step_type === 'UPDATE_LEAD' && (
                <div className="space-y-2">
                  <Label>New Status</Label>
                  <Select value={newStep.new_status} onValueChange={(v) => setNewStep({ ...newStep, new_status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="won">Won</SelectItem>
                      <SelectItem value="lost">Lost</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {newStep.step_type === 'ADD_ACTIVITY' && (
                <>
                  <div className="space-y-2">
                    <Label>Note Template</Label>
                    <Textarea
                      value={newStep.note_template}
                      onChange={(e) => setNewStep({ ...newStep, note_template: e.target.value })}
                      placeholder="Activity note..."
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Activity Type</Label>
                    <Select value={newStep.activity_type} onValueChange={(v) => setNewStep({ ...newStep, activity_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="note">Note</SelectItem>
                        <SelectItem value="call">Call Log</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {newStep.step_type === 'SCHEDULE_MESSAGE' && (
                <>
                  <div className="space-y-2">
                    <Label>Message Template</Label>
                    <Select value={newStep.templateId} onValueChange={(v) => setNewStep({ ...newStep, templateId: v })}>
                      <SelectTrigger><SelectValue placeholder="Select template..." /></SelectTrigger>
                      <SelectContent>
                        {messageTemplates.map((t: any) => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Delay Unit</Label>
                      <Select value={newStep.delayUnit} onValueChange={(v) => setNewStep({ ...newStep, delayUnit: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MINUTES">Minutes</SelectItem>
                          <SelectItem value="HOURS">Hours</SelectItem>
                          <SelectItem value="DAYS">Days</SelectItem>
                          <SelectItem value="MONTHS">Months</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Delay Value</Label>
                      <Input
                        type="number"
                        min="0"
                        value={newStep.delayValue}
                        onChange={(e) => setNewStep({ ...newStep, delayValue: e.target.value })}
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newStep.createFollowupTask}
                      onChange={(e) => setNewStep({ ...newStep, createFollowupTask: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm text-slate-600">Create follow-up task</span>
                  </label>
                </>
              )}

              {newStep.step_type === 'CREATE_FOLLOWUP_TASK' && (
                <>
                  <div className="space-y-2">
                    <Label>Task Title Template</Label>
                    <Input
                      value={newStep.taskTitleTemplate}
                      onChange={(e) => setNewStep({ ...newStep, taskTitleTemplate: e.target.value })}
                      placeholder="e.g. Follow-up: {{businessName}}"
                    />
                    <p className="text-xs text-muted-foreground">
                      Use variables like {'{businessName}'}, {'{phone}'}, {'{email}'}, {'{name}'}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Delay Unit</Label>
                      <Select value={newStep.delayUnit} onValueChange={(v) => setNewStep({ ...newStep, delayUnit: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MINUTES">Minutes</SelectItem>
                          <SelectItem value="HOURS">Hours</SelectItem>
                          <SelectItem value="DAYS">Days</SelectItem>
                          <SelectItem value="MONTHS">Months</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Delay Value</Label>
                      <Input
                        type="number"
                        min="0"
                        value={newStep.delayValue}
                        onChange={(e) => setNewStep({ ...newStep, delayValue: e.target.value })}
                      />
                    </div>
                  </div>
                </>
              )}

              {newStep.step_type === 'SET_NEXT_TOUCH' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Delay Unit</Label>
                      <Select value={newStep.delayUnit} onValueChange={(v) => setNewStep({ ...newStep, delayUnit: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MINUTES">Minutes</SelectItem>
                          <SelectItem value="HOURS">Hours</SelectItem>
                          <SelectItem value="DAYS">Days</SelectItem>
                          <SelectItem value="MONTHS">Months</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Delay Value</Label>
                      <Input
                        type="number"
                        min="0"
                        value={newStep.delayValue}
                        onChange={(e) => setNewStep({ ...newStep, delayValue: e.target.value })}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This sets when the lead should reappear in Follow-ups
                  </p>
                </>
              )}

              <Button className="w-full" onClick={handleAddStep} disabled={savingStep}>
                {savingStep ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {savingStep ? 'Adding...' : 'Add Step'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
