'use client';

import { useEffect, useState } from 'react';
import { useWorkspace } from '@/lib/workspace-context';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Edit2, Plus } from 'lucide-react';

interface MessageTemplate {
  id: string;
  name: string;
  channel: string;
  content: string;
  variables?: Record<string, any>;
  is_active: boolean;
  created_at: string;
}

export default function TemplatesPage() {
  const { currentWorkspace } = useWorkspace();
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    channel: 'WHATSAPP',
    content: '',
  });

  useEffect(() => {
    if (currentWorkspace?.id) loadTemplates();
  }, [currentWorkspace?.id]);

  const loadTemplates = async () => {
    if (!currentWorkspace?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/message-templates?workspace_id=${currentWorkspace.id}`);
      if (res.ok) {
        setTemplates(await res.json());
      }
    } catch (err) {
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!currentWorkspace?.id || !formData.name || !formData.content) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      if (editingId) {
        const res = await fetch(`/api/message-templates/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workspace_id: currentWorkspace.id, ...formData }),
        });

        if (res.ok) {
          toast.success('Template updated');
          loadTemplates();
        } else {
          toast.error('Failed to update template');
        }
      } else {
        const res = await fetch('/api/message-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workspace_id: currentWorkspace.id, ...formData }),
        });

        if (res.ok) {
          toast.success('Template created');
          loadTemplates();
        } else {
          toast.error('Failed to create template');
        }
      }

      setOpen(false);
      setEditingId(null);
      setFormData({ name: '', channel: 'WHATSAPP', content: '' });
    } catch (err) {
      toast.error('Failed to save template');
    }
  };

  const handleDelete = async (id: string) => {
    if (!currentWorkspace?.id || !confirm('Delete this template?')) return;

    try {
      const res = await fetch(`/api/message-templates/${id}?workspace_id=${currentWorkspace.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('Template deleted');
        loadTemplates();
      } else {
        toast.error('Failed to delete template');
      }
    } catch (err) {
      toast.error('Failed to delete template');
    }
  };

  const handleEdit = (template: MessageTemplate) => {
    setEditingId(template.id);
    setFormData({
      name: template.name,
      channel: template.channel,
      content: template.content,
    });
    setOpen(true);
  };

  const handleNewTemplate = () => {
    setEditingId(null);
    setFormData({ name: '', channel: 'WHATSAPP', content: '' });
    setOpen(true);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Message Templates</h1>
          <p className="text-sm text-slate-500 mt-1">
            Create reusable message templates for automation workflows
          </p>
        </div>
        <Button onClick={handleNewTemplate} className="gap-2">
          <Plus className="h-4 w-4" />
          New Template
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Available Templates</CardTitle>
          <CardDescription>
            Use variables like {'{businessName}'}, {'{phone}'}, {'{agentName}'} in your templates
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-slate-500">Loading templates...</p>
          ) : templates.length === 0 ? (
            <p className="text-slate-500">No templates created yet</p>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Content Preview</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell className="font-medium">{template.name}</TableCell>
                      <TableCell>
                        <span className="px-2 py-1 bg-slate-100 rounded text-xs">
                          {template.channel}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600 max-w-xs truncate">
                        {template.content}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(template)}
                            className="p-1 hover:bg-slate-100 rounded"
                          >
                            <Edit2 className="h-4 w-4 text-slate-600" />
                          </button>
                          <button
                            onClick={() => handleDelete(template.id)}
                            className="p-1 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Template' : 'Create Template'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="name">Template Name</Label>
              <Input
                id="name"
                placeholder="e.g., Welcome Message"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="channel">Channel</Label>
              <Select value={formData.channel} onValueChange={(v) => setFormData({ ...formData, channel: v })}>
                <SelectTrigger id="channel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                  <SelectItem value="MESSENGER">Messenger</SelectItem>
                  <SelectItem value="SMS">SMS</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="content">Message Content</Label>
              <Textarea
                id="content"
                placeholder="Type your message. Use {{variable}} for placeholders like {{businessName}}, {{phone}}, {{agentName}}"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={8}
              />
            </div>

            <div className="bg-slate-50 p-3 rounded text-xs text-slate-600">
              <strong>Available variables:</strong> {'{businessName}'}, {'{phone}'}, {'{email}'}, {'{name}'}, {'{agentName}'}, {'{company}'}
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingId ? 'Update' : 'Create'} Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
