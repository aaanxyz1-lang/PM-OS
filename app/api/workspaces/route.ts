import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { getAuthSession, unauthorized } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getAuthSession();
  if (!session?.user?.id) return unauthorized();

  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('workspace_members')
    .select('workspaces(id, name, slug)')
    .eq('user_id', session.user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const workspaces = (data ?? [])
    .map((row: any) => row.workspaces)
    .filter(Boolean);

  return NextResponse.json(workspaces);
}
