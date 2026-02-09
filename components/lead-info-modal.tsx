'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Plus,
  Loader2,
  MessageSquare,
  Target,
  Phone,
  Mail,
  Building2,
  Calendar,
  User,
} from 'lucide-react';
import { useWorkspace } from '@/lib/workspace-context';
import { useCategories } from '@/hooks/use-categories';
import { useTags } from '@/hooks/use-tags';
import { CategorySelect } from '@/components/category-select';
import { SELECT_UNASSIGNED, normalizeSelectValue, denormalizeSelectValue } from '@/lib/select-utils';
import { toast } from 'sonner';

interface LeadInfoModalProps {
  leadId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
  onOpenCreateTask?: (leadId: string, leadName: string) => void;
}

export function LeadInfoModal({
  leadId,
  open,
  onOpenChange,
  onUpdate,
  onOpenCreateTask,
}: LeadInfoModalProps) {
  const { currentWorkspace, employees } = useWorkspace();
  const { categories, createCategory } = useCategories(currentWorkspace?.id);
  const { tags } = useTags(currentWorkspace?.id);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lead, setLead] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');
  const [editMode, setEditMode] = useState(false);

  const [editData, setEditData] = useState({
    status: '',
    source: '',
    qualified_status: '',
    feedback_type_id: '',
    assigned_to: null as string | null,
  });

  useEffect(() => {
    if (open && leadId && currentWorkspace) {
      loadLead();
    }
  }, [open, leadId, currentWorkspace]);

  const loadLead = async () => {
    if (!leadId || !currentWorkspace) return;
    setLoading(true);

    try {
      const [leadRes, activitiesRes, duplicatesRes] = await Promise.all([
        fetch(`/api/leads/${leadId}?workspace_id=${currentWorkspace.id}`),
        fetch(`/api/leads/${leadId}/activities?workspace_id=${currentWorkspace.id}`),
        fetch(`/api/leads/related-duplicates?lead_id=${leadId}&workspace_id=${currentWorkspace.id}`),
      ]);

      if (leadRes.ok) {
        const leadData = await leadRes.json();
        setLead(leadData);
        setEditData({
          status: leadData.status || '',
          source: leadData.source || '',
          qualified_status: leadData.qualified_status || '',
          feedback_type_id: leadData.feedback_type_id || '',
          assigned_to: leadData.assigned_to || null,
        });
      }

      if (activitiesRes.ok) {
        const activitiesData = await activitiesRes.json();
        setActivities(activitiesData);
      }

      if (duplicatesRes.ok) {
        const duplicatesData = await duplicatesRes.json();
        setDuplicates(duplicatesData.duplicates || []);
      }
    } catch (error) {
      console.error('Failed to load lead:', error);
      toast.error('Failed to load lead details');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !leadId || !currentWorkspace) return;
    setSaving(true);

    try {
      const res = await fetch(`/api/leads/${leadId}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: currentWorkspace.id,
          note: newNote,
        }),
      });

      if (res.ok) {
        toast.success('Note added');
        setNewNote('');
        loadLead();
      } else {
        toast.error('Failed to add note');
      }
    } catch (error) {
      toast.error('Failed to add note');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!leadId || !currentWorkspace) return;
    setSaving(true);

    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: currentWorkspace.id,
          ...editData,
        }),
      });

      if (res.ok) {
        toast.success('Lead updated');
        setEditMode(false);
        loadLead();
        onUpdate?.();
      } else {
        toast.error('Failed to update lead');
      }
    } catch (error) {
      toast.error('Failed to update lead');
    } finally {
      setSaving(false);
    }
  };

  if (!open || !leadId) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Target className="h-6 w-6 text-blue-600" />
            {lead?.name || 'Lead Details'}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : lead ? (
          <ScrollArea className="max-h-[calc(90vh-120px)]">
            <div className="px-6 pb-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>Phone</span>
                  </div>
                  <p className="font-medium">{lead.phone}</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span>Email</span>
                  </div>
                  <p className="font-medium">{lead.email || '-'}</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Building2 className="h-4 w-4" />
                    <span>Business</span>
                  </div>
                  <p className="font-medium">{lead.business_name || '-'}</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span>Assigned To</span>
                  </div>
                  <p className="font-medium">{lead.assigned_user?.name || 'Unassigned'}</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Created</span>
                  </div>
                  <p className="font-medium">
                    {new Date(lead.created_at).toLocaleDateString()}
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Target className="h-4 w-4" />
                    <span>Qualified</span>
                  </div>
                  <Badge
                    variant={
                      lead.qualified_status === 'YES'
                        ? 'default'
                        : lead.qualified_status === 'NO'
                        ? 'destructive'
                        : 'secondary'
                    }
                  >
                    {lead.qualified_status || 'PENDING'}
                  </Badge>
                </div>
              </div>

              {lead.notes && (
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <p className="text-sm text-muted-foreground">{lead.notes}</p>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Tags</Label>
                  {lead.tag_ids && lead.tag_ids.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {lead.tag_ids
                        .map((id: string) => tags.find((t) => t.id === id))
                        .filter(Boolean)
                        .map((tag: any) => (
                          <Badge key={tag.id} variant="outline" className="text-xs">
                            {tag.name}
                          </Badge>
                        ))}
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {editMode ? (
                <div className="space-y-4">
                  <h3 className="font-semibold">Update Lead</h3>

                  <div className="space-y-2">
                    <Label>Status</Label>
                    <CategorySelect
                      categories={categories}
                      value={editData.status}
                      onChange={(v) => setEditData({ ...editData, status: v })}
                      onCreateCategory={createCategory}
                      categoryType="LEAD_STATUS"
                      placeholder="Select status"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Source</Label>
                    <CategorySelect
                      categories={categories}
                      value={editData.source}
                      onChange={(v) => setEditData({ ...editData, source: v })}
                      onCreateCategory={createCategory}
                      categoryType="LEAD_SOURCE"
                      placeholder="Select source"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Qualified Status</Label>
                    <Select
                      value={editData.qualified_status}
                      onValueChange={(v) => setEditData({ ...editData, qualified_status: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select qualification" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="YES">Yes</SelectItem>
                        <SelectItem value="NO">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Feedback Type</Label>
                    <CategorySelect
                      categories={categories}
                      value={editData.feedback_type_id}
                      onChange={(v) => setEditData({ ...editData, feedback_type_id: v })}
                      onCreateCategory={createCategory}
                      categoryType="FEEDBACK_TYPE"
                      placeholder="Select feedback type"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Assign To</Label>
                    <Select
                      value={denormalizeSelectValue(editData.assigned_to)}
                      onValueChange={(v) => setEditData({ ...editData, assigned_to: normalizeSelectValue(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select employee" />
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

                  <div className="flex gap-2">
                    <Button onClick={handleUpdate} disabled={saving} className="flex-1">
                      {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Save Changes
                    </Button>
                    <Button variant="outline" onClick={() => setEditMode(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        if (onOpenCreateTask) {
                          onOpenCreateTask(lead.id, lead.name);
                        }
                      }}
                      className="flex-1"
                      variant="default"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Task
                    </Button>
                    <Button onClick={() => setEditMode(true)} variant="outline">
                      Edit Details
                    </Button>
                  </div>
                </div>
              )}

              <Separator />

              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Add Note
                </h3>
                <div className="space-y-2">
                  <Textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Type a note..."
                    rows={3}
                  />
                  <Button
                    onClick={handleAddNote}
                    disabled={!newNote.trim() || saving}
                    size="sm"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Add Note
                  </Button>
                </div>
              </div>

              {duplicates.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold">Related Duplicates ({duplicates.length})</h3>
                  <p className="text-xs text-muted-foreground">Other leads with the same phone number</p>
                  <div className="space-y-2">
                    {duplicates.map((dup) => (
                      <div
                        key={dup.id}
                        className="p-3 bg-orange-50 rounded-lg border border-orange-200 text-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium">{dup.name}</p>
                            <p className="text-xs text-muted-foreground">{dup.phone}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className="text-xs">
                              {dup.status || 'Unknown'}
                            </Badge>
                            {dup.qualified_status && (
                              <Badge
                                variant={dup.qualified_status === 'YES' ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {dup.qualified_status}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Updated: {new Date(dup.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activities.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold">Activity History</h3>
                  <div className="space-y-2">
                    {activities.map((activity) => (
                      <div
                        key={activity.id}
                        className="p-3 bg-slate-50 rounded-lg border text-sm"
                      >
                        <p>{activity.note}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(activity.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        ) : (
          <div className="px-6 pb-6 text-center text-muted-foreground">
            Lead not found
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
