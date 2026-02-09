import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get('workspace_id');

  if (!workspaceId) {
    return NextResponse.json({ error: 'workspace_id is required' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { data: members, error } = await supabase
    .from('workspace_members')
    .select('*')
    .eq('workspace_id', workspaceId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const userIds = (members || []).map((m: any) => m.user_id);

  if (userIds.length === 0) {
    return NextResponse.json([]);
  }

  const { data: users } = await supabase
    .from('users')
    .select('id, email, name')
    .in('id', userIds);

  const usersMap: Record<string, { email: string; name: string }> = {};
  (users || []).forEach((u: any) => {
    usersMap[u.id] = { email: u.email, name: u.name };
  });

  const enriched = (members || []).map((m: any) => ({
    ...m,
    email: usersMap[m.user_id]?.email || '',
    name: usersMap[m.user_id]?.name || '',
  }));

  return NextResponse.json(enriched);
}
