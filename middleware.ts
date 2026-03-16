import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SIGNIN_PAGE = '/auth/signin';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === '/auth/error') {
    return NextResponse.next();
  }

  let token = null;
  try {
    token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });
  } catch {
    if (pathname.startsWith('/app')) {
      const url = req.nextUrl.clone();
      url.pathname = SIGNIN_PAGE;
      url.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  const isSignupPage = pathname === '/auth/signup';
  const isSigninPage = pathname === '/auth/signin';
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

  if (isSigninPage && token) {
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
