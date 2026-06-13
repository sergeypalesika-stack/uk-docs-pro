import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { finance, docs, lang } = await req.json()

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'AI not configured' }, { status: 500 })
    }

    const isUk = lang === 'uk'

    // Build summary data
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(weekStart.getDate() - 7)
    const weekStr = weekStart.toISOString().slice(0, 10)
    const monthStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0')

    const weekIncome  = finance.filter((e: any) => e.type === 'income'  && e.date >= weekStr).reduce((s: number, e: any) => s + Number(e.amount), 0)
    const weekExpense = finance.filter((e: any) => e.type === 'expense' && e.date >= weekStr).reduce((s: number, e: any) => s + Number(e.amount), 0)
    const monthIncome = finance.filter((e: any) => e.type === 'income'  && e.date.startsWith(monthStr)).reduce((s: number, e: any) => s + Number(e.amount), 0)
    const expiring    = docs.filter((d: any) => {
      if (!d.valid_until) return false
      const days = Math.ceil((new Date(d.valid_until).getTime() - now.getTime()) / 86400000)
      return days >= 0 && days <= 60
    })

    const prompt = isUk
      ? `Ти — фінансовий помічник для українця, який живе в Великобританії та працює доставщиком.

Дані за тиждень:
- Дохід: £${weekIncome.toFixed(2)}
- Витрати: £${weekExpense.toFixed(2)}
- Дохід за місяць: £${monthIncome.toFixed(2)}
- Документи що закінчуються (60 днів): ${expiring.map((d: any) => d.title + ' (' + d.valid_until + ')').join(', ') || 'немає'}

Напиши короткий дружній звіт (5-7 речень) українською мовою:
1. Оцінка тижневого заробітку
2. Важливі витрати або економія
3. Нагадування про документи
4. Одна практична порада

Будь позитивним але чесним.`
      : `You are a financial assistant for a Ukrainian living in the UK working as a delivery driver.

Weekly data:
- Income: £${weekIncome.toFixed(2)}
- Expenses: £${weekExpense.toFixed(2)}
- Month income so far: £${monthIncome.toFixed(2)}
- Expiring documents (60 days): ${expiring.map((d: any) => d.title + ' (' + d.valid_until + ')').join(', ') || 'none'}

Write a short friendly weekly summary (5-7 sentences):
1. Assessment of weekly earnings
2. Notable expenses or savings
3. Document reminders if any
4. One practical tip

Be positive but honest.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: 512,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      return NextResponse.json({ error: 'AI error: ' + err }, { status: 500 })
    }

    const data = await response.json()
    const summary = data.content?.[0]?.text || ''

    return NextResponse.json({
      success: true,
      summary,
      stats: { weekIncome, weekExpense, monthIncome, expiringCount: expiring.length },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Unknown error' }, { status: 500 })
  }
}
