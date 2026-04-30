import { type NextRequest } from 'next/server';

export async function GET(request: NextRequest): Promise<Response> {
  return Response.redirect(new URL('/auth/login?error=true', request.nextUrl.origin));
}
