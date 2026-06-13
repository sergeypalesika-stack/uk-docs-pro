import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, mcp-protocol-version, mcp-session-id',
    'Access-Control-Expose-Headers': 'mcp-session-id, WWW-Authenticate',
    'Access-Control-Max-Age': '86400',
  }
}

export function middleware(req: NextRequest) {
  // Some MCP clients (incl. Claude) send the OAuth authorize request to the
  // bare origin ("/") instead of the advertised authorization_endpoint.
  // Forward that case to our real OAuth authorize handler.
  if (req.nextUrl.pathname === '/' && req.nextUrl.searchParams.get('response_type') === 'code') {
    const url = req.nextUrl.clone()
    url.pathname = '/api/oauth/authorize'
    return NextResponse.rewrite(url)
  }

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers: corsHeaders() })
  }

  const res = NextResponse.next()
  const headers = corsHeaders()
  for (const key in headers) {
    res.headers.set(key, (headers as any)[key])
  }
  return res
}

export const config = {
  matcher: ['/', '/api/:path*', '/.well-known/:path*'],
}
