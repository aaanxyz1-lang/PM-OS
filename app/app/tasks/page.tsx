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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import {
  Plus,
  CheckCircle2,
  Loader2,
  ListTodo,
  ExternalLink,
} from 'lucide-react';
import { useWorkspace } from '@/lib/workspace-context';
import { toast } from 'sonner';
import { TaskModal } from '@/components/task-modal';

interface Task {
  id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  priority: string;
  due_at: string | null;
  assigned_to_user_id: string | null;
  lead_id: string | null;
  workflow_run_id: string | null;
  created_at: string;
  assigned_user: { id: string; name: string } | null;
  lead: { id: string; name: string } | null;
}

const STATUS_COLORS: Record<string, string> = {
  TODO: 'bg-slate-100 text-slate-700',
  DOING: 'bg-blue-100 text-blue-700',
  DONE: 'bg-emerald-100 text-emerald-700',
  BLOCKED: 'bg-red-100 text-red-700',
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-slate-50 text-slate-600 border border-slate-200',
  MEDIUM: 'bg-amber-50 text-amber-700 border border-amber-200',
  HIGH: 'bg-orange-50 text-orange-700 border border-orange-200',
  URGENT: 'bg-red-50 text-red-700 border border-red-200',
};

const TYPE_LABELS: Record<string, string> = {
  LEAD_FOLLOWUP: 'Lead Follow-up',
  OPS: 'Operations',
  CONTENT: 'Content',
  GENERAL: 'General',
};

export default function TasksPage() {
  const { currentWorkspace, employees, loading: wsLoading } = useWorkspace();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assignedFilter, setAssignedFilter] = useState('all');
  const [duePeriod, setDuePeriod] = useState('all');
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    if (!currentWorkspace) return;
    setLoading(true);

    try {
      const params = new URLSearchParams({ workspace_id: currentWorkspace.id });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (priorityFilter !== 'all') params.set('priority', priorityFilter);
      if (assignedFilter !== 'all') params.set('assigned_to', assignedFilter);
      if (duePeriod !== 'all') params.set('due_period', duePeriod);

      const res = await fetch(`/api/tasks?${params}`);
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
  }, [currentWorkspace?.id, statusFilter, typeFilter, priorityFilter, assignedFilter, duePeriod]);

  useEffect(() => {
    if (!wsLoading) loadTasks();
  }, [loadTasks, wsLoading]);

  const handleOpenTask = (taskId: string) => {
    setSelectedTaskId(taskId);
    setTaskModalOpen(true);
  };

  const handleCreateTask = () => {
    setSelectedTaskId(null);
    setTaskModalOpen(true);
  };

  const formatDue = (due: string | null) => {
    if (!due) return '-';
    const d = new Date(due);
    const now = new Date();
    const diff = d.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    const formatted = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (days < 0) return <span className="text-red-600 font-medium">{formatted} (overdue)</span>;
    if (days === 0) return <span className="text-amber-600 font-medium">{formatted} (today)</span>;
    return formatted;
  };

  return (
    <div className="p-4 lg:p-8">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
            <p className="text-muted-foreground mt-1">Manage your daily work and follow-ups</p>
          </div>
          <Button onClick={handleCreateTask}>
            <Plus className="h-4 w-4 mr-2" />
            New Task
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="TODO">To Do</SelectItem>
              <SelectItem value="DOING">Doing</SelectItem>
              <SelectItem value="DONE">Done</SelectItem>
              <SelectItem value="BLOCKED">Blocked</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="LEAD_FOLLOWUP">Lead Follow-up</SelectItem>
              <SelectItem value="OPS">Operations</SelectItem>
              <SelectItem value="CONTENT">Content</SelectItem>
              <SelectItem value="GENERAL">General</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger><SelectValue placeholder="Priority" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="LOW">Low</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="URGENT">Urgent</SelectItem>
            </SelectContent>
          </Select>
          <Select value={assignedFilter} onValueChange={setAssignedFilter}>
            <SelectTrigger><SelectValue placeholder="Assigned To" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Employees</SelectItem>
              {employees.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={duePeriod} onValueChange={setDuePeriod}>
            <SelectTrigger><SelectValue placeholder="Due Date" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Dates</SelectItem>
              <SelectItem value="today">Due Today</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="this_week">This Week</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : tasks.length > 0 ? (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead className="hidden md:table-cell">Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden sm:table-cell">Priority</TableHead>
                      <TableHead className="hidden lg:table-cell">Assigned To</TableHead>
                      <TableHead className="hidden lg:table-cell">Due</TableHead>
                      <TableHead className="hidden xl:table-cell">Lead</TableHead>
                      <TableHead className="w-32">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasks.map((task) => (
                      <TableRow key={task.id} className="group cursor-pointer hover:bg-slate-50" onClick={() => handleOpenTask(task.id)}>
                        <TableCell>
                          <div className="font-medium">{task.title}</div>
                          {task.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 max-w-xs">
                              {task.description}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="text-xs text-muted-foreground">
                            {TYPE_LABELS[task.type] || task.type}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[task.status]}`}>
                            {task.status}
                          </span>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_COLORS[task.priority]}`}>
                            {task.priority}
                          </span>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <span className="text-xs text-muted-foreground">
                            {task.assigned_to_user_id ? employees.find(e => e.id === task.assigned_to_user_id)?.name || 'Unassigned' : 'Unassigned'}
                          </span>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <span className="text-sm">{formatDue(task.due_at)}</span>
                        </TableCell>
                        <TableCell className="hidden xl:table-cell">
                          {task.lead ? (
                            <span className="text-xs text-muted-foreground">
                              {task.lead.name}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenTask(task.id)}
                            className="gap-1.5 text-xs"
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-16">
              <div className="flex flex-col items-center text-center">
                <ListTodo className="h-12 w-12 text-muted-foreground/40 mb-4" />
                <p className="font-medium text-lg text-slate-700">No tasks found</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  {statusFilter !== 'all' || typeFilter !== 'all' || priorityFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Create your first task or run a workflow to generate tasks'}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <TaskModal
        taskId={selectedTaskId}
        open={taskModalOpen}
        onOpenChange={setTaskModalOpen}
        onUpdate={loadTasks}
        onDelete={loadTasks}
      />
    </div>
  );
}
