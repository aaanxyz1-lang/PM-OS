'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Trash2,
  Clock,
  MessageSquare,
  Phone,
  ArrowUpDown,
  Loader2,
  Send,
  User,
  ListTodo,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import { useWorkspace } from '@/lib/workspace-context';
import { toast } from 'sonner';

interface Lead {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  source: string;
  status: string;
  assigned_to: string | null;
  assigned_user: { id: string; name: string; email: string } | null;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface Activity {
  id: string;
  action: string;
  type: string;
  description?: string;
  user_name: string;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  won: 'bg-emerald-100 text-emerald-700',
  lost: 'bg-red-100 text-red-700',
};

const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  in_progress: 'In Progress',
  won: 'Won',
  lost: 'Lost',
};

interface LeadTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_at: string | null;
  assigned_user: { id: string; name: string } | null;
}

const TASK_STATUS_COLORS: Record<string, string> = {
  TODO: 'bg-slate-100 text-slate-700',
  DOING: 'bg-blue-100 text-blue-700',
  DONE: 'bg-emerald-100 text-emerald-700',
  BLOCKED: 'bg-red-100 text-red-700',
};

const SOURCES = ['Website', 'Referral', 'LinkedIn', 'Cold Call', 'Trade Show'];

const ACTIVITY_ICONS: Record<string, typeof MessageSquare> = {
  note: MessageSquare,
  call: Phone,
  status_change: ArrowUpDown,
  created: Clock,
  updated: Clock,
};

export default function LeadDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { currentWorkspace, employees } = useWorkspace();
  const [lead, setLead] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Lead>>({});
  const [saving, setSaving] = useState(false);
  const [activityType, setActivityType] = useState('note');
  const [activityContent, setActivityContent] = useState('');
  const [addingActivity, setAddingActivity] = useState(false);
  const [relatedTasks, setRelatedTasks] = useState<LeadTask[]>([]);

  const loadLead = useCallback(async () => {
    if (!currentWorkspace) return;
    try {
      const [leadRes, tasksRes] = await Promise.all([
        fetch(`/api/leads/${id}?workspace_id=${currentWorkspace.id}`),
        fetch(`/api/tasks?workspace_id=${currentWorkspace.id}&lead_id=${id}`),
      ]);
      if (leadRes.ok) {
        const data = await leadRes.json();
        setLead(data.lead);
        setEditData(data.lead);
        setActivities(data.activities);
      }
      if (tasksRes.ok) {
        setRelatedTasks(await tasksRes.json());
      }
    } catch {
      toast.error('Failed to load lead');
    } finally {
      setLoading(false);
    }
  }, [id, currentWorkspace?.id]);

  useEffect(() => {
    loadLead();
  }, [loadLead]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editData,
          workspace_id: currentWorkspace?.id,
        }),
      });

      if (res.ok) {
        toast.success('Lead updated');
        setEditing(false);
        loadLead();
      } else {
        toast.error('Failed to update lead');
      }
    } catch {
      toast.error('Failed to update lead');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this lead? This cannot be undone.')) return;
    try {
      const res = await fetch(
        `/api/leads/${id}?workspace_id=${currentWorkspace?.id}`,
        { method: 'DELETE' }
      );
      if (res.ok) {
        toast.success('Lead deleted');
        router.push('/app/leads');
      }
    } catch {
      toast.error('Failed to delete lead');
    }
  };

  const handleAddActivity = async () => {
    if (!activityContent.trim()) return;
    setAddingActivity(true);
    try {
      const res = await fetch(`/api/leads/${id}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: activityType,
          content: activityContent,
          workspace_id: currentWorkspace?.id,
        }),
      });
      if (res.ok) {
        toast.success('Activity added');
        setActivityContent('');
        loadLead();
      }
    } catch {
      toast.error('Failed to add activity');
    } finally {
      setAddingActivity(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Lead not found</p>
        <Link href="/app/leads">
          <Button variant="outline" className="mt-4">
            Back to Leads
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8">
      <div className="space-y-6">
        <Link href="/app/leads">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Leads
          </Button>
        </Link>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Lead Information</CardTitle>
                {!editing ? (
                  <Button size="sm" onClick={() => setEditing(true)}>
                    Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditing(false);
                        setEditData(lead);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={saving}>
                      {saving ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    {editing ? (
                      <Input
                        value={editData.name || ''}
                        onChange={(e) =>
                          setEditData({ ...editData, name: e.target.value })
                        }
                      />
                    ) : (
                      <p className="font-medium">{lead.name}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    {editing ? (
                      <Input
                        value={editData.phone || ''}
                        onChange={(e) =>
                          setEditData({ ...editData, phone: e.target.value })
                        }
                      />
                    ) : (
                      <p className="font-medium">{lead.phone || '-'}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    {editing ? (
                      <Input
                        type="email"
                        value={editData.email || ''}
                        onChange={(e) =>
                          setEditData({ ...editData, email: e.target.value })
                        }
                      />
                    ) : (
                      <p className="font-medium">{lead.email || '-'}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Source</Label>
                    {editing ? (
                      <Select
                        value={editData.source || ''}
                        onValueChange={(v) =>
                          setEditData({ ...editData, source: v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select source" />
                        </SelectTrigger>
                        <SelectContent>
                          {SOURCES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="font-medium">{lead.source || '-'}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    {editing ? (
                      <Select
                        value={editData.status || ''}
                        onValueChange={(v) =>
                          setEditData({ ...editData, status: v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">New</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="won">Won</SelectItem>
                          <SelectItem value="lost">Lost</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          STATUS_COLORS[lead.status] || 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {STATUS_LABELS[lead.status] || lead.status}
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Assigned To</Label>
                    {editing ? (
                      <Select
                        value={editData.assigned_to || ''}
                        onValueChange={(v) =>
                          setEditData({ ...editData, assigned_to: v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select employee" />
                        </SelectTrigger>
                        <SelectContent>
                          {employees.map((emp) => (
                            <SelectItem key={emp.id} value={emp.id}>
                              {emp.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium">
                          {lead.assigned_user?.name || 'Unassigned'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <Separator className="my-6" />

                <div className="space-y-2">
                  <Label>Notes</Label>
                  {editing ? (
                    <Textarea
                      value={editData.notes || ''}
                      onChange={(e) =>
                        setEditData({ ...editData, notes: e.target.value })
                      }
                      rows={4}
                    />
                  ) : (
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {lead.notes || 'No notes added'}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ListTodo className="h-4 w-4" />
                  Related Tasks ({relatedTasks.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {relatedTasks.length > 0 ? (
                  <div className="space-y-2">
                    {relatedTasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {task.status === 'DONE' ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                          ) : (
                            <div className="h-4 w-4 rounded-full border-2 border-slate-300 shrink-0" />
                          )}
                          <span className={`text-sm truncate ${task.status === 'DONE' ? 'line-through text-muted-foreground' : ''}`}>
                            {task.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TASK_STATUS_COLORS[task.status]}`}>
                            {task.status}
                          </span>
                        </div>
                      </div>
                    ))}
                    <Link href="/app/tasks" className="block mt-2">
                      <Button variant="ghost" size="sm" className="w-full gap-1.5 text-xs">
                        View all tasks
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No tasks linked to this lead
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Activity Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Select value={activityType} onValueChange={setActivityType}>
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="note">Note</SelectItem>
                        <SelectItem value="call">Call Log</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex-1 flex gap-2">
                      <Input
                        placeholder={
                          activityType === 'call'
                            ? 'Log a call...'
                            : 'Add a note...'
                        }
                        value={activityContent}
                        onChange={(e) => setActivityContent(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleAddActivity();
                          }
                        }}
                      />
                      <Button
                        size="icon"
                        onClick={handleAddActivity}
                        disabled={addingActivity || !activityContent.trim()}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <Separator />

                {activities.length > 0 ? (
                  <div className="space-y-4">
                    {activities.map((activity) => {
                      const Icon = ACTIVITY_ICONS[activity.type] || Clock;
                      return (
                        <div key={activity.id} className="flex gap-3">
                          <div className="mt-0.5 shrink-0">
                            <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center">
                              <Icon className="h-3.5 w-3.5 text-slate-600" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{activity.action}</p>
                            {activity.description && (
                              <p className="text-sm text-muted-foreground mt-0.5">
                                {activity.description}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {activity.user_name} &middot;{' '}
                              {new Date(activity.created_at).toLocaleDateString(
                                'en-US',
                                {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                }
                              )}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No activity yet
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-lg text-red-900">Danger Zone</CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full"
                  onClick={handleDelete}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Lead
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
