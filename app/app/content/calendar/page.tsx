'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Clock,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { BreadcrumbNav } from '@/components/breadcrumb-nav';
import { useWorkspace } from '@/lib/workspace-context';
import { toast } from 'sonner';

interface Task {
  id: string;
  title: string;
  type: string;
  status: string;
  due_at: string | null;
  platform: string | null;
}

type ViewMode = 'month' | 'week' | 'day';

const STATUS_COLORS: Record<string, string> = {
  TODO: 'bg-slate-100 text-slate-700',
  DOING: 'bg-blue-100 text-blue-700',
  DONE: 'bg-emerald-100 text-emerald-700',
  BLOCKED: 'bg-red-100 text-red-700',
};

const PLATFORM_COLORS: Record<string, { bg: string; text: string }> = {
  FB: { bg: 'bg-blue-100', text: 'text-blue-700' },
  IG: { bg: 'bg-purple-100', text: 'text-purple-700' },
  YT: { bg: 'bg-red-100', text: 'text-red-700' },
  Blog: { bg: 'bg-slate-100', text: 'text-slate-700' },
};

export default function ContentCalendarPage() {
  const { currentWorkspace, loading: wsLoading } = useWorkspace();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());

  const loadTasks = useCallback(async () => {
    if (!currentWorkspace) return;
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
  }, [currentWorkspace?.id]);

  useEffect(() => {
    if (!wsLoading) loadTasks();
  }, [loadTasks, wsLoading]);

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
        <div>
          <BreadcrumbNav
            items={[
              { label: 'Content', href: '/app/content/tasks' },
              { label: 'Calendar' },
            ]}
          />
          <h1 className="text-3xl font-bold tracking-tight">Content Calendar</h1>
          <p className="text-muted-foreground mt-1">Plan and track your content publishing schedule</p>
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
                    >
                      <div className="text-sm font-medium mb-1 text-slate-700">
                        {day.getDate()}
                      </div>
                      <div className="space-y-1">
                        {dayTasks.slice(0, 3).map((task) => {
                          const platformColor =
                            PLATFORM_COLORS[task.platform || 'Blog'] || PLATFORM_COLORS.Blog;
                          const overdue = isOverdue(task);
                          return (
                            <div
                              key={task.id}
                              className={`text-xs p-1 rounded border cursor-pointer hover:shadow-sm transition-shadow ${
                                platformColor.bg
                              } ${platformColor.text} ${overdue ? 'border-red-500 border-2' : ''}`}
                            >
                              <div className="truncate font-medium">{task.title}</div>
                              {task.platform && (
                                <div className="text-[10px] opacity-75">{task.platform}</div>
                              )}
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
                      <div className="space-y-2 min-h-96">
                        {dayTasks.map((task) => {
                          const platformColor =
                            PLATFORM_COLORS[task.platform || 'Blog'] || PLATFORM_COLORS.Blog;
                          const overdue = isOverdue(task);
                          return (
                            <div
                              key={task.id}
                              className={`p-2 rounded-lg border cursor-pointer hover:shadow-md transition-shadow ${
                                platformColor.bg
                              } ${platformColor.text} ${overdue ? 'border-red-500 border-2' : ''}`}
                            >
                              <div className="font-medium text-sm truncate">{task.title}</div>
                              {task.platform && (
                                <div className="text-xs opacity-75 mt-1">{task.platform}</div>
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
                    const platformColor =
                      PLATFORM_COLORS[task.platform || 'Blog'] || PLATFORM_COLORS.Blog;
                    const overdue = isOverdue(task);
                    return (
                      <div
                        key={task.id}
                        className={`p-4 rounded-lg border cursor-pointer hover:shadow-md transition-shadow ${
                          platformColor.bg
                        } ${platformColor.text} ${overdue ? 'border-red-500 border-2' : ''}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-base">{task.title}</div>
                            {task.platform && (
                              <Badge variant="outline" className="mt-2">
                                {task.platform}
                              </Badge>
                            )}
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
                    <p className="text-slate-500">No content scheduled for this day</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
