'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ColorPicker } from '@/components/color-picker';
import { BreadcrumbNav } from '@/components/breadcrumb-nav';
import { useWorkspace } from '@/lib/workspace-context';
import { toast } from 'sonner';
import { Loader2, Trash2, Plus } from 'lucide-react';

interface Tag {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export default function TagsPage() {
  const { currentWorkspace, loading: wsLoading } = useWorkspace();
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    color: '#64748b',
  });

  const loadTags = async () => {
    if (!currentWorkspace) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tags?workspace_id=${currentWorkspace.id}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('Tags fetch failed:', res.status, err);
        toast.error(err.error || 'Failed to load tags');
        return;
      }
      setTags(await res.json());
    } catch (e) {
      console.error('Tags fetch error:', e);
      toast.error('Failed to load tags');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!wsLoading) loadTags();
  }, [currentWorkspace?.id, wsLoading]);

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: currentWorkspace?.id,
          name: formData.name,
          color: formData.color,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('Create failed:', res.status, err);
        toast.error(err.error || 'Failed to create tag');
        return;
      }
      toast.success('Tag created');
      setCreateOpen(false);
      setFormData({ name: '', color: '#64748b' });
      loadTags();
    } catch (e) {
      console.error('Error:', e);
      toast.error('Failed to create tag');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setSaving(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/tags/${deleteId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('Delete failed:', res.status, err);
        setDeleteError(err.error || 'Failed to delete tag');
        setSaving(false);
        return;
      }
      toast.success('Tag deleted');
      setDeleteId(null);
      loadTags();
    } catch (e) {
      console.error('Delete error:', e);
      setDeleteError('Failed to delete tag');
      setSaving(false);
    }
  };

  return (
    <div className="p-4 lg:p-8">
      <div className="space-y-6 max-w-2xl">
        <div>
          <BreadcrumbNav
            items={[
              { label: 'Settings', href: '/app/settings' },
              { label: 'Tags' },
            ]}
          />
          <h1 className="text-3xl font-bold tracking-tight">Tags</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage tags for organizing leads and tasks
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>Workspace Tags</CardTitle>
                <CardDescription>
                  Tags can be applied to leads and tasks across your workspace
                </CardDescription>
              </div>
              <Button onClick={() => setCreateOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                New Tag
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : tags.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No tags yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Create your first tag to get started
                </p>
              </div>
            ) : (
              <div className="grid gap-2">
                {tags.map((tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-lg border-2"
                        style={{
                          backgroundColor: tag.color,
                          borderColor: tag.color,
                        }}
                      />
                      <span className="font-medium">{tag.name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteId(tag.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Tag</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="tag-name">Name</Label>
                <Input
                  id="tag-name"
                  placeholder="e.g., High Priority, Urgent"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <ColorPicker
                  value={formData.color}
                  onChange={(color) =>
                    setFormData((prev) => ({ ...prev, color }))
                  }
                />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setCreateOpen(false);
                  setFormData({ name: '', color: '#64748b' });
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Create'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={Boolean(deleteId)} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Tag</AlertDialogTitle>
              <AlertDialogDescription>
                {deleteError ? (
                  <div className="bg-red-50 text-red-700 p-3 rounded-lg border border-red-200">
                    {deleteError}
                  </div>
                ) : (
                  'This action cannot be undone. Make sure this tag is not being used by any leads or tasks.'
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-2 justify-end">
              {deleteError ? (
                <Button onClick={() => setDeleteId(null)}>OK</Button>
              ) : (
                <>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} disabled={saving}>
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Delete'
                    )}
                  </AlertDialogAction>
                </>
              )}
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
