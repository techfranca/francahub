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
    .from('hub_credentials')
    .select('*')
    .eq('client_id', params.id)
    .order('credential_type')
    .order('platform_name')

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

  const body = await request.json()
  const credentials = Array.isArray(body) ? body : [body]

  // Delete existing and replace
  await supabase.from('hub_credentials').delete().eq('client_id', params.id)

  const toInsert = credentials
    .filter((c: { platform_name: string }) => c.platform_name)
    .map((c: { id?: string; credential_type: string; platform_name: string; login: string; password: string; notes: string }) => ({
      client_id: params.id,
      credential_type: c.credential_type || 'standard',
      platform_name: c.platform_name,
      login: c.login || null,
      password: c.password || null,
      notes: c.notes || null,
    }))

  if (toInsert.length) {
    const { error } = await supabase.from('hub_credentials').insert(toInsert)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Timeline event
  await supabase.from('hub_timeline_events').insert({
    client_id: params.id,
    user_id: user.id,
    event_type: 'credential_updated',
    title: 'Credenciais atualizadas',
    description: `${toInsert.length} credencial(is) salva(s)`,
  })

  const { data } = await supabase
    .from('hub_credentials')
    .select('*')
    .eq('client_id', params.id)
    .order('credential_type')
    .order('platform_name')

  return NextResponse.json(data)
}
