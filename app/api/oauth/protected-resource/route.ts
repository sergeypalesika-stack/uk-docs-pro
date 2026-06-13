import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const origin = url.protocol + '//' + url.host

  return NextResponse.json({
    resource: origin + '/api/mcp/mcp',
    authorization_servers: [origin],
    bearer_methods_supported: ['header'],
    scopes_supported: ['docs:read', 'docs:write', 'finance:write'],
  })
}
