'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useWorkspace } from '@/lib/workspace-context';
import { useCategories } from '@/hooks/use-categories';
import { useTags } from '@/hooks/use-tags';
import { CategorySelect } from '@/components/category-select';
import { OurRecordCard } from '@/components/our-record-card';
import { LeadInfoModal } from '@/components/lead-info-modal';
import { toast } from 'sonner';
import { normalizePhone, isValidPhoneLength } from '@/lib/phone-utils';
import { SELECT_UNASSIGNED, normalizeSelectValue, denormalizeSelectValue } from '@/lib/select-utils';

export default function NewLeadPage() {
  const router = useRouter();
  const { currentWorkspace, employees } = useWorkspace();
  const { categories, createCategory, loading: categoriesLoading } = useCategories(
    currentWorkspace?.id
  );
  const { tags } = useTags(currentWorkspace?.id);

  const [saving, setSaving] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [duplicateSummary, setDuplicateSummary] = useState<any>(null);
  const [showOurRecord, setShowOurRecord] = useState(false);
  const [selectedExistingLeadId, setSelectedExistingLeadId] = useState<string | null>(null);
  const [showExistingLeadModal, setShowExistingLeadModal] = useState(false);

  const [form, setForm] = useState({
    name: '',
    phone: '',
    businessName: '',
    email: '',
    status: '',
    source: '',
    qualified_status: '',
    feedback_type_id: '',
    assigned_to: null as string | null,
    notes: '',
  });

  const sourceCategories = categories.filter((c) => c.type === 'LEAD_SOURCE');
  const statusCategories = categories.filter((c) => c.type === 'LEAD_STATUS');
  const feedbackCategories = categories.filter((c) => c.type === 'FEEDBACK_TYPE');

  const handlePhoneBlur = useCallback(async () => {
    if (!form.phone.trim() || !currentWorkspace) return;

    if (!isValidPhoneLength(form.phone)) return;

    setLookupLoading(true);
    try {
      const res = await fetch(
        `/api/leads/lookup?phone=${encodeURIComponent(form.phone)}&workspace_id=${currentWorkspace.id}`
      );

      if (res.ok) {
        const data = await res.json();
        if (data.summary && data.leads && data.leads.length > 0) {
          setDuplicateSummary(data.summary);
          setShowOurRecord(true);
        }
      }
    } catch (error) {
      console.error('Lookup error:', error);
    } finally {
      setLookupLoading(false);
    }
  }, [form.phone, currentWorkspace]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.phone.trim()) {
      toast.error('Phone number is required');
      return;
    }

    if (!isValidPhoneLength(form.phone)) {
      toast.error('Phone number must be at least 10 digits');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          normalized_phone: normalizePhone(form.phone),
          workspace_id: currentWorkspace?.id,
        }),
      });

      if (res.ok) {
        toast.success('Lead created successfully');
        router.push('/app/leads');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to create lead');
      }
    } catch {
      toast.error('Failed to create lead');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateNewAnyway = async (reason: string) => {
    setSaving(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          normalized_phone: normalizePhone(form.phone),
          workspace_id: currentWorkspace?.id,
          duplicate_override_reason: reason,
        }),
      });

      if (res.ok) {
        toast.success('Lead created successfully');
        router.push('/app/leads');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to create lead');
      }
    } catch {
      toast.error('Failed to create lead');
    } finally {
      setSaving(false);
    }
  };

  const handleContinueExisting = (leadId: string) => {
    setSelectedExistingLeadId(leadId);
    setShowOurRecord(false);
    setShowExistingLeadModal(true);
  };

  const update = (field: string, value: any) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="p-4 lg:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <Link href="/app/leads">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Leads
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>Create New Lead</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Phone number is required. All other fields are optional.</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone *</Label>
                  <div className="relative">
                    <Input
                      id="phone"
                      placeholder="+8801234567890 or 01234567890"
                      value={form.phone}
                      onChange={(e) => update('phone', e.target.value)}
                      onBlur={handlePhoneBlur}
                      required
                      disabled={lookupLoading}
                    />
                    {lookupLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessName">Business Name</Label>
                  <Input
                    id="businessName"
                    placeholder="Company or business name"
                    value={form.businessName}
                    onChange={(e) => update('businessName', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    placeholder="Full name"
                    value={form.name}
                    onChange={(e) => update('name', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@example.com"
                    value={form.email}
                    onChange={(e) => update('email', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  {categoriesLoading ? (
                    <div className="flex items-center justify-center h-10">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : (
                    <CategorySelect
                      categories={categories}
                      value={form.status}
                      onChange={(id) => update('status', id)}
                      onCreateCategory={createCategory}
                      categoryType="LEAD_STATUS"
                      placeholder="Select status"
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="source">Source</Label>
                  {categoriesLoading ? (
                    <div className="flex items-center justify-center h-10">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : (
                    <CategorySelect
                      categories={categories}
                      value={form.source}
                      onChange={(id) => update('source', id)}
                      onCreateCategory={createCategory}
                      categoryType="LEAD_SOURCE"
                      placeholder="Select source"
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="qualified">Qualified Status</Label>
                  <Select value={form.qualified_status} onValueChange={(v) => update('qualified_status', v)}>
                    <SelectTrigger id="qualified">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="YES">Yes</SelectItem>
                      <SelectItem value="NO">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="feedback">Feedback Type</Label>
                  {categoriesLoading ? (
                    <div className="flex items-center justify-center h-10">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : (
                    <CategorySelect
                      categories={categories}
                      value={form.feedback_type_id}
                      onChange={(id) => update('feedback_type_id', id)}
                      onCreateCategory={createCategory}
                      categoryType="FEEDBACK_TYPE"
                      placeholder="Select feedback type"
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assigned_to">Assigned To</Label>
                  <Select value={denormalizeSelectValue(form.assigned_to)} onValueChange={(v) => update('assigned_to', normalizeSelectValue(v))}>
                    <SelectTrigger id="assigned_to">
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

              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any notes about this lead..."
                  value={form.notes}
                  onChange={(e) => update('notes', e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3">
                <Link href="/app/leads">
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" disabled={saving || lookupLoading}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {saving ? 'Creating...' : 'Create Lead'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <OurRecordCard
        open={showOurRecord}
        onOpenChange={setShowOurRecord}
        summary={duplicateSummary}
        onOpenLead={(leadId) => {
          // Navigate to lead modal
          handleContinueExisting(leadId);
        }}
        onContinueExisting={handleContinueExisting}
        onCreateNewAnyway={handleCreateNewAnyway}
      />

      {selectedExistingLeadId && (
        <LeadInfoModal
          leadId={selectedExistingLeadId}
          open={showExistingLeadModal}
          onOpenChange={setShowExistingLeadModal}
          onUpdate={() => {
            setShowExistingLeadModal(false);
            router.push('/app/leads');
          }}
        />
      )}
    </div>
  );
}
