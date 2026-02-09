import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export const authOptions: NextAuthOptions = {
  debug: true,
  logger: {
    error(code, metadata) {
      console.error('NEXTAUTH_ERROR', code, metadata);
    },
    warn(code) {
      console.warn('NEXTAUTH_WARN', code);
    },
    debug(code, metadata) {
      console.log('NEXTAUTH_DEBUG', code, metadata);
    },
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            console.error('AUTHORIZE_ERROR', 'Missing email or password');
            throw new Error('Email and password are required');
          }

          console.log('[Auth] Attempting login for:', credentials.email);

          const supabase = getSupabaseAdmin();

          const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', credentials.email)
            .maybeSingle();

          if (error) {
            console.error('AUTHORIZE_ERROR', 'Supabase query failed:', error.message, error);
            throw new Error('Database connection error');
          }

          if (!user) {
            console.error('AUTHORIZE_ERROR', 'No account found for:', credentials.email);
            throw new Error('No account found with that email');
          }

          const passwordMatch = await bcrypt.compare(
            credentials.password,
            user.password_hash
          );

          if (!passwordMatch) {
            console.error('AUTHORIZE_ERROR', 'Invalid password for:', credentials.email);
            throw new Error('Invalid password');
          }

          const { data: membership } = await supabase
            .from('workspace_members')
            .select('workspace_id, role')
            .eq('user_id', user.id)
            .maybeSingle();

          console.log('[Auth] Login success:', credentials.email, '| userId:', user.id);

          return {
            id: user.id,
            email: user.email,
            name: user.name || user.email.split('@')[0],
            workspaceId: membership?.workspace_id,
            role: membership?.role,
          };
        } catch (error: unknown) {
          const err = error instanceof Error ? error : new Error(String(error));
          console.error('AUTHORIZE_ERROR', err.stack || err);
          throw err;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.workspaceId = user.workspaceId;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.workspaceId = token.workspaceId || '';
      session.user.role = token.role || '';
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
};
