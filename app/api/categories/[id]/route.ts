import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request) {
  const supabase = getSupabaseAdmin();

  const pathSegments = request.url.split('/');
  const id = pathSegments[pathSegments.length - 1];

  if (!id) {
    return NextResponse.json({ error: 'Missing category ID' }, { status: 400 });
  }

  const body = await request.json();
  const { name, color } = body;

  const updates: Record<string, any> = {};
  if (name) updates.name = name;
  if (color) updates.color = color;
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('categories')
    .update(updates)
    .eq('id', id)
    .select();

  if (error) {
    console.error('Supabase error:', error);
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
  }

  return NextResponse.json(data[0]);
}

export async function DELETE(request: Request) {
  const supabase = getSupabaseAdmin();

  const pathSegments = request.url.split('/');
  const id = pathSegments[pathSegments.length - 1];

  if (!id) {
    return NextResponse.json({ error: 'Missing category ID' }, { status: 400 });
  }

  const { data: category } = await supabase
    .from('categories')
    .select('type')
    .eq('id', id)
    .maybeSingle();

  if (!category) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 });
  }

  let usageCount = 0;

  if (category.type === 'FEEDBACK_TYPE') {
    const { count } = await supabase
      .from('leads')
      .select('id', { count: 'exact' })
      .eq('feedback_type_id', id);
    usageCount = count || 0;
  }

  if (usageCount > 0) {
    return NextResponse.json(
      { error: `Cannot delete category. It is in use by ${usageCount} items.` },
      { status: 409 }
    );
  }

  const { error } = await supabase
    .from('categories')
    .update({ is_active: false })
    .eq('id', id);

  if (error) {
    console.error('Supabase error:', error);
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
