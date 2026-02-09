'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { CategorySelect } from '@/components/category-select';
import { useCategories } from '@/hooks/use-categories';
import { useTags } from '@/hooks/use-tags';

interface BulkUpdateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedLeadIds: string[];
  workspaceId?: string;
  onSuccess?: () => void;
}

export function BulkUpdateModal({
  open,
  onOpenChange,
  selectedLeadIds,
  workspaceId,
  onSuccess,
}: BulkUpdateModalProps) {
  const { categories, createCategory } = useCategories(workspaceId);
  const { tags } = useTags(workspaceId);

  const [loading, setLoading] = useState(false);

  const [updates, setUpdates] = useState({
    status: false,
    statusValue: '',
    source: false,
    sourceValue: '',
    qualified: false,
    qualifiedValue: '',
    feedback: false,
    feedbackValue: '',
    tagsAdd: false,
    tagsAddValue: [] as string[],
    tagsRemove: false,
    tagsRemoveValue: [] as string[],
  });

  const handleUpdate = async () => {
    const updateData: any = {
      workspace_id: workspaceId,
      lead_ids: selectedLeadIds,
    };

    if (updates.status && updates.statusValue)
      updateData.status = updates.statusValue;
    if (updates.source && updates.sourceValue)
      updateData.source = updates.sourceValue;
    if (updates.qualified && updates.qualifiedValue)
      updateData.qualified_status = updates.qualifiedValue;
    if (updates.feedback && updates.feedbackValue)
      updateData.feedback_type_id = updates.feedbackValue;
    if (updates.tagsAdd && updates.tagsAddValue.length > 0)
      updateData.tags_add = updates.tagsAddValue;
    if (updates.tagsRemove && updates.tagsRemoveValue.length > 0)
      updateData.tags_remove = updates.tagsRemoveValue;

    if (Object.keys(updateData).length === 3) {
      toast.error('Please select at least one field to update');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/leads/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`Updated ${data.updated} leads`);
        onOpenChange(false);
        setUpdates({
          status: false,
          statusValue: '',
          source: false,
          sourceValue: '',
          qualified: false,
          qualifiedValue: '',
          feedback: false,
          feedbackValue: '',
          tagsAdd: false,
          tagsAddValue: [],
          tagsRemove: false,
          tagsRemoveValue: [],
        });
        onSuccess?.();
      } else {
        toast.error('Failed to update leads');
      }
    } catch (error) {
      toast.error('Failed to update leads');
    } finally {
      setLoading(false);
    }
  };

  const statusCategories = categories.filter((c) => c.type === 'LEAD_STATUS');
  const sourceCategories = categories.filter((c) => c.type === 'LEAD_SOURCE');
  const feedbackCategories = categories.filter((c) => c.type === 'FEEDBACK_TYPE');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Update Leads</DialogTitle>
          <DialogDescription>
            Update {selectedLeadIds.length} lead{selectedLeadIds.length !== 1 ? 's' : ''} with custom fields
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="status"
                checked={updates.status}
                onCheckedChange={(checked) =>
                  setUpdates({ ...updates, status: !!checked })
                }
              />
              <Label htmlFor="status" className="cursor-pointer">
                Status
              </Label>
            </div>
            {updates.status && (
              <CategorySelect
                categories={categories}
                value={updates.statusValue}
                onChange={(v) => setUpdates({ ...updates, statusValue: v })}
                onCreateCategory={createCategory}
                categoryType="LEAD_STATUS"
                placeholder="Select status"
              />
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="source"
                checked={updates.source}
                onCheckedChange={(checked) =>
                  setUpdates({ ...updates, source: !!checked })
                }
              />
              <Label htmlFor="source" className="cursor-pointer">
                Source
              </Label>
            </div>
            {updates.source && (
              <CategorySelect
                categories={categories}
                value={updates.sourceValue}
                onChange={(v) => setUpdates({ ...updates, sourceValue: v })}
                onCreateCategory={createCategory}
                categoryType="LEAD_SOURCE"
                placeholder="Select source"
              />
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="qualified"
                checked={updates.qualified}
                onCheckedChange={(checked) =>
                  setUpdates({ ...updates, qualified: !!checked })
                }
              />
              <Label htmlFor="qualified" className="cursor-pointer">
                Qualified Status
              </Label>
            </div>
            {updates.qualified && (
              <Select
                value={updates.qualifiedValue}
                onValueChange={(v) =>
                  setUpdates({ ...updates, qualifiedValue: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="YES">Yes</SelectItem>
                  <SelectItem value="NO">No</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="feedback"
                checked={updates.feedback}
                onCheckedChange={(checked) =>
                  setUpdates({ ...updates, feedback: !!checked })
                }
              />
              <Label htmlFor="feedback" className="cursor-pointer">
                Feedback Type
              </Label>
            </div>
            {updates.feedback && (
              <CategorySelect
                categories={categories}
                value={updates.feedbackValue}
                onChange={(v) => setUpdates({ ...updates, feedbackValue: v })}
                onCreateCategory={createCategory}
                categoryType="FEEDBACK_TYPE"
                placeholder="Select feedback type"
              />
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="tags-add"
                checked={updates.tagsAdd}
                onCheckedChange={(checked) =>
                  setUpdates({ ...updates, tagsAdd: !!checked })
                }
              />
              <Label htmlFor="tags-add" className="cursor-pointer">
                Add Tags
              </Label>
            </div>
            {updates.tagsAdd && (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1">
                  {tags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => {
                        if (updates.tagsAddValue.includes(tag.id)) {
                          setUpdates({
                            ...updates,
                            tagsAddValue: updates.tagsAddValue.filter((id) => id !== tag.id),
                          });
                        } else {
                          setUpdates({
                            ...updates,
                            tagsAddValue: [...updates.tagsAddValue, tag.id],
                          });
                        }
                      }}
                      className={`px-2 py-1 rounded-full text-xs border transition-colors ${
                        updates.tagsAddValue.includes(tag.id)
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="tags-remove"
                checked={updates.tagsRemove}
                onCheckedChange={(checked) =>
                  setUpdates({ ...updates, tagsRemove: !!checked })
                }
              />
              <Label htmlFor="tags-remove" className="cursor-pointer">
                Remove Tags
              </Label>
            </div>
            {updates.tagsRemove && (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1">
                  {tags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => {
                        if (updates.tagsRemoveValue.includes(tag.id)) {
                          setUpdates({
                            ...updates,
                            tagsRemoveValue: updates.tagsRemoveValue.filter((id) => id !== tag.id),
                          });
                        } else {
                          setUpdates({
                            ...updates,
                            tagsRemoveValue: [...updates.tagsRemoveValue, tag.id],
                          });
                        }
                      }}
                      className={`px-2 py-1 rounded-full text-xs border transition-colors ${
                        updates.tagsRemoveValue.includes(tag.id)
                          ? 'bg-red-100 text-red-900 border-red-300'
                          : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleUpdate} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Update Leads
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
