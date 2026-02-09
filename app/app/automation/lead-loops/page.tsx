'use client';

import { useState, useEffect } from 'react';
import { useWorkspace } from '@/lib/workspace-context';
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
import { Textarea } from '@/components/ui/textarea';
import { BreadcrumbNav } from '@/components/breadcrumb-nav';
import { toast } from 'sonner';
import { Loader2, Trash2, Edit2, Plus, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface LoopTemplate {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export default function LeadLoopsPage() {
  const { currentWorkspace, loading: wsLoading } = useWorkspace();
  const [loops, setLoops] = useState<LoopTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  const loadLoops = async () => {
    if (!currentWorkspace) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/lead-loops?workspace_id=${currentWorkspace.id}`
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('Load loops error:', err);
        toast.error('Failed to load loops');
        return;
      }
      setLoops(await res.json());
    } catch (e) {
      console.error('Load loops error:', e);
      toast.error('Failed to load loops');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!wsLoading) loadLoops();
  }, [currentWorkspace?.id, wsLoading]);

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/lead-loops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: currentWorkspace?.id,
          name: formData.name,
          description: formData.description || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('Create loop error:', err);
        toast.error(err.error || 'Failed to create loop');
        return;
      }

      toast.success('Loop template created');
      setCreateOpen(false);
      setFormData({ name: '', description: '' });
      loadLoops();
    } catch (e) {
      console.error('Create loop error:', e);
      toast.error('Failed to create loop');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setSaving(true);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/lead-loops/${deleteId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('Delete error:', err);
        setDeleteError(err.error || 'Failed to delete loop');
        setSaving(false);
        return;
      }

      toast.success('Loop deleted');
      setDeleteId(null);
      loadLoops();
    } catch (e) {
      console.error('Delete error:', e);
      setDeleteError('Failed to delete loop');
      setSaving(false);
    }
  };

  return (
    <div className="p-4 lg:p-8">
      <div className="space-y-6 max-w-4xl">
        <div>
          <BreadcrumbNav
            items={[
              { label: 'Automation', href: '/app/automation' },
              { label: 'Lead Loops' },
            ]}
          />
          <h1 className="text-3xl font-bold tracking-tight">Lead Loops</h1>
          <p className="text-muted-foreground mt-1">
            Create automated follow-up sequences for qualified leads
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>Loop Templates</CardTitle>
                  <CardDescription>
                    Define multi-step follow-up sequences
                  </CardDescription>
                </div>
                <Button
                  onClick={() => setCreateOpen(true)}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  New Loop
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loops.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No loops yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Create your first loop to automate lead follow-ups
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {loops.map((loop) => (
                    <Link key={loop.id} href={`/app/automation/lead-loops/${loop.id}`}>
                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border hover:bg-slate-100 transition-colors cursor-pointer">
                        <div className="flex-1">
                          <p className="font-medium">{loop.name}</p>
                          {loop.description && (
                            <p className="text-sm text-muted-foreground">
                              {loop.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault();
                              setDeleteId(loop.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                          <ChevronRight className="h-4 w-4 text-slate-400" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Loop Template</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Ecommerce SaaS Follow-up"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe this loop workflow..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setCreateOpen(false);
                  setFormData({ name: '', description: '' });
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

        {deleteId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="max-w-md">
              <CardHeader>
                <CardTitle>Delete Loop</CardTitle>
                <CardDescription>
                  {deleteError ? (
                    <div className="bg-red-50 text-red-700 p-3 rounded-lg border border-red-200 mt-2">
                      {deleteError}
                    </div>
                  ) : (
                    'Are you sure? Leads using this loop will be unaffected.'
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex gap-2 justify-end">
                {deleteError ? (
                  <Button onClick={() => setDeleteId(null)}>OK</Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setDeleteId(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleDelete}
                      disabled={saving}
                      variant="destructive"
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Delete'
                      )}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
