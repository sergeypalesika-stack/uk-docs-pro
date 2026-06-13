import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const origin = url.protocol + '//' + url.host

  return NextResponse.json({
    issuer: origin,
    authorization_endpoint: origin + '/api/oauth/authorize',
    token_endpoint: origin + '/api/oauth/token',
    registration_endpoint: origin + '/api/oauth/register',
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256', 'plain'],
    token_endpoint_auth_methods_supported: ['none', 'client_secret_post'],
    scopes_supported: ['docs:read', 'docs:write', 'finance:write'],
  })
}
