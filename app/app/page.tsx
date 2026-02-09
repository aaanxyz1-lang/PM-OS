'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Users, Target, DollarSign, TrendingUp, Loader2, Plus, Clock, AlertCircle, ExternalLink } from 'lucide-react';
import { useWorkspace } from '@/lib/workspace-context';

interface DashboardData {
  workspaceName: string;
  totalLeads: number;
  totalValue: number;
  memberCount: number;
  statusCounts: Record<string, number>;
}

interface Task {
  id: string;
  title: string;
  type: string;
  status: string;
  due_at: string | null;
  lead_id: string | null;
  lead: { id: string; name: string } | null;
}

const BAR_COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444'];

const STATUS_COLORS: Record<string, string> = {
  TODO: 'bg-slate-100 text-slate-700',
  DOING: 'bg-blue-100 text-blue-700',
  DONE: 'bg-emerald-100 text-emerald-700',
  BLOCKED: 'bg-red-100 text-red-700',
};

export default function Dashboard() {
  const { currentWorkspace } = useWorkspace();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentWorkspace) return;
    setLoading(true);

    Promise.all([
      fetch(`/api/dashboard?workspace_id=${currentWorkspace.id}`).then((r) => r.json()),
      fetch(`/api/tasks?workspace_id=${currentWorkspace.id}`).then((r) => r.json()),
    ])
      .then(([dashData, tasksData]) => {
        setDashboard(dashData);
        setTasks(tasksData);
      })
      .catch((err) => console.error('Failed to load dashboard:', err))
      .finally(() => setLoading(false));
  }, [currentWorkspace?.id]);

  const todayTasks = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    return tasks.filter((task) => {
      if (!task.due_at || task.status === 'DONE') return false;
      const dueDate = new Date(task.due_at);
      const isToday = dueDate >= todayStart && dueDate < todayEnd;
      const isOverdue = dueDate < todayStart;
      return isToday || isOverdue;
    });
  }, [tasks]);

  const isOverdue = (task: Task) => {
    if (!task.due_at || task.status === 'DONE') return false;
    return new Date(task.due_at) < new Date();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  const chartData = dashboard
    ? [
        { status: 'New', count: dashboard.statusCounts.new || 0 },
        { status: 'In Progress', count: dashboard.statusCounts.in_progress || 0 },
        { status: 'Won', count: dashboard.statusCounts.won || 0 },
        { status: 'Lost', count: dashboard.statusCounts.lost || 0 },
      ]
    : [];

  return (
    <div className="p-4 lg:p-8">
      <div className="space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              {dashboard?.workspaceName || currentWorkspace?.name || 'Overview'}
            </p>
          </div>
          <Link href="/app/leads/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Lead
            </Button>
          </Link>
        </div>

        {todayTasks.length > 0 && (
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  Today's Focus ({todayTasks.length})
                </CardTitle>
                <Link href="/app/calendar">
                  <Button variant="outline" size="sm">
                    View Calendar
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {todayTasks.slice(0, 5).map((task) => (
                  <Link key={task.id} href="/app/calendar">
                    <div className="flex items-center justify-between p-2 bg-white rounded-lg border cursor-pointer hover:shadow-sm transition-shadow">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {isOverdue(task) && (
                          <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                        )}
                        <span className="font-medium text-sm truncate">{task.title}</span>
                        {task.lead && (
                          <Link href={`/app/leads/${task.lead.id}`} onClick={(e) => e.stopPropagation()}>
                            <Badge variant="outline" className="text-xs gap-1">
                              {task.lead.name}
                              <ExternalLink className="h-2.5 w-2.5" />
                            </Badge>
                          </Link>
                        )}
                      </div>
                      <Badge className={`text-xs ${STATUS_COLORS[task.status]}`}>
                        {task.status}
                      </Badge>
                    </div>
                  </Link>
                ))}
                {todayTasks.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center pt-1">
                    +{todayTasks.length - 5} more tasks
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Leads
              </CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{dashboard?.totalLeads || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pipeline Value
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                ${(dashboard?.totalValue || 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Won Deals
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {dashboard?.statusCounts?.won || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Team Members
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{dashboard?.memberCount || 0}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Leads by Status</CardTitle>
            <CardDescription>Distribution across your pipeline</CardDescription>
          </CardHeader>
          <CardContent>
            {dashboard && dashboard.totalLeads > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="status" fontSize={12} />
                  <YAxis fontSize={12} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={BAR_COLORS[i]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[200px] text-center">
                <Target className="h-10 w-10 text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No leads yet</p>
                <p className="text-sm text-muted-foreground">
                  Create your first lead to see pipeline data
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
