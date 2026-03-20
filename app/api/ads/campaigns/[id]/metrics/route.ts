import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET: Fetch daily metrics for a campaign
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const searchParams = request.nextUrl.searchParams
  const days = parseInt(searchParams.get('days') || '30')
  const sinceDate = new Date()
  sinceDate.setDate(sinceDate.getDate() - days)

  const { data, error } = await supabase
    .from('hub_campaign_metrics')
    .select('*')
    .eq('campaign_id', params.id)
    .gte('date', sinceDate.toISOString().split('T')[0])
    .order('date', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Calculate totals
  const totals = (data || []).reduce(
    (acc, m) => ({
      impressions: acc.impressions + (m.impressions || 0),
      clicks: acc.clicks + (m.clicks || 0),
      spend: acc.spend + parseFloat(m.spend || '0'),
      conversions: acc.conversions + (m.conversions || 0),
      reach: acc.reach + (m.reach || 0),
    }),
    { impressions: 0, clicks: 0, spend: 0, conversions: 0, reach: 0 }
  )

  const avgCPC = totals.clicks > 0 ? totals.spend / totals.clicks : 0
  const avgCTR = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0
  const avgCPM = totals.impressions > 0 ? (totals.spend / totals.impressions) * 1000 : 0

  return NextResponse.json({
    daily: data,
    totals: {
      ...totals,
      cpc: avgCPC,
      ctr: avgCTR,
      cpm: avgCPM,
    },
  })
}
