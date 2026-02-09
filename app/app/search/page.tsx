'use client';

import { useState, useCallback, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Search as SearchIcon,
  Target,
  ListTodo,
  MessageSquare,
  Zap,
  Loader2,
} from 'lucide-react';
import { useWorkspace } from '@/lib/workspace-context';
import { LeadInfoModal } from '@/components/lead-info-modal';
import { TaskModal } from '@/components/task-modal';

interface SearchResults {
  leads: any[];
  tasks: any[];
  activities: any[];
  workflows: any[];
}

export default function SearchPage() {
  const { currentWorkspace } = useWorkspace();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults>({
    leads: [],
    tasks: [],
    activities: [],
    workflows: [],
  });
  const [loading, setLoading] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);

  const search = useCallback(
    async (searchQuery: string) => {
      if (!currentWorkspace || searchQuery.trim().length < 2) {
        setResults({ leads: [], tasks: [], activities: [], workflows: [] });
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(
          `/api/search?workspace_id=${currentWorkspace.id}&q=${encodeURIComponent(
            searchQuery
          )}`
        );
        if (res.ok) {
          const data = await res.json();
          setResults(data);
        }
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    },
    [currentWorkspace]
  );

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (query) {
        search(query);
      } else {
        setResults({ leads: [], tasks: [], activities: [], workflows: [] });
      }
    }, 300);

    return () => clearTimeout(debounce);
  }, [query, search]);

  const handleOpenLead = (leadId: string) => {
    setSelectedLeadId(leadId);
    setLeadModalOpen(true);
  };

  const handleOpenTask = (taskId: string) => {
    setSelectedTaskId(taskId);
    setTaskModalOpen(true);
  };

  const hasResults =
    results.leads.length > 0 ||
    results.tasks.length > 0 ||
    results.activities.length > 0 ||
    results.workflows.length > 0;

  const totalResults =
    results.leads.length +
    results.tasks.length +
    results.activities.length +
    results.workflows.length;

  return (
    <>
      <div className="p-4 lg:p-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Search</h1>
            <p className="text-muted-foreground mt-1">
              Search across leads, tasks, activities, and workflows
            </p>
          </div>

          <div className="relative max-w-2xl">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search by name, phone, notes, or keywords..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-12 h-12 text-base"
              autoFocus
            />
            {loading && (
              <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-muted-foreground" />
            )}
          </div>

          {query.trim().length > 0 && query.trim().length < 2 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Type at least 2 characters to search
              </CardContent>
            </Card>
          )}

          {query.trim().length >= 2 && !loading && !hasResults && (
            <Card>
              <CardContent className="py-12 text-center">
                <SearchIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
                <p className="font-medium text-lg text-slate-700">No results found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Try adjusting your search terms
                </p>
              </CardContent>
            </Card>
          )}

          {hasResults && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Found {totalResults} result{totalResults !== 1 ? 's' : ''} for "{query}"
              </p>

              {results.leads.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Target className="h-5 w-5 text-blue-600" />
                      Leads ({results.leads.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {results.leads.map((lead) => (
                        <button
                          key={lead.id}
                          onClick={() => handleOpenLead(lead.id)}
                          className="w-full p-3 bg-slate-50 hover:bg-slate-100 rounded-lg border transition-colors text-left group"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{lead.name}</p>
                              <p className="text-sm text-muted-foreground truncate">
                                {lead.phone}
                                {lead.business_name && ` • ${lead.business_name}`}
                              </p>
                              {lead.notes && (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                  {lead.notes}
                                </p>
                              )}
                            </div>
                            <Badge variant="outline" className="ml-2">
                              {lead.status}
                            </Badge>
                          </div>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {results.tasks.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <ListTodo className="h-5 w-5 text-emerald-600" />
                      Tasks ({results.tasks.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {results.tasks.map((task) => (
                        <button
                          key={task.id}
                          onClick={() => handleOpenTask(task.id)}
                          className="w-full p-3 bg-slate-50 hover:bg-slate-100 rounded-lg border transition-colors text-left group"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{task.title}</p>
                              {task.description && (
                                <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
                                  {task.description}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {task.status}
                                </Badge>
                                {task.lead && (
                                  <span className="text-xs text-muted-foreground">
                                    {task.lead.name}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {results.activities.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-amber-600" />
                      Activities ({results.activities.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {results.activities.map((activity) => (
                        <button
                          key={activity.id}
                          onClick={() => {
                            if (activity.lead_id) {
                              handleOpenLead(activity.lead_id);
                            }
                          }}
                          className="w-full p-3 bg-slate-50 hover:bg-slate-100 rounded-lg border transition-colors text-left group"
                        >
                          <p className="text-sm">{activity.note}</p>
                          <div className="flex items-center justify-between mt-1">
                            {activity.lead && (
                              <span className="text-xs text-muted-foreground">
                                {activity.lead.name}
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {new Date(activity.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {results.workflows.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Zap className="h-5 w-5 text-purple-600" />
                      Workflows ({results.workflows.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {results.workflows.map((workflow) => (
                        <a
                          key={workflow.id}
                          href={`/app/workflows/${workflow.id}`}
                          className="block p-3 bg-slate-50 hover:bg-slate-100 rounded-lg border transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{workflow.name}</p>
                              {workflow.description && (
                                <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
                                  {workflow.description}
                                </p>
                              )}
                            </div>
                            <Badge
                              variant={workflow.is_active ? 'default' : 'secondary'}
                              className="ml-2"
                            >
                              {workflow.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                        </a>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>

      <LeadInfoModal
        leadId={selectedLeadId}
        open={leadModalOpen}
        onOpenChange={setLeadModalOpen}
        onUpdate={() => {
          if (query) search(query);
        }}
      />

      <TaskModal
        taskId={selectedTaskId}
        open={taskModalOpen}
        onOpenChange={setTaskModalOpen}
        onUpdate={() => {
          if (query) search(query);
        }}
        onDelete={() => {
          if (query) search(query);
        }}
      />
    </>
  );
}
