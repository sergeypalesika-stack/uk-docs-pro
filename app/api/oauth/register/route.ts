import { NextResponse } from 'next/server'

// Single-user app: accept any registration and return a fixed public client.
export async function POST(req: Request) {
  let body: any = {}
  try {
    body = await req.json()
  } catch (err) {
    body = {}
  }

  return NextResponse.json({
    client_id: 'uk-docs-client',
    client_id_issued_at: Math.floor(Date.now() / 1000),
    redirect_uris: body.redirect_uris || [],
    token_endpoint_auth_method: 'none',
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    client_name: body.client_name || 'UK Docs Client',
  })
}
