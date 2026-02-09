import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const checks: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    nextauth_secret: !!process.env.NEXTAUTH_SECRET,
    nextauth_url: process.env.NEXTAUTH_URL || '(not set)',
    supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabase_anon_key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };

  try {
    const supabase = getSupabaseAdmin();
    const { count, error } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (error) {
      checks.db = { ok: false, error: error.message };
    } else {
      checks.db = { ok: true, userCount: count };
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    checks.db = { ok: false, error: message };
  }

  const allOk = checks.nextauth_secret && checks.supabase_url && checks.supabase_anon_key &&
    (checks.db as any)?.ok;

  return NextResponse.json({ ok: allOk, ...checks }, { status: allOk ? 200 : 503 });
}
