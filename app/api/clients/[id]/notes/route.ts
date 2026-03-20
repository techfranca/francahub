import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('hub_notes')
    .select('*')
    .eq('client_id', params.id)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { content } = await request.json()

  const { data, error } = await supabase
    .from('hub_notes')
    .insert({
      client_id: params.id,
      user_id: user.id,
      content,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Timeline
  await supabase.from('hub_timeline_events').insert({
    client_id: params.id,
    user_id: user.id,
    event_type: 'note_added',
    title: 'Nota adicionada',
    description: content.substring(0, 100),
  })

  return NextResponse.json(data, { status: 201 })
}
