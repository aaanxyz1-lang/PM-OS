'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Target, Search, Trash2, Eye, Loader2, X } from 'lucide-react';
import { useWorkspace } from '@/lib/workspace-context';
import { toast } from 'sonner';
import { LeadInfoModal } from '@/components/lead-info-modal';
import { TaskModal } from '@/components/task-modal';
import { BulkAssignModal } from '@/components/bulk-assign-modal';
import { BulkAttachLoopModal } from '@/components/bulk-attach-loop-modal';
import { BulkCreateTasksModal } from '@/components/bulk-create-tasks-modal';
import { BulkUpdateModal } from '@/components/bulk-update-modal';
import { BulkAttachWorkflowDialog } from '@/components/bulk-attach-workflow-dialog';

interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  status: string;
  source: string;
  assigned_to: string;
  assigned_user: { id: string; name: string; email: string } | null;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  won: 'bg-emerald-100 text-emerald-700',
  lost: 'bg-red-100 text-red-700',
};

const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  in_progress: 'In Progress',
  won: 'Won',
  lost: 'Lost',
};

export default function LeadsPage() {
  const searchParams = useSearchParams();
  const qualifiedFilter = searchParams?.get('qualified');
  const { currentWorkspace, employees } = useWorkspace();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [assignedFilter, setAssignedFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskLeadId, setTaskLeadId] = useState<string | null>(null);
  const [taskLeadName, setTaskLeadName] = useState<string | null>(null);

  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [bulkLoopOpen, setBulkLoopOpen] = useState(false);
  const [bulkTasksOpen, setBulkTasksOpen] = useState(false);
  const [bulkUpdateOpen, setBulkUpdateOpen] = useState(false);
  const [bulkWorkflowOpen, setBulkWorkflowOpen] = useState(false);
  const [duplicateMap, setDuplicateMap] = useState<Record<string, number>>({});

  const loadLeads = useCallback(async () => {
    if (!currentWorkspace) return;
    setLoading(true);

    try {
      const params = new URLSearchParams({ workspace_id: currentWorkspace.id });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (assignedFilter !== 'all') params.set('assigned_to', assignedFilter);
      if (search) params.set('search', search);
      if (dateFrom) params.set('from', dateFrom);
      if (dateTo) params.set('to', dateTo);
      if (qualifiedFilter) params.set('qualified', qualifiedFilter);

      const [leadsRes, duplicatesRes] = await Promise.all([
        fetch(`/api/leads?${params}`),
        fetch(`/api/leads/duplicates?workspace_id=${currentWorkspace.id}`),
      ]);

      if (leadsRes.ok) setLeads(await leadsRes.json());
      if (duplicatesRes.ok) {
        const data = await duplicatesRes.json();
        setDuplicateMap(data.duplicates || {});
      }
    } catch {
      toast.error('Failed to load leads');
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace?.id, statusFilter, assignedFilter, search, dateFrom, dateTo, qualifiedFilter]);

  const handleOpenLead = (leadId: string) => {
    setSelectedLeadId(leadId);
    setLeadModalOpen(true);
  };

  const handleOpenCreateTask = (leadId: string, leadName: string) => {
    setTaskLeadId(leadId);
    setTaskLeadName(leadName);
    setLeadModalOpen(false);
    setTaskModalOpen(true);
  };

  const handleSelectLead = (leadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelected = new Set(selectedLeadIds);
    if (newSelected.has(leadId)) {
      newSelected.delete(leadId);
    } else {
      newSelected.add(leadId);
    }
    setSelectedLeadIds(newSelected);
  };

  const handleSelectAllOnPage = () => {
    if (selectedLeadIds.size === leads.length) {
      setSelectedLeadIds(new Set());
    } else {
      setSelectedLeadIds(new Set(leads.map((l) => l.id)));
    }
  };

  const handleClearSelection = () => {
    setSelectedLeadIds(new Set());
  };

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete lead "${name}"?`)) return;

    try {
      const res = await fetch(
        `/api/leads/${id}?workspace_id=${currentWorkspace?.id}`,
        { method: 'DELETE' }
      );
      if (res.ok) {
        toast.success('Lead deleted');
        loadLeads();
      } else {
        toast.error('Failed to delete lead');
      }
    } catch {
      toast.error('Failed to delete lead');
    }
  };

  return (
    <div className="p-4 lg:p-8">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Leads</h1>
            <p className="text-muted-foreground mt-1">Manage and track your sales leads</p>
          </div>
          <Link href="/app/leads/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Lead
            </Button>
          </Link>
        </div>

        {selectedLeadIds.size > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-blue-900">
                {selectedLeadIds.size} lead{selectedLeadIds.size !== 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setBulkAssignOpen(true)}
                >
                  Assign
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setBulkLoopOpen(true)}
                >
                  Attach Loop
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setBulkWorkflowOpen(true)}
                >
                  Attach Workflow
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setBulkTasksOpen(true)}
                >
                  Create Tasks
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setBulkUpdateOpen(true)}
                >
                  Update
                </Button>
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleClearSelection}
              className="text-blue-600 hover:text-blue-700"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="won">Won</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
            </SelectContent>
          </Select>
          <Select value={assignedFilter} onValueChange={setAssignedFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Assigned To" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Employees</SelectItem>
              {employees.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="text-xs"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="text-xs"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : leads.length > 0 ? (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedLeadIds.size === leads.length && leads.length > 0}
                          onCheckedChange={handleSelectAllOnPage}
                          className="cursor-pointer"
                        />
                      </TableHead>
                      <TableHead>Lead Name</TableHead>
                      <TableHead className="hidden md:table-cell">Phone</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden md:table-cell">Assigned To</TableHead>
                      <TableHead className="hidden lg:table-cell">Created</TableHead>
                      <TableHead className="w-24" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leads.map((lead) => (
                      <TableRow key={lead.id} className={`group cursor-pointer hover:bg-slate-50 ${selectedLeadIds.has(lead.id) ? 'bg-blue-50' : ''}`} onClick={() => handleOpenLead(lead.id)}>
                        <TableCell onClick={(e) => handleSelectLead(lead.id, e)}>
                          <Checkbox
                            checked={selectedLeadIds.has(lead.id)}
                            className="cursor-pointer"
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {lead.name}
                            {duplicateMap[lead.id] && (
                              <Badge variant="secondary" className="text-xs">
                                {duplicateMap[lead.id]} duplicates
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">
                          {lead.phone || '-'}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              STATUS_COLORS[lead.status] || 'bg-slate-100 text-slate-800'
                            }`}
                          >
                            {STATUS_LABELS[lead.status] || lead.status}
                          </span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">
                          {lead.assigned_user?.name || '-'}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                          {new Date(lead.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handleOpenLead(lead.id)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(lead.id, lead.name)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-16">
              <div className="flex flex-col items-center text-center">
                <Target className="h-12 w-12 text-muted-foreground/40 mb-4" />
                <p className="font-medium text-lg text-slate-700">No leads found</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  {search || statusFilter !== 'all' || assignedFilter !== 'all'
                    ? 'Try adjusting your search or filters'
                    : 'Create your first lead to get started'}
                </p>
                {!search && statusFilter === 'all' && assignedFilter === 'all' && (
                  <Link href="/app/leads/new" className="mt-4">
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Lead
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <LeadInfoModal
        leadId={selectedLeadId}
        open={leadModalOpen}
        onOpenChange={setLeadModalOpen}
        onUpdate={loadLeads}
        onOpenCreateTask={handleOpenCreateTask}
      />

      <TaskModal
        taskId={null}
        open={taskModalOpen}
        onOpenChange={setTaskModalOpen}
        onUpdate={loadLeads}
        leadId={taskLeadId || undefined}
        leadName={taskLeadName || undefined}
      />

      <BulkAssignModal
        open={bulkAssignOpen}
        onOpenChange={setBulkAssignOpen}
        selectedLeadIds={Array.from(selectedLeadIds)}
        employees={employees}
        workspaceId={currentWorkspace?.id}
        onSuccess={() => {
          loadLeads();
          handleClearSelection();
        }}
      />

      <BulkAttachLoopModal
        open={bulkLoopOpen}
        onOpenChange={setBulkLoopOpen}
        selectedLeadIds={Array.from(selectedLeadIds)}
        workspaceId={currentWorkspace?.id}
        onSuccess={() => {
          loadLeads();
          handleClearSelection();
        }}
      />

      <BulkCreateTasksModal
        open={bulkTasksOpen}
        onOpenChange={setBulkTasksOpen}
        selectedLeadIds={Array.from(selectedLeadIds)}
        employees={employees}
        workspaceId={currentWorkspace?.id}
        onSuccess={() => {
          loadLeads();
          handleClearSelection();
        }}
      />

      <BulkUpdateModal
        open={bulkUpdateOpen}
        onOpenChange={setBulkUpdateOpen}
        selectedLeadIds={Array.from(selectedLeadIds)}
        workspaceId={currentWorkspace?.id}
        onSuccess={() => {
          loadLeads();
          handleClearSelection();
        }}
      />

      <BulkAttachWorkflowDialog
        open={bulkWorkflowOpen}
        onOpenChange={setBulkWorkflowOpen}
        workspaceId={currentWorkspace?.id || ''}
        selectedLeadIds={Array.from(selectedLeadIds)}
        onSuccess={() => {
          loadLeads();
          handleClearSelection();
        }}
      />
    </div>
  );
}
