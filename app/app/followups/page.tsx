'use client';

import { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { BreadcrumbNav } from '@/components/breadcrumb-nav';
import {
  Clock,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Calendar,
  User,
  ExternalLink,
} from 'lucide-react';
import { useWorkspace } from '@/lib/workspace-context';
import { SELECT_UNASSIGNED, normalizeSelectValue, denormalizeSelectValue } from '@/lib/select-utils';
import { toast } from 'sonner';
import Link from 'next/link';

interface Task {
  id: string;
  title: string;
  type: string;
  status: string;
  due_at: string | null;
  lead_id: string | null;
  assigned_to_user_id: string | null;
  lead: { id: string; name: string } | null;
  assigned_user: { id: string; name: string } | null;
}

interface Lead {
  id: string;
  name: string;
  phone: string;
  status: string;
  next_touch_at: string | null;
  assigned_to: string | null;
  assigned_user?: { id: string; name: string };
}

const STATUS_COLORS: Record<string, string> = {
  TODO: 'bg-slate-100 text-slate-700',
  DOING: 'bg-blue-100 text-blue-700',
  DONE: 'bg-emerald-100 text-emerald-700',
  BLOCKED: 'bg-red-100 text-red-700',
};

export default function FollowupsPage() {
  const { currentWorkspace, employees, loading: wsLoading } = useWorkspace();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadTasks = async () => {
    if (!currentWorkspace) return;
    setLoading(true);
    try {
      const [tasksRes, leadsRes] = await Promise.all([
        fetch(`/api/tasks?workspace_id=${currentWorkspace.id}&type=LEAD_FOLLOWUP`),
        fetch(`/api/leads?workspace_id=${currentWorkspace.id}`),
      ]);

      if (!tasksRes.ok) {
        const err = await tasksRes.json().catch(() => ({}));
        console.error('Tasks GET failed:', tasksRes.status, err);
        toast.error(err.error || `Failed to load tasks (${tasksRes.status})`);
        return;
      }

      const tasksData = await tasksRes.json();
      setTasks(tasksData);

      if (leadsRes.ok) {
        const leadsData = await leadsRes.json();
        const leadsWithNextTouch = leadsData.filter((l: Lead) => l.next_touch_at);
        setLeads(leadsWithNextTouch);
      }
    } catch (e) {
      console.error('Fetch error:', e);
      toast.error('Failed to load followups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!wsLoading) loadTasks();
  }, [currentWorkspace?.id, wsLoading]);

  const todayTasks = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    return tasks.filter((task) => {
      if (!task.due_at || task.status === 'DONE') return false;
      const dueDate = new Date(task.due_at);
      return dueDate >= todayStart && dueDate < todayEnd;
    });
  }, [tasks]);

  const overdueTasks = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return tasks.filter((task) => {
      if (!task.due_at || task.status === 'DONE') return false;
      const dueDate = new Date(task.due_at);
      return dueDate < todayStart;
    });
  }, [tasks]);

  const thisWeekTasks = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekEnd = new Date(todayStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    return tasks.filter((task) => {
      if (!task.due_at || task.status === 'DONE') return false;
      const dueDate = new Date(task.due_at);
      return dueDate >= todayStart && dueDate < weekEnd;
    });
  }, [tasks]);

  const todayLeads = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    return leads.filter((lead) => {
      if (!lead.next_touch_at) return false;
      const nextTouch = new Date(lead.next_touch_at);
      return nextTouch >= todayStart && nextTouch < todayEnd;
    });
  }, [leads]);

  const overdueLeads = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return leads.filter((lead) => {
      if (!lead.next_touch_at) return false;
      const nextTouch = new Date(lead.next_touch_at);
      return nextTouch < todayStart;
    });
  }, [leads]);

  const thisWeekLeads = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekEnd = new Date(todayStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    return leads.filter((lead) => {
      if (!lead.next_touch_at) return false;
      const nextTouch = new Date(lead.next_touch_at);
      return nextTouch >= todayStart && nextTouch < weekEnd;
    });
  }, [leads]);

  const handleMarkDone = async (task: Task) => {
    if (!currentWorkspace) return;
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: currentWorkspace.id,
          status: 'DONE',
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('Update task failed:', res.status, err);
        toast.error(err.error || 'Failed to mark as done');
        return;
      }
      toast.success('Follow-up marked complete');
      loadTasks();
    } catch (e) {
      console.error('Update task error:', e);
      toast.error('Failed to mark as done');
    }
  };

  const handleReschedule = async (task: Task, days: number) => {
    if (!currentWorkspace) return;
    const newDate = new Date();
    newDate.setDate(newDate.getDate() + days);
    if (task.due_at) {
      const oldDue = new Date(task.due_at);
      newDate.setHours(oldDue.getHours(), oldDue.getMinutes(), 0, 0);
    } else {
      newDate.setHours(9, 0, 0, 0);
    }

    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: currentWorkspace.id,
          due_at: newDate.toISOString(),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('Reschedule task failed:', res.status, err);
        toast.error(err.error || 'Failed to reschedule');
        return;
      }
      toast.success('Follow-up rescheduled');
      loadTasks();
    } catch (e) {
      console.error('Reschedule error:', e);
      toast.error('Failed to reschedule');
    }
  };

  const handleAssign = async (task: Task, userId: string | null) => {
    if (!currentWorkspace) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: currentWorkspace.id,
          assigned_to_user_id: userId,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('Update task failed:', res.status, err);
        toast.error(err.error || 'Failed to assign');
        return;
      }
      toast.success('Follow-up assigned');
      setEditOpen(false);
      loadTasks();
    } catch (e) {
      console.error('Update task error:', e);
      toast.error('Failed to assign');
    } finally {
      setSaving(false);
    }
  };

  const TaskRow = ({ task, showReschedule = true }: { task: Task; showReschedule?: boolean }) => (
    <div className="flex items-center justify-between p-3 bg-white rounded-lg border hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="flex-1 min-w-0">
          <Link href={`/app/leads/${task.lead?.id}`}>
            <div className="font-medium text-sm hover:text-blue-600 transition-colors">
              {task.title}
            </div>
          </Link>
          {task.lead && (
            <p className="text-xs text-muted-foreground">{task.lead.name}</p>
          )}
        </div>
        {task.due_at && (
          <div className="flex items-center gap-1 text-xs text-slate-600 whitespace-nowrap">
            <Clock className="h-3 w-3" />
            {new Date(task.due_at).toLocaleDateString()}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Badge className={`text-xs ${STATUS_COLORS[task.status]}`}>
          {task.status}
        </Badge>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleMarkDone(task)}
          className="gap-1"
        >
          <CheckCircle2 className="h-3 w-3" />
          Done
        </Button>
        {showReschedule && (
          <Select
            value="reschedule"
            onValueChange={(days) => {
              handleReschedule(task, parseInt(days));
            }}
          >
            <SelectTrigger className="w-24 text-xs h-8">
              <SelectValue placeholder="Reschedule" />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="1">Tomorrow</SelectItem>
              <SelectItem value="3">3 Days</SelectItem>
              <SelectItem value="7">1 Week</SelectItem>
            </SelectContent>
          </Select>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setSelectedTask(task);
            setEditOpen(true);
          }}
        >
          <User className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );

  const LeadRow = ({ lead }: { lead: Lead }) => (
    <div className="flex items-center justify-between p-3 bg-white rounded-lg border hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="flex-1 min-w-0">
          <Link href={`/app/leads/${lead.id}`}>
            <div className="font-medium text-sm hover:text-blue-600 transition-colors flex items-center gap-2">
              {lead.name}
              <ExternalLink className="h-3 w-3 text-slate-400" />
            </div>
          </Link>
          <p className="text-xs text-muted-foreground">{lead.phone}</p>
        </div>
        {lead.next_touch_at && (
          <div className="flex items-center gap-1 text-xs text-slate-600 whitespace-nowrap">
            <Calendar className="h-3 w-3" />
            {new Date(lead.next_touch_at).toLocaleDateString()}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs">
          {lead.status}
        </Badge>
      </div>
    </div>
  );

  return (
    <div className="p-4 lg:p-8">
      <div className="space-y-6">
        <div>
          <BreadcrumbNav items={[{ label: 'Sales', href: '/app' }, { label: 'Follow-ups' }]} />
          <h1 className="text-3xl font-bold tracking-tight">Follow-ups</h1>
          <p className="text-muted-foreground mt-1">Manage lead follow-ups and stay on top of your pipeline</p>
        </div>

        <Tabs defaultValue="today" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="today">
              Today ({todayTasks.length + todayLeads.length})
            </TabsTrigger>
            <TabsTrigger value="overdue">
              Overdue ({overdueTasks.length + overdueLeads.length})
            </TabsTrigger>
            <TabsTrigger value="week">
              This Week ({thisWeekTasks.length + thisWeekLeads.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="today" className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : todayTasks.length > 0 || todayLeads.length > 0 ? (
              <>
                {todayLeads.map((lead) => (
                  <LeadRow key={`lead-${lead.id}`} lead={lead} />
                ))}
                {todayTasks.map((task) => (
                  <TaskRow key={task.id} task={task} />
                ))}
              </>
            ) : (
              <Card className="bg-blue-50/50 border-blue-200">
                <CardContent className="pt-6 text-center">
                  <Clock className="h-12 w-12 text-blue-300 mx-auto mb-3" />
                  <p className="text-slate-600 font-medium">No follow-ups scheduled for today</p>
                  <p className="text-xs text-muted-foreground mt-1">You're all caught up!</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="overdue" className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : overdueTasks.length > 0 || overdueLeads.length > 0 ? (
              <>
                {overdueLeads.map((lead) => (
                  <div key={`lead-${lead.id}`} className="relative">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 rounded-l-lg" />
                    <LeadRow lead={lead} />
                  </div>
                ))}
                {overdueTasks.map((task) => (
                  <div key={task.id} className="relative">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 rounded-l-lg" />
                    <TaskRow task={task} showReschedule={true} />
                  </div>
                ))}
              </>
            ) : (
              <Card className="bg-emerald-50/50 border-emerald-200">
                <CardContent className="pt-6 text-center">
                  <CheckCircle2 className="h-12 w-12 text-emerald-300 mx-auto mb-3" />
                  <p className="text-slate-600 font-medium">No overdue follow-ups</p>
                  <p className="text-xs text-muted-foreground mt-1">Great job staying on top!</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="week" className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : thisWeekTasks.length > 0 || thisWeekLeads.length > 0 ? (
              <>
                {thisWeekLeads.map((lead) => (
                  <LeadRow key={`lead-${lead.id}`} lead={lead} />
                ))}
                {thisWeekTasks.map((task) => (
                  <TaskRow key={task.id} task={task} showReschedule={false} />
                ))}
              </>
            ) : (
              <Card className="bg-slate-50/50 border-slate-200">
                <CardContent className="pt-6 text-center">
                  <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-600 font-medium">No follow-ups this week</p>
                  <p className="text-xs text-muted-foreground mt-1">Plan ahead to avoid surprises</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Assign Follow-up</DialogTitle>
            </DialogHeader>
            {selectedTask && (
              <div className="space-y-4 mt-4">
                <div>
                  <p className="text-sm font-medium mb-2">{selectedTask.title}</p>
                  {selectedTask.lead && (
                    <p className="text-xs text-muted-foreground">{selectedTask.lead.name}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Assign To</label>
                  <Select
                    value={denormalizeSelectValue(selectedTask.assigned_to_user_id)}
                    onValueChange={(userId) =>
                      handleAssign(selectedTask, normalizeSelectValue(userId))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select assignee" />
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
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
