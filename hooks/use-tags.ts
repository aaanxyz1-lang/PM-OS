import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

export interface Tag {
  id: string;
  workspace_id: string;
  name: string;
  color: string;
  created_at: string;
}

export function useTags(workspaceId: string | undefined) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTags = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tags?workspace_id=${workspaceId}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('Tags fetch failed:', res.status, err);
        setError(err.error || 'Failed to load tags');
        return;
      }
      setTags(await res.json());
    } catch (e) {
      console.error('Tags fetch error:', e);
      setError('Failed to load tags');
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  const createTag = useCallback(
    async (name: string, color: string) => {
      if (!workspaceId) return null;
      try {
        const res = await fetch('/api/tags', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspace_id: workspaceId,
            name,
            color,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          console.error('Create failed:', res.status, err);
          toast.error(err.error || 'Failed to create tag');
          return null;
        }
        const newTag = await res.json();
        setTags((prev) => [...prev, newTag]);
        toast.success('Tag created');
        return newTag;
      } catch (e) {
        console.error('Error creating tag:', e);
        toast.error('Failed to create tag');
        return null;
      }
    },
    [workspaceId]
  );

  const deleteTag = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/tags/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('Delete failed:', res.status, err);
        toast.error(err.error || 'Failed to delete tag');
        return false;
      }
      setTags((prev) => prev.filter((tag) => tag.id !== id));
      toast.success('Tag deleted');
      return true;
    } catch (e) {
      console.error('Error deleting tag:', e);
      toast.error('Failed to delete tag');
      return false;
    }
  }, []);

  return {
    tags,
    loading,
    error,
    createTag,
    deleteTag,
    refresh: loadTags,
  };
}
