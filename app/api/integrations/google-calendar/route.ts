import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('hub_integrations')
    .select('provider, account_email, status, updated_at')
    .eq('provider', 'google_calendar')
    .single()

  return NextResponse.json({ connected: !!data, integration: data || null })
}

export async function DELETE() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await supabase
    .from('hub_integrations')
    .delete()
    .eq('provider', 'google_calendar')

  return NextResponse.json({ success: true })
}
