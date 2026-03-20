import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Full-text search on transcriptions using PostgreSQL tsvector.
 *
 * GET /api/meetings/search?q=palavra+chave
 *
 * Returns meetings whose transcriptions match the search query.
 */
export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const q = request.nextUrl.searchParams.get('q')
  if (!q || q.trim().length < 2) {
    return NextResponse.json({ error: 'Query muito curta (minimo 2 caracteres)' }, { status: 400 })
  }

  // Use PostgreSQL full-text search with portuguese config
  // The fts column is a generated tsvector on hub_transcriptions
  const tsQuery = q
    .trim()
    .split(/\s+/)
    .map(word => `${word}:*`)
    .join(' & ')

  const { data, error } = await supabase
    .from('hub_transcriptions')
    .select(`
      id,
      meeting_id,
      summary,
      word_count,
      key_points,
      created_at,
      hub_meetings!inner(
        id,
        title,
        meeting_date,
        status,
        client_id,
        hub_clients!inner(id, nome_cliente, nome_empresa)
      )
    `)
    .textSearch('fts', tsQuery, { type: 'websearch', config: 'portuguese' })
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    // Fallback to ilike if tsvector search fails
    const { data: fallback, error: fallbackErr } = await supabase
      .from('hub_transcriptions')
      .select(`
        id,
        meeting_id,
        summary,
        word_count,
        key_points,
        created_at,
        hub_meetings!inner(
          id,
          title,
          meeting_date,
          status,
          client_id,
          hub_clients!inner(id, nome_cliente, nome_empresa)
        )
      `)
      .ilike('full_text', `%${q}%`)
      .order('created_at', { ascending: false })
      .limit(20)

    if (fallbackErr) return NextResponse.json({ error: fallbackErr.message }, { status: 500 })
    return NextResponse.json(fallback)
  }

  return NextResponse.json(data)
}
