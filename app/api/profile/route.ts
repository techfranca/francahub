import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('hub_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return NextResponse.json({
    profile,
    user: {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.full_name || user.user_metadata?.name || '',
      avatar: user.user_metadata?.avatar_url || '',
    },
  })
}

export async function PATCH(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const allowedFields = ['nome', 'cargo', 'bio', 'telefone', 'instagram', 'linkedin', 'avatar_url']
  const cleanData: Record<string, unknown> = {}
  for (const key of allowedFields) {
    if (body[key] !== undefined) {
      cleanData[key] = body[key] === '' ? null : body[key]
    }
  }
  cleanData.updated_at = new Date().toISOString()

  // Upsert profile
  const { data, error } = await supabase
    .from('hub_profiles')
    .upsert({
      user_id: user.id,
      ...cleanData,
    }, { onConflict: 'user_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}
