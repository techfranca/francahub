import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { processTranscription } from '@/lib/ai/claude'

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const meetingId = params.id

  // Get meeting + transcription
  const { data: meeting } = await supabase
    .from('hub_meetings')
    .select('id, title, client_id')
    .eq('id', meetingId)
    .single()

  if (!meeting) {
    return NextResponse.json({ error: 'Reuniao nao encontrada' }, { status: 404 })
  }

  const { data: transcription } = await supabase
    .from('hub_transcriptions')
    .select('*')
    .eq('meeting_id', meetingId)
    .single()

  if (!transcription) {
    return NextResponse.json({ error: 'Nenhuma transcricao para processar' }, { status: 400 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY nao configurada. Adicione no .env.local' }, { status: 500 })
  }

  try {
    // Process with Claude
    const result = await processTranscription(transcription.full_text, meeting.title)

    // Update transcription with AI results
    const { error: updateErr } = await supabase
      .from('hub_transcriptions')
      .update({
        key_points: result.key_points,
        action_items: result.action_items,
        client_tasks: result.client_tasks,
        agency_tasks: result.agency_tasks,
        summary: result.summary,
        ai_processed_at: new Date().toISOString(),
      })
      .eq('id', transcription.id)

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    // Update meeting status to transcribed
    await supabase
      .from('hub_meetings')
      .update({ status: 'transcribed', updated_at: new Date().toISOString() })
      .eq('id', meetingId)

    // Timeline event
    await supabase.from('hub_timeline_events').insert({
      client_id: meeting.client_id,
      user_id: user.id,
      event_type: 'ai_insight_generated',
      title: `IA processou reuniao: ${meeting.title}`,
      description: `${result.key_points.length} pontos-chave, ${result.client_tasks.length} tarefas do cliente, ${result.agency_tasks.length} tarefas da Franca extraidas`,
    })

    return NextResponse.json({
      key_points: result.key_points,
      action_items: result.action_items,
      summary: result.summary,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
