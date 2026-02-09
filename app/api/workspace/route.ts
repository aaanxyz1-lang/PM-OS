import { NextResponse } from 'next/server';
import { getAuthSession, unauthorized, forbidden } from '@/lib/session';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export async function GET() {
  const session = await getAuthSession();
  if (!session) return unauthorized();

  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('workspaces')
    .select('*')
    .eq('id', session.user.workspaceId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function PUT(req: Request) {
  const session = await getAuthSession();
  if (!session) return unauthorized();
  if (session.user.role !== 'founder') return forbidden();

  const body = await req.json();
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('workspaces')
    .update({
      name: body.name,
      slug: body.slug,
      updated_at: new Date().toISOString(),
    })
    .eq('id', session.user.workspaceId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
