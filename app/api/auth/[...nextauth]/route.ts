import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const nextAuth = NextAuth(authOptions);

export async function GET(...args: any[]) {
  return nextAuth(...args);
}

export async function POST(...args: any[]) {
  return nextAuth(...args);
}
