import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SIGNIN_PAGE = '/auth/signin';
const PUBLIC_AUTH_PAGES = ['/auth/signin', '/auth/error'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const isPublicAuthPage = PUBLIC_AUTH_PAGES.includes(pathname);
  const isSignupPage = pathname === '/auth/signup';
  const isAppRoute = pathname.startsWith('/app');

  if (isSignupPage) {
    const url = req.nextUrl.clone();
    url.pathname = token ? '/app/users' : SIGNIN_PAGE;
    url.search = '';
    return NextResponse.redirect(url);
  }

  if (isAppRoute && !token) {
    const url = req.nextUrl.clone();
    url.pathname = SIGNIN_PAGE;
    url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }

  if (isPublicAuthPage && token) {
    const url = req.nextUrl.clone();
    url.pathname = '/app';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/app/:path*', '/auth/signin', '/auth/signup', '/auth/error'],
};
