'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';

interface Workspace {
  id: string;
  name: string;
  slug: string;
}

interface Employee {
  id: string;
  name: string;
  email: string;
}

interface WorkspaceContextType {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  employees: Employee[];
  setCurrentWorkspaceId: (id: string) => void;
  loading: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextType>({
  workspaces: [],
  currentWorkspace: null,
  employees: [],
  setCurrentWorkspaceId: () => {},
  loading: true,
});

export const useWorkspace = () => useContext(WorkspaceContext);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/workspaces')
      .then((r) => r.json())
      .then((data: Workspace[]) => {
        setWorkspaces(data);
        const stored = typeof window !== 'undefined'
          ? localStorage.getItem('currentWorkspaceId')
          : null;
        const match = data.find((w) => w.id === stored) || data[0];
        if (match) {
          setCurrentWorkspace(match);
          localStorage.setItem('currentWorkspaceId', match.id);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!currentWorkspace) return;
    fetch(`/api/employees?workspace_id=${currentWorkspace.id}`)
      .then((r) => r.json())
      .then(setEmployees)
      .catch(() => setEmployees([]));
  }, [currentWorkspace?.id]);

  const setCurrentWorkspaceId = useCallback(
    (id: string) => {
      const match = workspaces.find((w) => w.id === id);
      if (match) {
        setCurrentWorkspace(match);
        localStorage.setItem('currentWorkspaceId', id);
      }
    },
    [workspaces]
  );

  return (
    <WorkspaceContext.Provider
      value={{ workspaces, currentWorkspace, employees, setCurrentWorkspaceId, loading }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}
