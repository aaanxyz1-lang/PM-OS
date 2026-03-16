import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { getAuthSession, unauthorized } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const session = await getAuthSession();
  if (!session?.user?.id) return unauthorized();

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

export async function POST(req: Request) {
  const session = await getAuthSession();
  if (!session?.user?.id) return unauthorized();

  const body = await req.json();
  const name = (body.name || '').trim();
  const email = (body.email || '').trim().toLowerCase();
  const password = body.password || '';
  const role = body.role || 'user';
  const workspaceId = body.workspaceId || session.user.workspaceId;

  if (!name || !email || !password || !workspaceId) {
    return NextResponse.json({ error: 'name, email, password, and workspaceId are required' }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const { data: newUser, error: userError } = await supabase
    .from('users')
    .insert({ email, name, password_hash: passwordHash })
    .select('id, email, name, created_at')
    .single();

  if (userError || !newUser) {
    return NextResponse.json({ error: userError?.message || 'Failed to create user' }, { status: 500 });
  }

  const { error: memberError } = await supabase
    .from('workspace_members')
    .insert({ workspace_id: workspaceId, user_id: newUser.id, role });

  if (memberError) {
    await supabase.from('users').delete().eq('id', newUser.id);
    return NextResponse.json({ error: memberError.message || 'Failed to add user to workspace' }, { status: 500 });
  }

  return NextResponse.json({ success: true, user: newUser }, { status: 201 });
}
