'use client';

import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ColorPicker } from '@/components/color-picker';
import { Plus, Loader2 } from 'lucide-react';
import { Category, CategoryType } from '@/hooks/use-categories';
import { toast } from 'sonner';

interface CategorySelectProps {
  categories: Category[];
  value: string | null;
  onChange: (id: string) => void;
  onCreateCategory: (type: CategoryType, name: string, color: string) => Promise<Category | null>;
  categoryType: CategoryType;
  placeholder?: string;
  showAdd?: boolean;
}

export function CategorySelect({
  categories,
  value,
  onChange,
  onCreateCategory,
  categoryType,
  placeholder = 'Select...',
  showAdd = true,
}: CategorySelectProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#64748b');

  const filteredCategories = categories.filter((cat) => cat.type === categoryType);

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error('Name is required');
      return;
    }

    setSaving(true);
    try {
      const newCategory = await onCreateCategory(categoryType, newCategoryName, newCategoryColor);
      if (newCategory) {
        onChange(newCategory.id);
        setCreateOpen(false);
        setNewCategoryName('');
        setNewCategoryColor('#64748b');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <Select value={value || ''} onValueChange={onChange}>
            <SelectTrigger>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {filteredCategories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                    {cat.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {showAdd && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCreateOpen(true)}
            className="gap-1"
          >
            <Plus className="h-3 w-3" />
            Add
          </Button>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="cat-name">Name</Label>
              <Input
                id="cat-name"
                placeholder="e.g., High Priority"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <ColorPicker
                value={newCategoryColor}
                onChange={setNewCategoryColor}
              />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setCreateOpen(false);
                setNewCategoryName('');
                setNewCategoryColor('#64748b');
              }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateCategory} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Create'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
