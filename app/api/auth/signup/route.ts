import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateInputs(email: string, password: string, workspaceName: string) {
  const errors: Record<string, string> = {};

  if (!email) {
    errors.email = 'Email is required';
  } else if (!EMAIL_RE.test(email)) {
    errors.email = 'Please enter a valid email address';
  }

  if (!password) {
    errors.password = 'Password is required';
  } else if (password.length < 6) {
    errors.password = 'Password must be at least 6 characters';
  } else if (password.length > 72) {
    errors.password = 'Password must be 72 characters or fewer';
  }

  if (!workspaceName) {
    errors.workspaceName = 'Workspace name is required';
  } else if (workspaceName.trim().length < 2) {
    errors.workspaceName = 'Workspace name must be at least 2 characters';
  } else if (workspaceName.trim().length > 50) {
    errors.workspaceName = 'Workspace name must be 50 characters or fewer';
  }

  return Object.keys(errors).length > 0 ? errors : null;
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = (body.email || '').trim().toLowerCase();
    const password = body.password || '';
    const workspaceName = (body.workspaceName || '').trim();

    const validationErrors = validateInputs(email, password, workspaceName);
    if (validationErrors) {
      return NextResponse.json(
        { error: 'Validation failed', fields: validationErrors },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const passwordHash = await bcrypt.hash(password, 12);
    const slug = toSlug(workspaceName);

    const { data, error: rpcError } = await supabase.rpc('signup_create_tenant', {
      p_email: email,
      p_name: email.split('@')[0],
      p_password_hash: passwordHash,
      p_workspace_name: workspaceName,
      p_workspace_slug: slug || 'workspace',
    });

    if (rpcError) {
      if (rpcError.message?.includes('duplicate key') && rpcError.message?.includes('email')) {
        console.error('[Signup] Duplicate email:', email);
        return NextResponse.json(
          { error: 'An account with this email already exists', fields: { email: 'This email is already registered' } },
          { status: 409 }
        );
      }
      console.error('[Signup] RPC error:', rpcError);
      return NextResponse.json(
        { error: 'Failed to create account. Please try again.' },
        { status: 500 }
      );
    }

    if (data?.error) {
      if (data.error.includes('email already exists')) {
        return NextResponse.json(
          { error: data.error, fields: { email: 'This email is already registered' } },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: data.error }, { status: 409 });
    }

    console.log('[Signup] User created:', email, '| userId:', data.user_id, '| workspaceId:', data.workspace_id);

    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
      userId: data.user_id,
      workspaceId: data.workspace_id,
    });
  } catch (err) {
    console.error('[Signup] Unexpected error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
