import { createMcpHandler, withMcpAuth } from 'mcp-handler'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'

// Service-role client — bypasses RLS, server-side only
const sb = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  )

const USER_ID = process.env.MCP_USER_ID || ''

const handler = createMcpHandler(
  (server) => {
    // ── TOOL 1: add_document ─────────────────────────
    server.tool(
      'add_document',
      'Add a new document to UK Docs (visa, BRP, insurance, contract, etc.)',
      {
        title: z.string().describe('Document name in English'),
        title_ru: z.string().optional().describe('Document name in Russian/Ukrainian'),
        category: z
          .enum(['visa', 'id', 'insurance', 'bank', 'work', 'housing', 'medical', 'other'])
          .default('other')
          .describe('Document category'),
        number: z.string().optional().describe('Document number/reference'),
        valid_until: z.string().optional().describe('Expiry date YYYY-MM-DD'),
        member: z.string().optional().describe('Family member who owns it (e.g. Сергій, Дружина)'),
        notes: z.string().optional().describe('Additional notes'),
      },
      async (args) => {
        const { data, error } = await sb()
          .from('documents')
          .insert({
            user_id: USER_ID,
            title: args.title,
            title_ru: args.title_ru || '',
            category: args.category || 'other',
            number: args.number || '',
            valid_until: args.valid_until || null,
            member: args.member || '',
            notes: args.notes || '',
            notes_ru: '',
            pinned: false,
          })
          .select()
          .single()

        if (error) {
          return { content: [{ type: 'text', text: 'Error: ' + error.message }] }
        }
        return {
          content: [
            {
              type: 'text',
              text:
                '✅ Document added: "' +
                data.title +
                '"' +
                (data.member ? ' (owner: ' + data.member + ')' : '') +
                (data.valid_until ? ', valid until ' + data.valid_until : '') +
                '. ID: ' + data.id,
            },
          ],
        }
      }
    )

    // ── TOOL 2: list_documents ───────────────────────
    server.tool(
      'list_documents',
      'List all documents stored in UK Docs, optionally filtered by category or family member',
      {
        category: z.string().optional().describe('Filter by category'),
        member: z.string().optional().describe('Filter by family member name'),
      },
      async (args) => {
        let query = sb()
          .from('documents')
          .select('id, title, category, number, valid_until, member, pinned')
          .eq('user_id', USER_ID)
          .order('created_at', { ascending: false })

        if (args.category) query = query.eq('category', args.category)
        if (args.member) query = query.eq('member', args.member)

        const { data, error } = await query
        if (error) {
          return { content: [{ type: 'text', text: 'Error: ' + error.message }] }
        }
        if (!data || data.length === 0) {
          return { content: [{ type: 'text', text: 'No documents found.' }] }
        }

        const lines = data.map((d) => {
          const parts = ['• ' + d.title + ' [' + d.category + ']']
          if (d.number) parts.push('No: ' + d.number)
          if (d.member) parts.push('Owner: ' + d.member)
          if (d.valid_until) parts.push('Expires: ' + d.valid_until)
          return parts.join(' | ')
        })

        return {
          content: [
            { type: 'text', text: 'Documents (' + data.length + '):\n' + lines.join('\n') },
          ],
        }
      }
    )

    // ── TOOL 3: add_finance_entry ────────────────────
    server.tool(
      'add_finance_entry',
      'Add an income or expense entry to UK Docs Finance tracker (for Self Assessment)',
      {
        type: z.enum(['income', 'expense']).describe('Entry type'),
        amount: z.number().positive().describe('Amount in GBP'),
        date: z
          .string()
          .optional()
          .describe('Date YYYY-MM-DD, defaults to today'),
        category: z
          .enum(['income', 'van', 'fuel', 'phone', 'insurance', 'clothing', 'mileage', 'other'])
          .optional()
          .describe('Expense category (ignored for income)'),
        note: z.string().optional().describe('Description/note'),
      },
      async (args) => {
        const date = args.date || new Date().toISOString().slice(0, 10)
        const category =
          args.type === 'income' ? 'income' : args.category || 'other'

        const { data, error } = await sb()
          .from('finance_entries')
          .insert({
            user_id: USER_ID,
            type: args.type,
            date: date,
            amount: args.amount,
            category: category,
            note: args.note || '',
          })
          .select()
          .single()

        if (error) {
          return { content: [{ type: 'text', text: 'Error: ' + error.message }] }
        }
        return {
          content: [
            {
              type: 'text',
              text:
                '✅ ' +
                (args.type === 'income' ? 'Income' : 'Expense') +
                ' £' +
                Number(data.amount).toFixed(2) +
                ' added for ' +
                data.date +
                (data.note ? ' — ' + data.note : ''),
            },
          ],
        }
      }
    )

    // ── TOOL 4: update_document ──────────────────────
    server.tool(
      'update_document',
      'Update an existing UK Docs document by its ID (e.g. change expiry date, number, notes, title, category, or owner)',
      {
        id: z.string().describe('Document ID (UUID) — get this from list_documents'),
        title: z.string().optional().describe('New document name in English'),
        title_ru: z.string().optional().describe('New document name in Russian/Ukrainian'),
        category: z
          .enum(['visa', 'id', 'insurance', 'bank', 'work', 'housing', 'medical', 'other'])
          .optional()
          .describe('New category'),
        number: z.string().optional().describe('New document number/reference'),
        valid_until: z.string().optional().describe('New expiry date YYYY-MM-DD'),
        member: z.string().optional().describe('New family member owner'),
        notes: z.string().optional().describe('New notes (replaces existing notes)'),
      },
      async (args) => {
        const updates: Record<string, any> = {}
        if (args.title !== undefined) updates.title = args.title
        if (args.title_ru !== undefined) updates.title_ru = args.title_ru
        if (args.category !== undefined) updates.category = args.category
        if (args.number !== undefined) updates.number = args.number
        if (args.valid_until !== undefined) updates.valid_until = args.valid_until || null
        if (args.member !== undefined) updates.member = args.member
        if (args.notes !== undefined) updates.notes = args.notes

        if (Object.keys(updates).length === 0) {
          return { content: [{ type: 'text', text: 'Nothing to update — provide at least one field to change.' }] }
        }

        const { data, error } = await sb()
          .from('documents')
          .update(updates)
          .eq('id', args.id)
          .eq('user_id', USER_ID)
          .select()
          .single()

        if (error) {
          return { content: [{ type: 'text', text: 'Error: ' + error.message }] }
        }
        if (!data) {
          return { content: [{ type: 'text', text: 'Document not found.' }] }
        }
        return {
          content: [
            {
              type: 'text',
              text:
                '✅ Updated "' +
                data.title +
                '"' +
                (data.valid_until ? ', now valid until ' + data.valid_until : '') +
                (data.number ? ', No: ' + data.number : ''),
            },
          ],
        }
      }
    )

    // ── TOOL 5: delete_document ───────────────────────
    server.tool(
      'delete_document',
      'Delete a UK Docs document by its ID (e.g. test entries) — get the ID from list_documents',
      {
        id: z.string().describe('Document ID (UUID) to delete'),
      },
      async (args) => {
        const { data, error } = await sb()
          .from('documents')
          .delete()
          .eq('id', args.id)
          .eq('user_id', USER_ID)
          .select()
          .single()

        if (error) {
          return { content: [{ type: 'text', text: 'Error: ' + error.message }] }
        }
        if (!data) {
          return { content: [{ type: 'text', text: 'Document not found (already deleted?).' }] }
        }
        return {
          content: [{ type: 'text', text: '🗑️ Deleted document: "' + data.title + '" (ID: ' + data.id + ')' }],
        }
      }
    )
  },
  {
    // Server info
    serverInfo: { name: 'uk-docs-mcp', version: '1.0.0' },
  },
  {
    basePath: '/api/mcp',
    maxDuration: 60,
    verboseLogs: false,
  }
)

// ── AUTH: Bearer token issued via our OAuth flow ─────
const verifyToken = async (req: Request, bearerToken?: string) => {
  const expected = process.env.MCP_AUTH_TOKEN
  if (!expected || !bearerToken || bearerToken !== expected) {
    return undefined // 401
  }
  return {
    token: bearerToken,
    scopes: ['docs:read', 'docs:write', 'finance:write'],
    clientId: 'uk-docs-client',
  }
}

const authHandler = withMcpAuth(handler, verifyToken, { required: true })

export { authHandler as GET, authHandler as POST, authHandler as DELETE }
