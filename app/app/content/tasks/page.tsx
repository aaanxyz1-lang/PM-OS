'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BreadcrumbNav } from '@/components/breadcrumb-nav';
import { useWorkspace } from '@/lib/workspace-context';
import { toast } from 'sonner';
import { Loader2, ListTodo, Plus } from 'lucide-react';
import Link from 'next/link';

interface Task {
  id: string;
  title: string;
  type: string;
  status: string;
  priority: string;
  due_at: string | null;
  platform: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  TODO: 'bg-slate-100 text-slate-700',
  DOING: 'bg-blue-100 text-blue-700',
  DONE: 'bg-emerald-100 text-emerald-700',
  BLOCKED: 'bg-red-100 text-red-700',
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-slate-100 text-slate-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  HIGH: 'bg-red-100 text-red-700',
};

const PLATFORM_COLORS: Record<string, string> = {
  FB: 'bg-blue-100 text-blue-700',
  IG: 'bg-purple-100 text-purple-700',
  YT: 'bg-red-100 text-red-700',
  Blog: 'bg-slate-100 text-slate-700',
};

export default function ContentTasksPage() {
  const { currentWorkspace, loading: wsLoading } = useWorkspace();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (wsLoading) return;
    if (!currentWorkspace) return;

    const loadTasks = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/tasks?workspace_id=${currentWorkspace.id}&type=CONTENT`
        );
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          console.error('Tasks GET failed:', res.status, err);
          toast.error(err.error || `Failed to load tasks (${res.status})`);
          return;
        }
        setTasks(await res.json());
      } catch (e) {
        console.error('Tasks fetch error:', e);
        toast.error('Failed to load tasks');
      } finally {
        setLoading(false);
      }
    };

    loadTasks();
  }, [currentWorkspace?.id, wsLoading]);

  const byStatus = (status: string) => tasks.filter((t) => t.status === status);

  return (
    <div className="p-4 lg:p-8">
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <BreadcrumbNav
              items={[
                { label: 'Content', href: '/app/content/tasks' },
                { label: 'Tasks' },
              ]}
            />
            <h1 className="text-3xl font-bold tracking-tight">Content Tasks</h1>
            <p className="text-muted-foreground mt-1">Manage content creation and publishing tasks</p>
          </div>
          <Link href="/app/tasks">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Task
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : tasks.length === 0 ? (
          <Card className="bg-slate-50/50 border-slate-200">
            <CardContent className="pt-6 text-center">
              <ListTodo className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 font-medium">No content tasks yet</p>
              <p className="text-xs text-muted-foreground mt-1">Create your first content task to get started</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            {['TODO', 'DOING', 'DONE'].map((status) => (
              <Card key={status}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>{status === 'TODO' ? 'To Do' : status === 'DOING' ? 'In Progress' : 'Done'}</span>
                    <Badge variant="outline">{byStatus(status).length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {byStatus(status).map((task) => (
                    <div key={task.id} className="p-3 bg-slate-50 rounded-lg border hover:shadow-sm transition-shadow">
                      <p className="font-medium text-sm">{task.title}</p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {task.platform && (
                          <Badge className={`text-xs ${PLATFORM_COLORS[task.platform]}`}>
                            {task.platform}
                          </Badge>
                        )}
                        {task.priority && (
                          <Badge className={`text-xs ${PRIORITY_COLORS[task.priority]}`}>
                            {task.priority}
                          </Badge>
                        )}
                      </div>
                      {task.due_at && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Due: {new Date(task.due_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  ))}
                  {byStatus(status).length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      No tasks in this status
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
