'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface EndpointResult {
  url: string;
  status: number | null;
  body: string;
  ok: boolean;
  loading: boolean;
}

const ENDPOINTS = [
  { label: 'Session', url: '/api/auth/session' },
  { label: 'Health', url: '/api/health' },
];

function StatusIcon({ result }: { result: EndpointResult }) {
  if (result.loading) return <Loader2 className="h-5 w-5 text-slate-400 animate-spin" />;
  if (result.ok) return <CheckCircle className="h-5 w-5 text-emerald-600" />;
  return <XCircle className="h-5 w-5 text-red-600" />;
}

export default function AuthDebugPage() {
  const [results, setResults] = useState<EndpointResult[]>(
    ENDPOINTS.map((ep) => ({
      url: ep.url,
      status: null,
      body: '',
      ok: false,
      loading: true,
    }))
  );

  async function fetchAll() {
    setResults((prev) =>
      prev.map((r) => ({ ...r, loading: true, status: null, body: '', ok: false }))
    );

    const updated = await Promise.all(
      ENDPOINTS.map(async (ep) => {
        try {
          const res = await fetch(ep.url);
          const text = await res.text();
          return {
            url: ep.url,
            status: res.status,
            body: text,
            ok: res.ok,
            loading: false,
          };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          return {
            url: ep.url,
            status: null,
            body: `Fetch error: ${msg}`,
            ok: false,
            loading: false,
          };
        }
      })
    );

    setResults(updated);
  }

  useEffect(() => {
    fetchAll();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">Auth Debug</h1>
          <Button variant="outline" size="sm" onClick={fetchAll}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        {results.map((result, i) => (
          <Card key={result.url}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <StatusIcon result={result} />
                <CardTitle className="text-base font-medium">
                  {ENDPOINTS[i].label}
                  <span className="ml-2 font-mono text-sm text-slate-500">{result.url}</span>
                </CardTitle>
                {result.status !== null && (
                  <span
                    className={`ml-auto rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      result.ok
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {result.status}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <pre className="max-h-64 overflow-auto rounded-lg bg-slate-900 p-4 text-xs text-slate-100">
                {result.loading
                  ? 'Loading...'
                  : formatJson(result.body)}
              </pre>
            </CardContent>
          </Card>
        ))}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Environment</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="rounded-lg bg-slate-900 p-4 text-xs text-slate-100">
              {`next-auth version: v4 (credentials provider)
runtime: nodejs
NEXTAUTH_URL required: yes
NEXTAUTH_SECRET required: yes
Database: Supabase (via @supabase/supabase-js)`}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function formatJson(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}
