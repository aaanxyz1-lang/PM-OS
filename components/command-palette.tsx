'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Target,
  ListTodo,
  MessageSquare,
  Zap,
  Search,
  Plus,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { useWorkspace } from '@/lib/workspace-context';

interface SearchResults {
  leads: any[];
  tasks: any[];
  activities: any[];
  workflows: any[];
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenLeadModal?: (leadId: string) => void;
  onOpenTaskModal?: (taskId: string) => void;
}

export function CommandPalette({
  open,
  onOpenChange,
  onOpenLeadModal,
  onOpenTaskModal,
}: CommandPaletteProps) {
  const router = useRouter();
  const { currentWorkspace } = useWorkspace();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults>({
    leads: [],
    tasks: [],
    activities: [],
    workflows: [],
  });
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults({ leads: [], tasks: [], activities: [], workflows: [] });
    }
  }, [open]);

  const handleAction = (action: () => void) => {
    action();
    onOpenChange(false);
  };

  const quickActions = [
    {
      label: 'Create Lead',
      icon: Plus,
      action: () => router.push('/app/leads/new'),
    },
    {
      label: 'Create Task',
      icon: Plus,
      action: () => router.push('/app/tasks'),
    },
    {
      label: 'Run Workflow',
      icon: Zap,
      action: () => router.push('/app/workflows'),
    },
  ];

  const hasResults =
    results.leads.length > 0 ||
    results.tasks.length > 0 ||
    results.activities.length > 0 ||
    results.workflows.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0">
        <div className="flex items-center border-b px-4 py-3">
          <Search className="h-4 w-4 text-muted-foreground mr-2" />
          <Input
            placeholder="Search leads, tasks, activities, workflows... or type a command"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-auto p-0"
            autoFocus
          />
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-2" />}
        </div>

        <ScrollArea className="max-h-[60vh]">
          <div className="p-4 space-y-4">
            {query.trim().length === 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Quick Actions
                </p>
                <div className="space-y-1">
                  {quickActions.map((action, i) => {
                    const Icon = action.icon;
                    return (
                      <button
                        key={i}
                        onClick={() => handleAction(action.action)}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors text-left"
                      >
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{action.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {query.trim().length >= 2 && !loading && !hasResults && (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No results found for "{query}"</p>
              </div>
            )}

            {results.leads.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Target className="h-3.5 w-3.5" />
                  Leads ({results.leads.length})
                </p>
                <div className="space-y-1">
                  {results.leads.map((lead) => (
                    <button
                      key={lead.id}
                      onClick={() => handleAction(() => {
                        if (onOpenLeadModal) {
                          onOpenLeadModal(lead.id);
                        } else {
                          router.push(`/app/leads/${lead.id}`);
                        }
                      })}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors text-left group"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{lead.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {lead.phone} {lead.business_name && `• ${lead.business_name}`}
                        </p>
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-2" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {results.tasks.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                  <ListTodo className="h-3.5 w-3.5" />
                  Tasks ({results.tasks.length})
                </p>
                <div className="space-y-1">
                  {results.tasks.map((task) => (
                    <button
                      key={task.id}
                      onClick={() => handleAction(() => {
                        if (onOpenTaskModal) {
                          onOpenTaskModal(task.id);
                        } else {
                          router.push('/app/tasks');
                        }
                      })}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors text-left group"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{task.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className="text-xs">
                            {task.status}
                          </Badge>
                          {task.lead && (
                            <span className="text-xs text-muted-foreground truncate">
                              {task.lead.name}
                            </span>
                          )}
                        </div>
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-2" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {results.activities.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Activities ({results.activities.length})
                </p>
                <div className="space-y-1">
                  {results.activities.map((activity) => (
                    <button
                      key={activity.id}
                      onClick={() => handleAction(() => {
                        if (activity.lead_id) {
                          if (onOpenLeadModal) {
                            onOpenLeadModal(activity.lead_id);
                          } else {
                            router.push(`/app/leads/${activity.lead_id}`);
                          }
                        }
                      })}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors text-left group"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{activity.note}</p>
                        {activity.lead && (
                          <p className="text-xs text-muted-foreground truncate">
                            {activity.lead.name}
                          </p>
                        )}
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-2" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {results.workflows.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5" />
                  Workflows ({results.workflows.length})
                </p>
                <div className="space-y-1">
                  {results.workflows.map((workflow) => (
                    <button
                      key={workflow.id}
                      onClick={() => handleAction(() => router.push(`/app/workflows/${workflow.id}`))}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors text-left group"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{workflow.name}</p>
                        {workflow.description && (
                          <p className="text-xs text-muted-foreground truncate">
                            {workflow.description}
                          </p>
                        )}
                      </div>
                      <Badge variant={workflow.is_active ? 'default' : 'secondary'} className="text-xs ml-2">
                        {workflow.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="border-t px-4 py-2 text-xs text-muted-foreground flex items-center justify-between bg-slate-50">
          <span>Press ESC to close</span>
          <span className="flex items-center gap-2">
            <kbd className="px-2 py-0.5 bg-white border rounded text-xs">↑</kbd>
            <kbd className="px-2 py-0.5 bg-white border rounded text-xs">↓</kbd>
            <span>to navigate</span>
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
