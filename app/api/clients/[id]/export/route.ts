import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/clients/[id]/export
 * Returns all client data as JSON for PDF rendering on the frontend
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [clientRes, credRes, notesRes, meetingsRes, campaignsRes, insightsRes] = await Promise.all([
    supabase.from('hub_clients').select('*').eq('id', params.id).single(),
    supabase.from('hub_credentials').select('platform_name, credential_type, login, notes').eq('client_id', params.id),
    supabase.from('hub_notes').select('content, is_pinned, created_at').eq('client_id', params.id).order('is_pinned', { ascending: false }).order('created_at', { ascending: false }),
    supabase.from('hub_meetings').select('title, meeting_date, status, duration_minutes').eq('client_id', params.id).order('meeting_date', { ascending: false }).limit(20),
    supabase.from('hub_campaigns').select('name, status, objective, product_service, daily_budget').eq('client_id', params.id),
    supabase.from('hub_ai_insights').select('title, content, insight_type, created_at').eq('client_id', params.id).eq('is_dismissed', false).order('created_at', { ascending: false }).limit(10),
  ])

  if (!clientRes.data) return NextResponse.json({ error: 'Cliente nao encontrado' }, { status: 404 })

  // Log export
  await supabase.from('hub_audit_log').insert({
    user_id: user.id,
    action: 'export',
    entity_type: 'client',
    entity_id: params.id,
    changes: { format: 'pdf' },
  })

  return NextResponse.json({
    client: clientRes.data,
    credentials: credRes.data || [],
    notes: notesRes.data || [],
    meetings: meetingsRes.data || [],
    campaigns: campaignsRes.data || [],
    insights: insightsRes.data || [],
    exported_at: new Date().toISOString(),
    exported_by: user.email,
  })
}
