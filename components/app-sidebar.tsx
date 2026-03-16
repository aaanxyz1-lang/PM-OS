'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChartBar as BarChart3, Target, Users, Settings, Menu, X, Building2, ListTodo, Zap, CalendarDays, ChevronDown, Plus, TrendingUp, SquarePlus as PlusSquare, FileText, Image, Play, Search, CircleCheck as CheckCircle2, LogOut } from 'lucide-react';
import { useWorkspace } from '@/lib/workspace-context';

interface NavItem {
  href: string;
  label: string;
  icon: any;
  isTopLevel?: boolean;
}

interface NavGroup {
  label: string;
  icon: any;
  items: NavItem[];
}

type NavStructure = Array<NavItem | NavGroup>;

const navStructure: NavStructure = [
  { href: '/app', label: 'Dashboard', icon: BarChart3, isTopLevel: true },
  { href: '/app/search', label: 'Search', icon: Search, isTopLevel: true },
  {
    label: 'SALES',
    icon: TrendingUp,
    items: [
      { href: '/app/leads', label: 'Leads', icon: Target },
      { href: '/app/followups', label: 'Follow-ups', icon: CalendarDays },
      { href: '/app/leads?qualified=YES', label: 'Qualified', icon: CheckCircle2 },
      { href: '/app/pipeline', label: 'Pipeline', icon: TrendingUp },
    ],
  },
  {
    label: 'OPERATIONS',
    icon: ListTodo,
    items: [
      { href: '/app/tasks', label: 'Tasks', icon: ListTodo },
      { href: '/app/calendar', label: 'Calendar', icon: CalendarDays },
      { href: '/app/sop', label: 'SOP Runs', icon: FileText },
    ],
  },
  {
    label: 'CONTENT',
    icon: FileText,
    items: [
      { href: '/app/content/calendar', label: 'Content Calendar', icon: CalendarDays },
      { href: '/app/content/tasks', label: 'Content Tasks', icon: ListTodo },
      { href: '/app/content/assets', label: 'Assets', icon: Image },
    ],
  },
  {
    label: 'AUTOMATION',
    icon: Zap,
    items: [
      { href: '/app/workflows', label: 'Workflows', icon: Zap },
      { href: '/app/workflows/runs', label: 'Workflow Runs', icon: Play },
      { href: '/app/automation/lead-loops', label: 'Lead Loops', icon: Zap },
    ],
  },
  {
    label: 'SETTINGS',
    icon: Settings,
    items: [
      { href: '/app/users', label: 'Employees', icon: Users },
      { href: '/app/settings', label: 'Settings', icon: Settings },
      { href: '/app/settings/categories', label: 'Categories', icon: FileText },
      { href: '/app/settings/tags', label: 'Tags', icon: Target },
    ],
  },
];

const navGroups = navStructure.filter((item): item is NavGroup => 'items' in item);
const topLevelItems = navStructure.filter((item): item is NavItem => 'isTopLevel' in item && item.isTopLevel === true);

export function AppSidebar() {
  const { workspaces, currentWorkspace, setCurrentWorkspaceId } = useWorkspace();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const pathname = usePathname();

  useEffect(() => {
    const saved = localStorage.getItem('sidebar-expanded');
    if (saved) {
      setExpandedGroups(JSON.parse(saved));
    } else {
      const initial: Record<string, boolean> = {};
      navGroups.forEach((group) => {
        initial[group.label] = true;
      });
      setExpandedGroups(initial);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('sidebar-expanded', JSON.stringify(expandedGroups));
  }, [expandedGroups]);

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  };

  const isActive = (href: string) => {
    if (href === '/app') return pathname === '/app';
    return pathname === href || pathname?.startsWith(href + '/');
  };

  const NavContent = () => (
    <nav className="space-y-2">
      {topLevelItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);
        return (
          <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}>
            <Button
              variant={active ? 'default' : 'ghost'}
              size="sm"
              className="w-full justify-start gap-2 text-sm"
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Button>
          </Link>
        );
      })}

      {topLevelItems.length > 0 && (
        <div className="pt-2">
          <div className="h-px bg-slate-200" />
        </div>
      )}

      {navGroups.map((group) => {
        const GroupIcon = group.icon;
        const expanded = expandedGroups[group.label] !== false;
        const hasActiveItem = group.items.some((item) => isActive(item.href));

        return (
          <div key={group.label}>
            <button
              onClick={() => toggleGroup(group.label)}
              className={`w-full flex items-center justify-between px-2 py-1.5 text-xs font-semibold uppercase tracking-wider rounded transition-colors ${
                expanded ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className="flex items-center gap-2">
                <GroupIcon className="h-3.5 w-3.5" />
                {group.label}
              </span>
              <ChevronDown
                className={`h-3 w-3 transition-transform ${expanded ? 'rotate-180' : ''}`}
              />
            </button>

            {expanded && (
              <div className="space-y-1 mt-1 pl-2">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}>
                      <Button
                        variant={active ? 'default' : 'ghost'}
                        size="sm"
                        className="w-full justify-start gap-2 text-xs"
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {item.label}
                      </Button>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );

  const QuickCreateButton = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className="w-full gap-2 mb-4">
          <Plus className="h-4 w-4" />
          Quick Create
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuItem asChild>
          <Link href="/app/leads/new">New Lead</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/app/tasks">New Task</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/app/workflows">Run Workflow</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <>
      <div className="hidden lg:flex h-screen w-64 flex-col border-r bg-white shrink-0">
        <div className="border-b px-4 py-4">
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="h-4 w-4 text-slate-500" />
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Workspace
            </span>
          </div>
          <Select
            value={currentWorkspace?.id || ''}
            onValueChange={setCurrentWorkspaceId}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select workspace" />
            </SelectTrigger>
            <SelectContent>
              {workspaces.map((ws) => (
                <SelectItem key={ws.id} value={ws.id}>
                  {ws.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 overflow-auto px-3 py-4">
          <QuickCreateButton />
          <NavContent />
        </div>

        <div className="border-t px-3 py-3">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-slate-600 hover:text-red-600 hover:bg-red-50"
            onClick={() => signOut({ callbackUrl: '/auth/signin' })}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>

      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-slate-500" />
          <span className="font-semibold text-sm truncate max-w-[200px]">
            {currentWorkspace?.name || 'Workspace'}
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setSidebarOpen(false)}
        >
          <div
            className="w-64 bg-white h-screen border-r pt-16 px-3 py-4 overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 px-1">
              <Select
                value={currentWorkspace?.id || ''}
                onValueChange={(id) => {
                  setCurrentWorkspaceId(id);
                  setSidebarOpen(false);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select workspace" />
                </SelectTrigger>
                <SelectContent>
                  {workspaces.map((ws) => (
                    <SelectItem key={ws.id} value={ws.id}>
                      {ws.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <QuickCreateButton />
            <NavContent />
          </div>
        </div>
      )}
    </>
  );
}
