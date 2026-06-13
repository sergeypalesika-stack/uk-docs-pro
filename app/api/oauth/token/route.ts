import { NextResponse } from 'next/server'
import crypto from 'crypto'

function sign(payload: string) {
  const secret = process.env.MCP_AUTH_TOKEN || 'uk-docs-fallback-secret'
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url')
}

function verifyCode(code: string): { cc: string; ccm: string; exp: number } | null {
  const parts = code.split('.')
  if (parts.length !== 2) return null
  const [payloadB64, signature] = parts
  const expected = sign(payloadB64)
  if (signature !== expected) return null
  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8'))
    if (Date.now() > payload.exp) return null
    return payload
  } catch (err) {
    return null
  }
}

function verifyPkce(codeVerifier: string, codeChallenge: string, method: string) {
  if (!codeChallenge) return true // no PKCE used
  if (method === 'S256') {
    const hash = crypto.createHash('sha256').update(codeVerifier).digest('base64url')
    return hash === codeChallenge
  }
  return codeVerifier === codeChallenge
}

const ACCESS_TOKEN = process.env.MCP_AUTH_TOKEN || ''

async function readParams(req: Request): Promise<Record<string, string>> {
  const contentType = req.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    const body = await req.json().catch(() => ({}))
    return body || {}
  }
  const text = await req.text()
  const params = new URLSearchParams(text)
  const out: Record<string, string> = {}
  params.forEach((v, k) => { out[k] = v })
  return out
}

export async function POST(req: Request) {
  const params = await readParams(req)
  const grantType = params.grant_type

  if (grantType === 'authorization_code') {
    const code = params.code || ''
    const codeVerifier = params.code_verifier || ''

    const decoded = verifyCode(code)
    if (!decoded) {
      return NextResponse.json({ error: 'invalid_grant', error_description: 'Invalid or expired code' }, { status: 400 })
    }
    if (!verifyPkce(codeVerifier, decoded.cc, decoded.ccm)) {
      return NextResponse.json({ error: 'invalid_grant', error_description: 'PKCE verification failed' }, { status: 400 })
    }

    return NextResponse.json({
      access_token: ACCESS_TOKEN,
      token_type: 'Bearer',
      expires_in: 31536000,
      refresh_token: ACCESS_TOKEN,
      scope: 'docs:read docs:write finance:write',
    })
  }

  if (grantType === 'refresh_token') {
    return NextResponse.json({
      access_token: ACCESS_TOKEN,
      token_type: 'Bearer',
      expires_in: 31536000,
      refresh_token: ACCESS_TOKEN,
      scope: 'docs:read docs:write finance:write',
    })
  }

  return NextResponse.json({ error: 'unsupported_grant_type' }, { status: 400 })
}
