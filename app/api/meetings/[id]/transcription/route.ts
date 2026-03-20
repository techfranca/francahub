import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// POST: Create or update transcription for a meeting
// Can receive full_text directly (manual paste) or trigger AI processing
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const meetingId = params.id

  // Verify meeting exists
  const { data: meeting, error: meetingErr } = await supabase
    .from('hub_meetings')
    .select('id, client_id, title')
    .eq('id', meetingId)
    .single()

  if (meetingErr || !meeting) {
    return NextResponse.json({ error: 'Reuniao nao encontrada' }, { status: 404 })
  }

  const body = await request.json()

  // If full_text is provided, save the transcription directly
  if (body.full_text) {
    const wordCount = body.full_text.split(/\s+/).filter(Boolean).length

    // Upsert transcription (one per meeting)
    const { data: existing } = await supabase
      .from('hub_transcriptions')
      .select('id')
      .eq('meeting_id', meetingId)
      .single()

    let transcription
    if (existing) {
      const { data, error } = await supabase
        .from('hub_transcriptions')
        .update({
          full_text: body.full_text,
          word_count: wordCount,
          provider: body.provider || 'whisper',
          language: body.language || 'pt-BR',
          key_points: body.key_points || [],
          action_items: body.action_items || [],
          summary: body.summary || null,
          ai_processed_at: body.summary ? new Date().toISOString() : null,
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      transcription = data
    } else {
      const { data, error } = await supabase
        .from('hub_transcriptions')
        .insert({
          meeting_id: meetingId,
          full_text: body.full_text,
          word_count: wordCount,
          provider: body.provider || 'whisper',
          language: body.language || 'pt-BR',
          key_points: body.key_points || [],
          action_items: body.action_items || [],
          summary: body.summary || null,
          ai_processed_at: body.summary ? new Date().toISOString() : null,
        })
        .select()
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      transcription = data
    }

    // Update meeting status
    const newStatus = body.summary ? 'transcribed' : 'transcribing'
    await supabase
      .from('hub_meetings')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', meetingId)

    // Timeline event
    await supabase.from('hub_timeline_events').insert({
      client_id: meeting.client_id,
      user_id: user.id,
      event_type: 'meeting_recorded',
      title: `Transcricao adicionada: ${meeting.title}`,
      description: `${wordCount} palavras transcritas`,
    })

    return NextResponse.json(transcription, { status: 201 })
  }

  return NextResponse.json({ error: 'full_text is required' }, { status: 400 })
}

// GET: Retrieve transcription for a meeting
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('hub_transcriptions')
    .select('*')
    .eq('meeting_id', params.id)
    .single()

  if (error) return NextResponse.json({ error: 'Nenhuma transcricao encontrada' }, { status: 404 })

  return NextResponse.json(data)
}
