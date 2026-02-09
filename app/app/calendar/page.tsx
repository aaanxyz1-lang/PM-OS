'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Clock,
  User,
  Loader2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { useWorkspace } from '@/lib/workspace-context';
import { SELECT_UNASSIGNED, normalizeSelectValue, denormalizeSelectValue } from '@/lib/select-utils';
import { toast } from 'sonner';
import Link from 'next/link';

interface Task {
  id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  priority: string;
  due_at: string | null;
  start_at: string | null;
  end_at: string | null;
  is_all_day: boolean;
  assigned_to_user_id: string | null;
  lead_id: string | null;
  assigned_user: { id: string; name: string } | null;
  lead: { id: string; name: string } | null;
}

type ViewMode = 'month' | 'week' | 'day';

const TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  LEAD_FOLLOWUP: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-300' },
  CONTENT: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-300' },
  OPS: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-300' },
  GENERAL: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-300' },
};

const STATUS_COLORS: Record<string, string> = {
  TODO: 'bg-slate-100 text-slate-700',
  DOING: 'bg-blue-100 text-blue-700',
  DONE: 'bg-emerald-100 text-emerald-700',
  BLOCKED: 'bg-red-100 text-red-700',
};

export default function CalendarPage() {
  const { currentWorkspace, employees, loading: wsLoading } = useWorkspace();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);

  const loadTasks = useCallback(async () => {
    if (!currentWorkspace) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks?workspace_id=${currentWorkspace.id}`);
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
  }, [currentWorkspace?.id]);

  useEffect(() => {
    if (!wsLoading) loadTasks();
  }, [loadTasks, wsLoading]);

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

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    if (viewMode === 'month') {
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const startDay = new Date(firstDay);
      startDay.setDate(startDay.getDate() - firstDay.getDay());
      const endDay = new Date(lastDay);
      endDay.setDate(endDay.getDate() + (6 - lastDay.getDay()));

      const days: Date[] = [];
      const current = new Date(startDay);
      while (current <= endDay) {
        days.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
      return days;
    } else if (viewMode === 'week') {
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
      const days: Date[] = [];
      for (let i = 0; i < 7; i++) {
        const day = new Date(startOfWeek);
        day.setDate(startOfWeek.getDate() + i);
        days.push(day);
      }
      return days;
    } else {
      return [currentDate];
    }
  }, [currentDate, viewMode]);

  const getTasksForDay = useCallback(
    (date: Date) => {
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      return tasks.filter((task) => {
        if (!task.due_at) return false;
        const dueDate = new Date(task.due_at);
        return dueDate >= dayStart && dueDate < dayEnd;
      });
    },
    [tasks]
  );

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isOverdue = (task: Task) => {
    if (!task.due_at || task.status === 'DONE') return false;
    return new Date(task.due_at) < new Date();
  };

  const handlePrevious = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setDate(newDate.getDate() - 1);
    }
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setCurrentDate(newDate);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setEditOpen(true);
  };

  const handleUpdateTask = async () => {
    if (!selectedTask || !currentWorkspace) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/tasks/${selectedTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: currentWorkspace.id,
          status: selectedTask.status,
          assigned_to_user_id: selectedTask.assigned_to_user_id,
          due_at: selectedTask.due_at,
          title: selectedTask.title,
          description: selectedTask.description,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('Update task failed:', res.status, err);
        toast.error(err.error || 'Failed to update task');
        return;
      }
      toast.success('Task updated');
      setEditOpen(false);
      loadTasks();
    } catch (e) {
      console.error('Update task error:', e);
      toast.error('Failed to update task');
    } finally {
      setSaving(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, date: Date) => {
    e.preventDefault();
    if (!draggedTask || !currentWorkspace) return;

    const newDueDate = new Date(date);
    if (draggedTask.due_at) {
      const oldDue = new Date(draggedTask.due_at);
      newDueDate.setHours(oldDue.getHours(), oldDue.getMinutes(), 0, 0);
    } else {
      newDueDate.setHours(9, 0, 0, 0);
    }

    try {
      const res = await fetch(`/api/tasks/${draggedTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: currentWorkspace.id,
          due_at: newDueDate.toISOString(),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('Reschedule task failed:', res.status, err);
        toast.error(err.error || 'Failed to reschedule task');
        return;
      }
      toast.success('Task rescheduled');
      loadTasks();
    } catch (e) {
      console.error('Reschedule error:', e);
      toast.error('Failed to reschedule task');
    } finally {
      setDraggedTask(null);
    }
  };

  const getViewTitle = () => {
    if (viewMode === 'month') {
      return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } else if (viewMode === 'week') {
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      return `${startOfWeek.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } else {
      return currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    }
  };

  return (
    <div className="p-4 lg:p-8">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
            <p className="text-muted-foreground mt-1">Your daily work planner</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Month</SelectItem>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="day">Day</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {todayTasks.length > 0 && (
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600" />
                Today's Focus ({todayTasks.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {todayTasks.slice(0, 5).map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-2 bg-white rounded-lg border cursor-pointer hover:shadow-sm transition-shadow"
                    onClick={() => handleTaskClick(task)}
                  >
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

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={handlePrevious}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleToday}>
                  Today
                </Button>
                <Button variant="outline" size="sm" onClick={handleNext}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <h2 className="text-lg font-semibold">{getViewTitle()}</h2>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : viewMode === 'month' ? (
              <div className="grid grid-cols-7 gap-px bg-slate-200 rounded-lg overflow-hidden">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="bg-slate-50 p-2 text-center text-xs font-medium text-slate-600">
                    {day}
                  </div>
                ))}
                {calendarDays.map((day) => {
                  const dayTasks = getTasksForDay(day);
                  const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                  return (
                    <div
                      key={day.toISOString()}
                      className={`bg-white p-2 min-h-24 ${isToday(day) ? 'bg-blue-50' : ''} ${
                        !isCurrentMonth ? 'opacity-40' : ''
                      }`}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, day)}
                    >
                      <div className="text-sm font-medium mb-1 text-slate-700">
                        {day.getDate()}
                      </div>
                      <div className="space-y-1">
                        {dayTasks.slice(0, 3).map((task) => {
                          const colors = TYPE_COLORS[task.type] || TYPE_COLORS.GENERAL;
                          const overdue = isOverdue(task);
                          return (
                            <div
                              key={task.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, task)}
                              onClick={() => handleTaskClick(task)}
                              className={`text-xs p-1 rounded border cursor-pointer hover:shadow-sm transition-shadow ${
                                colors.bg
                              } ${colors.text} ${colors.border} ${overdue ? 'border-red-500 border-2' : ''}`}
                            >
                              <div className="truncate font-medium">{task.title}</div>
                            </div>
                          );
                        })}
                        {dayTasks.length > 3 && (
                          <div className="text-[10px] text-slate-500 text-center">
                            +{dayTasks.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : viewMode === 'week' ? (
              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((day) => {
                  const dayTasks = getTasksForDay(day);
                  return (
                    <div key={day.toISOString()}>
                      <div
                        className={`text-center mb-2 pb-2 border-b ${
                          isToday(day) ? 'border-blue-500 font-bold' : ''
                        }`}
                      >
                        <div className="text-xs text-slate-500">
                          {day.toLocaleDateString('en-US', { weekday: 'short' })}
                        </div>
                        <div className="text-lg">{day.getDate()}</div>
                      </div>
                      <div
                        className="space-y-2 min-h-96"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, day)}
                      >
                        {dayTasks.map((task) => {
                          const colors = TYPE_COLORS[task.type] || TYPE_COLORS.GENERAL;
                          const overdue = isOverdue(task);
                          return (
                            <div
                              key={task.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, task)}
                              onClick={() => handleTaskClick(task)}
                              className={`p-2 rounded-lg border cursor-pointer hover:shadow-md transition-shadow ${
                                colors.bg
                              } ${colors.text} ${colors.border} ${overdue ? 'border-red-500 border-2' : ''}`}
                            >
                              <div className="font-medium text-sm truncate">{task.title}</div>
                              {task.due_at && (
                                <div className="text-xs opacity-75 mt-1">
                                  {new Date(task.due_at).toLocaleTimeString('en-US', {
                                    hour: 'numeric',
                                    minute: '2-digit',
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3">
                {getTasksForDay(currentDate).length > 0 ? (
                  getTasksForDay(currentDate).map((task) => {
                    const colors = TYPE_COLORS[task.type] || TYPE_COLORS.GENERAL;
                    const overdue = isOverdue(task);
                    return (
                      <div
                        key={task.id}
                        onClick={() => handleTaskClick(task)}
                        className={`p-4 rounded-lg border cursor-pointer hover:shadow-md transition-shadow ${
                          colors.bg
                        } ${colors.text} ${colors.border} ${overdue ? 'border-red-500 border-2' : ''}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-base">{task.title}</div>
                            {task.description && (
                              <p className="text-sm opacity-75 mt-1">{task.description}</p>
                            )}
                            <div className="flex items-center gap-3 mt-2 text-xs">
                              {task.due_at && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {new Date(task.due_at).toLocaleTimeString('en-US', {
                                    hour: 'numeric',
                                    minute: '2-digit',
                                  })}
                                </span>
                              )}
                              {task.assigned_user && (
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {task.assigned_user.name}
                                </span>
                              )}
                              {task.lead && (
                                <Link href={`/app/leads/${task.lead.id}`} onClick={(e) => e.stopPropagation()}>
                                  <Badge variant="outline" className="text-xs gap-1">
                                    {task.lead.name}
                                    <ExternalLink className="h-2.5 w-2.5" />
                                  </Badge>
                                </Link>
                              )}
                            </div>
                          </div>
                          <Badge className={`${STATUS_COLORS[task.status]} ml-3`}>
                            {task.status}
                          </Badge>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-12">
                    <CalendarDays className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">No tasks scheduled for this day</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Task Details</DialogTitle>
            </DialogHeader>
            {selectedTask && (
              <div className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={selectedTask.title}
                    onChange={(e) => setSelectedTask({ ...selectedTask, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={selectedTask.description || ''}
                    onChange={(e) =>
                      setSelectedTask({ ...selectedTask, description: e.target.value })
                    }
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={selectedTask.status}
                      onValueChange={(v) => setSelectedTask({ ...selectedTask, status: v })}
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
                  <div className="space-y-2">
                    <Label>Assigned To</Label>
                    <Select
                      value={denormalizeSelectValue(selectedTask.assigned_to_user_id)}
                      onValueChange={(v) =>
                        setSelectedTask({
                          ...selectedTask,
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
                </div>
                <div className="space-y-2">
                  <Label>Due Date & Time</Label>
                  <Input
                    type="datetime-local"
                    value={
                      selectedTask.due_at
                        ? new Date(selectedTask.due_at).toISOString().slice(0, 16)
                        : ''
                    }
                    onChange={(e) =>
                      setSelectedTask({
                        ...selectedTask,
                        due_at: e.target.value ? new Date(e.target.value).toISOString() : null,
                      })
                    }
                  />
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={handleUpdateTask} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                  {selectedTask.lead && (
                    <Link href={`/app/leads/${selectedTask.lead.id}`}>
                      <Button variant="outline" size="icon">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </Link>
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
