import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

export interface Category {
  id: string;
  workspace_id: string;
  type: string;
  name: string;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type CategoryType = 'LEAD_SOURCE' | 'LEAD_STATUS' | 'TASK_STATUS' | 'FEEDBACK_TYPE' | 'TAG';

export function useCategories(workspaceId: string | undefined, categoryType?: CategoryType) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError(null);
    try {
      const url = new URL('/api/categories', window.location.origin);
      url.searchParams.append('workspace_id', workspaceId);
      if (categoryType) {
        url.searchParams.append('type', categoryType);
      }

      const res = await fetch(url);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('Categories fetch failed:', res.status, err);
        setError(err.error || 'Failed to load categories');
        return;
      }
      setCategories(await res.json());
    } catch (e) {
      console.error('Categories fetch error:', e);
      setError('Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, [workspaceId, categoryType]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const createCategory = useCallback(
    async (type: CategoryType, name: string, color: string) => {
      if (!workspaceId) return null;
      try {
        const res = await fetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspace_id: workspaceId,
            type,
            name,
            color,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          console.error('Create failed:', res.status, err);
          toast.error(err.error || 'Failed to create category');
          return null;
        }
        const newCategory = await res.json();
        setCategories((prev) => [...prev, newCategory]);
        toast.success('Category created');
        return newCategory;
      } catch (e) {
        console.error('Error creating category:', e);
        toast.error('Failed to create category');
        return null;
      }
    },
    [workspaceId]
  );

  const updateCategory = useCallback(async (id: string, name: string, color: string) => {
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('Update failed:', res.status, err);
        toast.error(err.error || 'Failed to update category');
        return null;
      }
      const updated = await res.json();
      setCategories((prev) =>
        prev.map((cat) => (cat.id === id ? updated : cat))
      );
      toast.success('Category updated');
      return updated;
    } catch (e) {
      console.error('Error updating category:', e);
      toast.error('Failed to update category');
      return null;
    }
  }, []);

  return {
    categories,
    loading,
    error,
    createCategory,
    updateCategory,
    refresh: loadCategories,
  };
}
