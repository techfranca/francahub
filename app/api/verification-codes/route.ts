import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET — list codes (authenticated users)
export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Auto-expire codes older than 10 minutes
  await supabase
    .from('hub_verification_codes')
    .update({ status: 'expired' })
    .eq('status', 'active')
    .lt('expires_at', new Date().toISOString())

  const { data, error } = await supabase
    .from('hub_verification_codes')
    .select('*')
    .order('received_at', { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST — receive from n8n webhook
export async function POST(request: NextRequest) {
  // Validate webhook secret
  const auth = request.headers.get('authorization')
  const secret = process.env.WEBHOOK_SECRET
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient()
  const body = await request.json()

  const { platform, code, subject, body_preview, expires_in_minutes } = body

  if (!platform || !code) {
    return NextResponse.json({ error: 'platform e code são obrigatórios' }, { status: 400 })
  }

  const expiresAt = new Date(
    Date.now() + (expires_in_minutes || 10) * 60 * 1000
  ).toISOString()

  const { data, error } = await supabase
    .from('hub_verification_codes')
    .insert({
      platform,
      code,
      subject: subject || null,
      body_preview: body_preview || null,
      expires_at: expiresAt,
      status: 'active',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
