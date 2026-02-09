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
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ColorPicker } from '@/components/color-picker';
import { BreadcrumbNav } from '@/components/breadcrumb-nav';
import { useWorkspace } from '@/lib/workspace-context';
import { toast } from 'sonner';
import { Loader2, Trash2, Edit2, Plus } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  color: string;
  type: string;
  is_active: boolean;
}

type CategoryType = 'LEAD_SOURCE' | 'LEAD_STATUS' | 'TASK_STATUS' | 'FEEDBACK_TYPE' | 'TAG';

const CATEGORY_TYPES: Array<{ value: CategoryType; label: string; description: string }> = [
  {
    value: 'LEAD_SOURCE',
    label: 'Lead Sources',
    description: 'Where leads come from (e.g., Website, Referral, Social Media)',
  },
  {
    value: 'LEAD_STATUS',
    label: 'Lead Status',
    description: 'Lead pipeline stages (e.g., Qualified, Negotiating, Closed)',
  },
  {
    value: 'TASK_STATUS',
    label: 'Task Status',
    description: 'Task workflow states (e.g., To Do, In Progress, Done)',
  },
  {
    value: 'FEEDBACK_TYPE',
    label: 'Feedback Types',
    description: 'Feedback categories (e.g., Bug, Feature Request, Improvement)',
  },
  {
    value: 'TAG',
    label: 'Tags',
    description: 'Cross-module tags for organizing items',
  },
];

export default function CategoriesPage() {
  const { currentWorkspace, loading: wsLoading } = useWorkspace();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<CategoryType>('LEAD_SOURCE');
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    color: '#64748b',
  });

  const loadCategories = async () => {
    if (!currentWorkspace) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/categories?workspace_id=${currentWorkspace.id}`
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('Categories fetch failed:', res.status, err);
        toast.error(err.error || 'Failed to load categories');
        return;
      }
      setCategories(await res.json());
    } catch (e) {
      console.error('Categories fetch error:', e);
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!wsLoading) loadCategories();
  }, [currentWorkspace?.id, wsLoading]);

  const handleCreateOrEdit = async () => {
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        const res = await fetch(`/api/categories/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            color: formData.color,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          console.error('Update failed:', res.status, err);
          toast.error(err.error || 'Failed to update category');
          return;
        }
        toast.success('Category updated');
      } else {
        const res = await fetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspace_id: currentWorkspace?.id,
            type: activeTab,
            name: formData.name,
            color: formData.color,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          console.error('Create failed:', res.status, err);
          toast.error(err.error || 'Failed to create category');
          return;
        }
        toast.success('Category created');
      }
      setCreateOpen(false);
      setEditingId(null);
      setFormData({ name: '', color: '#64748b' });
      loadCategories();
    } catch (e) {
      console.error('Error:', e);
      toast.error('Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setSaving(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/categories/${deleteId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('Delete failed:', res.status, err);
        setDeleteError(err.error || 'Failed to delete category');
        setSaving(false);
        return;
      }
      toast.success('Category deleted');
      setDeleteId(null);
      loadCategories();
    } catch (e) {
      console.error('Delete error:', e);
      setDeleteError('Failed to delete category');
      setSaving(false);
    }
  };

  const handleEdit = (category: Category) => {
    setEditingId(category.id);
    setFormData({ name: category.name, color: category.color });
    setCreateOpen(true);
  };

  const filteredCategories = categories.filter((c) => c.type === activeTab);

  return (
    <div className="p-4 lg:p-8">
      <div className="space-y-6 max-w-4xl">
        <div>
          <BreadcrumbNav
            items={[
              { label: 'Settings', href: '/app/settings' },
              { label: 'Categories' },
            ]}
          />
          <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
          <p className="text-muted-foreground mt-1">
            Customize categories used across your workspace
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as CategoryType)}>
            <TabsList className="grid w-full grid-cols-5">
              {CATEGORY_TYPES.map((type) => (
                <TabsTrigger key={type.value} value={type.value} className="text-xs">
                  {type.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {CATEGORY_TYPES.map((type) => (
              <TabsContent key={type.value} value={type.value} className="mt-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{type.label}</CardTitle>
                        <CardDescription>{type.description}</CardDescription>
                      </div>
                      <Button
                        onClick={() => {
                          setEditingId(null);
                          setFormData({ name: '', color: '#64748b' });
                          setCreateOpen(true);
                        }}
                        className="gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Add Category
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {filteredCategories.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">No categories yet</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Create your first category to get started
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {filteredCategories.map((category) => (
                          <div
                            key={category.id}
                            className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className="w-4 h-4 rounded-lg border-2"
                                style={{
                                  backgroundColor: category.color,
                                  borderColor: category.color,
                                }}
                              />
                              <span className="font-medium">{category.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(category)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteId(category.id)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        )}

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingId ? 'Edit Category' : 'Create Category'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Website, Referral"
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
                  setEditingId(null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateOrEdit} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  (editingId ? 'Update' : 'Create')
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={Boolean(deleteId)} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Category</AlertDialogTitle>
              <AlertDialogDescription>
                {deleteError ? (
                  <div className="bg-red-50 text-red-700 p-3 rounded-lg border border-red-200">
                    {deleteError}
                  </div>
                ) : (
                  'This action cannot be undone. Make sure this category is not being used.'
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
