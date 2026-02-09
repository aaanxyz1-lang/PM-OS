'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  DialogFooter,
} from '@/components/ui/dialog';
import { BreadcrumbNav } from '@/components/breadcrumb-nav';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, ArrowLeft, Clock, Mail } from 'lucide-react';
import Link from 'next/link';

interface LoopStep {
  id: string;
  step_order: number;
  delay_type: string;
  delay_value: number;
  action_type: string;
  task_title_template: string;
  task_type: string;
  assign_rule: string;
}

interface LoopTemplate {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  steps?: LoopStep[];
}

export default function LoopDetailsPage() {
  const params = useParams();
  const loopId = params.id as string;

  const [loop, setLoop] = useState<LoopTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [addStepOpen, setAddStepOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteStepId, setDeleteStepId] = useState<string | null>(null);

  const [stepForm, setStepForm] = useState({
    step_order: 1,
    delay_type: 'IMMEDIATE',
    delay_value: 0,
    action_type: 'CREATE_TASK',
    task_title_template: '',
    task_type: 'LEAD_FOLLOWUP',
    assign_rule: 'sameAgent',
  });

  const loadLoop = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/lead-loops/${loopId}`);
      if (!res.ok) throw new Error('Failed to load loop');
      setLoop(await res.json());
    } catch (e) {
      console.error('Load loop error:', e);
      toast.error('Failed to load loop');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLoop();
  }, [loopId]);

  const handleAddStep = async () => {
    if (!stepForm.task_title_template.trim()) {
      toast.error('Task title is required');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/lead-loops/${loopId}/steps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stepForm),
      });

      if (!res.ok) throw new Error('Failed to add step');

      toast.success('Step added');
      setAddStepOpen(false);
      setStepForm({
        step_order: (loop?.steps?.length || 0) + 1,
        delay_type: 'IMMEDIATE',
        delay_value: 0,
        action_type: 'CREATE_TASK',
        task_title_template: '',
        task_type: 'LEAD_FOLLOWUP',
        assign_rule: 'sameAgent',
      });
      loadLoop();
    } catch (e) {
      console.error('Add step error:', e);
      toast.error('Failed to add step');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStep = async () => {
    if (!deleteStepId) return;

    setSaving(true);
    try {
      const res = await fetch(
        `/api/lead-loops/${loopId}/steps?stepId=${deleteStepId}`,
        { method: 'DELETE' }
      );

      if (!res.ok) throw new Error('Failed to delete step');

      toast.success('Step deleted');
      setDeleteStepId(null);
      loadLoop();
    } catch (e) {
      console.error('Delete step error:', e);
      toast.error('Failed to delete step');
    } finally {
      setSaving(false);
    }
  };

  const getDelayLabel = (type: string, value: number) => {
    switch (type) {
      case 'IMMEDIATE':
        return 'Now';
      case 'HOURS':
        return `+${value} hour${value !== 1 ? 's' : ''}`;
      case 'DAYS':
        return `+${value} day${value !== 1 ? 's' : ''}`;
      case 'MONTHLY':
        return `Monthly`;
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <div className="p-4 lg:p-8 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!loop) {
    return (
      <div className="p-4 lg:p-8">
        <p className="text-muted-foreground">Loop not found</p>
      </div>
    );
  }

  const steps = loop.steps || [];

  return (
    <div className="p-4 lg:p-8">
      <div className="space-y-6 max-w-4xl">
        <Link href="/app/automation/lead-loops">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Loops
          </Button>
        </Link>

        <div>
          <BreadcrumbNav
            items={[
              { label: 'Automation', href: '/app/automation' },
              { label: 'Lead Loops', href: '/app/automation/lead-loops' },
              { label: loop.name },
            ]}
          />
          <h1 className="text-3xl font-bold tracking-tight">{loop.name}</h1>
          {loop.description && (
            <p className="text-muted-foreground mt-1">{loop.description}</p>
          )}
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>Loop Steps</CardTitle>
                <CardDescription>
                  Define the sequence of follow-ups
                </CardDescription>
              </div>
              <Button
                onClick={() => {
                  setStepForm((prev) => ({
                    ...prev,
                    step_order: steps.length + 1,
                  }));
                  setAddStepOpen(true);
                }}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Step
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {steps.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No steps yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Add your first step to build the loop sequence
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {steps
                  .sort((a, b) => a.step_order - b.step_order)
                  .map((step, index) => (
                    <div key={step.id} className="relative">
                      {index < steps.length - 1 && (
                        <div className="absolute left-6 top-12 h-6 w-0.5 bg-slate-200"></div>
                      )}
                      <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg border">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold">
                            {step.step_order}
                          </div>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{step.task_title_template}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Trigger: {getDelayLabel(step.delay_type, step.delay_value)}
                          </p>
                          <div className="flex gap-2 mt-2 text-xs">
                            <span className="px-2 py-1 bg-slate-200 rounded-full">
                              {step.task_type}
                            </span>
                            <span className="px-2 py-1 bg-slate-200 rounded-full">
                              {step.assign_rule}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteStepId(step.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={addStepOpen} onOpenChange={setAddStepOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Loop Step</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>When to trigger?</Label>
                <Select
                  value={stepForm.delay_type}
                  onValueChange={(v) =>
                    setStepForm((prev) => ({ ...prev, delay_type: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IMMEDIATE">Immediately</SelectItem>
                    <SelectItem value="HOURS">After (hours)</SelectItem>
                    <SelectItem value="DAYS">After (days)</SelectItem>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {stepForm.delay_type !== 'IMMEDIATE' && stepForm.delay_type !== 'MONTHLY' && (
                <div className="space-y-2">
                  <Label>Delay value</Label>
                  <Input
                    type="number"
                    min="0"
                    value={stepForm.delay_value}
                    onChange={(e) =>
                      setStepForm((prev) => ({
                        ...prev,
                        delay_value: parseInt(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Task title</Label>
                <Input
                  placeholder="e.g., Follow up on Ecommerce SaaS interest"
                  value={stepForm.task_title_template}
                  onChange={(e) =>
                    setStepForm((prev) => ({
                      ...prev,
                      task_title_template: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Assign to</Label>
                <Select
                  value={stepForm.assign_rule}
                  onValueChange={(v) =>
                    setStepForm((prev) => ({ ...prev, assign_rule: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sameAgent">Same Agent</SelectItem>
                    <SelectItem value="roundRobin">Round Robin</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={() => setAddStepOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddStep} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Add Step'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {deleteStepId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="max-w-md">
              <CardHeader>
                <CardTitle>Delete Step</CardTitle>
                <CardDescription>
                  This action cannot be undone.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setDeleteStepId(null)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDeleteStep}
                  disabled={saving}
                  variant="destructive"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Delete'
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
