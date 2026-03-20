import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getAuthUrl } from '@/lib/integrations/google-calendar'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = getAuthUrl()
  return NextResponse.redirect(url)
}
