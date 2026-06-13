import { NextResponse } from 'next/server'
import crypto from 'crypto'

// Sign a payload with HMAC using MCP_AUTH_TOKEN as the secret.
function sign(payload: string) {
  const secret = process.env.MCP_AUTH_TOKEN || 'uk-docs-fallback-secret'
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url')
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const redirectUri = url.searchParams.get('redirect_uri') || ''
  const state = url.searchParams.get('state') || ''
  const codeChallenge = url.searchParams.get('code_challenge') || ''
  const codeChallengeMethod = url.searchParams.get('code_challenge_method') || 'plain'

  if (!redirectUri) {
    return NextResponse.json({ error: 'invalid_request', error_description: 'redirect_uri is required' }, { status: 400 })
  }

  // Build an authorization code that embeds the PKCE challenge + expiry,
  // signed so the token endpoint can verify it without a database.
  const payload = JSON.stringify({
    cc: codeChallenge,
    ccm: codeChallengeMethod,
    exp: Date.now() + 5 * 60 * 1000, // 5 minutes
  })
  const payloadB64 = Buffer.from(payload).toString('base64url')
  const signature = sign(payloadB64)
  const code = payloadB64 + '.' + signature

  const redirect = new URL(redirectUri)
  redirect.searchParams.set('code', code)
  if (state) redirect.searchParams.set('state', state)

  return NextResponse.redirect(redirect.toString())
}
