'use client';

import { useEffect, useState } from 'react';
import { useWorkspace } from '@/lib/workspace-context';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle, Clock, Play } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface RunSummary {
  scannedJobs: number;
  executedJobs: number;
  createdTasks: number;
  skippedJobs: number;
  failedJobs: number;
}

export default function AutomationRunnerPage() {
  const { currentWorkspace } = useWorkspace();
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState<RunSummary | null>(null);
  const [errors, setErrors] = useState<any[]>([]);
  const [lastRun, setLastRun] = useState<string | null>(null);

  const handleRun = async () => {
    if (!currentWorkspace?.id) {
      toast.error('Workspace not loaded');
      return;
    }

    setRunning(true);
    try {
      const res = await fetch(`/api/automation/run?workspaceId=${currentWorkspace.id}`, {
        method: 'POST',
      });

      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary);
        setErrors(data.errors || []);
        setLastRun(new Date().toLocaleString());

        toast.success(
          `Automation run complete: ${data.summary.executedJobs} jobs executed, ${data.summary.createdTasks} tasks created`
        );
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to run automation');
      }
    } catch (err) {
      toast.error('Failed to run automation');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Automation Runner</h1>
        <p className="text-sm text-slate-500 mt-1">
          Execute pending automation jobs and create follow-up tasks
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Run Automation</CardTitle>
          <CardDescription>
            Process all due automation jobs and create scheduled tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleRun}
            disabled={running}
            size="lg"
            className="gap-2"
          >
            <Play className="h-4 w-4" />
            {running ? 'Running...' : 'Run Due Jobs'}
          </Button>

          {lastRun && (
            <p className="text-xs text-slate-500 mt-3">
              Last run: {lastRun}
            </p>
          )}
        </CardContent>
      </Card>

      {summary && (
        <Card>
          <CardHeader>
            <CardTitle>Latest Run Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-xs text-slate-600 mb-1">Scanned Jobs</div>
                <div className="text-2xl font-bold text-blue-600">{summary.scannedJobs}</div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-xs text-slate-600 mb-1">Executed</div>
                <div className="text-2xl font-bold text-green-600">{summary.executedJobs}</div>
              </div>

              <div className="bg-emerald-50 p-4 rounded-lg">
                <div className="text-xs text-slate-600 mb-1">Tasks Created</div>
                <div className="text-2xl font-bold text-emerald-600">{summary.createdTasks}</div>
              </div>

              <div className="bg-amber-50 p-4 rounded-lg">
                <div className="text-xs text-slate-600 mb-1">Skipped</div>
                <div className="text-2xl font-bold text-amber-600">{summary.skippedJobs}</div>
              </div>

              {summary.failedJobs > 0 && (
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="text-xs text-slate-600 mb-1">Failed</div>
                  <div className="text-2xl font-bold text-red-600">{summary.failedJobs}</div>
                </div>
              )}
            </div>

            {errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>{errors.length} job(s) failed</strong>
                  {errors.map((err, i) => (
                    <div key={i} className="text-xs mt-2">
                      Job {err.jobId}: {err.error}
                    </div>
                  ))}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-600">
          <div className="flex gap-3">
            <Clock className="h-5 w-5 text-slate-400 flex-shrink-0 mt-0.5" />
            <p>
              <strong>Automation jobs</strong> are created when you attach a workflow to leads. Each step generates a scheduled job.
            </p>
          </div>
          <div className="flex gap-3">
            <Play className="h-5 w-5 text-slate-400 flex-shrink-0 mt-0.5" />
            <p>
              <strong>Run due jobs</strong> executes all pending jobs where scheduled time has passed. Jobs that are already done, skipped, or failed are not re-executed.
            </p>
          </div>
          <div className="flex gap-3">
            <CheckCircle className="h-5 w-5 text-slate-400 flex-shrink-0 mt-0.5" />
            <p>
              <strong>Activities logged</strong> for every executed job so you can track all automation activity on each lead.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
