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
    .from('hub_client_tags')
    .select('tag_id, hub_tags(*)')
    .eq('client_id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data?.map(ct => ct.hub_tags) || [])
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tag_id } = await request.json()

  const { error } = await supabase
    .from('hub_client_tags')
    .insert({ client_id: params.id, tag_id })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('hub_timeline_events').insert({
    client_id: params.id,
    user_id: user.id,
    event_type: 'tag_changed',
    title: 'Tag adicionada',
  })

  return NextResponse.json({ success: true }, { status: 201 })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tag_id } = await request.json()

  const { error } = await supabase
    .from('hub_client_tags')
    .delete()
    .eq('client_id', params.id)
    .eq('tag_id', tag_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
