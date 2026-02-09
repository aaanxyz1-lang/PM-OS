import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const supabase = getSupabaseAdmin();

  if (!body.workspace_id) {
    return NextResponse.json({ error: 'workspace_id required' }, { status: 400 });
  }

  if (!body.content?.trim()) {
    return NextResponse.json({ error: 'Content is required' }, { status: 400 });
  }

  const type = body.type || 'note';
  const actionLabel = type === 'call' ? 'Call Logged' : 'Note Added';

  const { data, error } = await supabase
    .from('activity_logs')
    .insert({
      workspace_id: body.workspace_id,
      lead_id: params.id,
      user_id: body.user_id || null,
      action: actionLabel,
      type,
      description: body.content.trim(),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
