import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { imageBase64, mediaType } = await req.json()

    if (!imageBase64) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'AI not configured' }, { status: 500 })
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType || 'image/jpeg',
                  data: imageBase64,
                },
              },
              {
                type: 'text',
                text: `You are a document scanner for a UK document management app.
Look at this document image and extract the following information.
Respond ONLY with a JSON object, no markdown, no explanation.

{
  "title": "Short English document name (e.g. Driving Licence UK, National Insurance Card, Car Insurance)",
  "category": "one of: visa|id|insurance|bank|work|housing|medical|driving|immigration|qualification|tax|passport|other",
  "number": "document number, reference, or code (or empty string)",
  "valid_until": "expiry date in YYYY-MM-DD format (or empty string if no expiry)",
  "valid_from": "issue date in YYYY-MM-DD format (or empty string)",
  "notes": "any other important info: issuer, address, key details (max 100 chars)",
  "confidence": "high|medium|low"
}

If you cannot read the document clearly, set confidence to "low" and fill what you can.`,
              },
            ],
          },
        ],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      return NextResponse.json({ error: 'AI error: ' + err }, { status: 500 })
    }

    const data = await response.json()
    const text = data.content?.[0]?.text || '{}'

    // Clean and parse JSON
    const clean = text.replace(/```json|```/g, '').trim()
    const result = JSON.parse(clean)

    return NextResponse.json({ success: true, document: result })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Unknown error' }, { status: 500 })
  }
}
