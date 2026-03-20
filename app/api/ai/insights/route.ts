import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { callClaude } from '@/lib/ai/claude'
import {
  PERFORMANCE_TREND_PROMPT,
  buildPerformanceTrendMessage,
  parseClaudeJSON,
} from '@/lib/ai/prompts'

/**
 * GET /api/ai/insights
 * List insights, optionally filtered by client_id
 */
export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const searchParams = request.nextUrl.searchParams
  const clientId = searchParams.get('client_id')
  const limit = parseInt(searchParams.get('limit') || '50')
  const showDismissed = searchParams.get('show_dismissed') === 'true'

  let query = supabase
    .from('hub_ai_insights')
    .select('*, hub_clients(id, nome_cliente, nome_empresa)')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (clientId) query = query.eq('client_id', clientId)
  if (!showDismissed) query = query.eq('is_dismissed', false)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

/**
 * POST /api/ai/insights
 * Generate performance insights for a client
 * Body: { client_id: string }
 */
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { client_id } = await request.json()
  if (!client_id) return NextResponse.json({ error: 'client_id obrigatorio' }, { status: 400 })

  // Fetch client
  const { data: client } = await supabase
    .from('hub_clients')
    .select('*')
    .eq('id', client_id)
    .single()

  if (!client) return NextResponse.json({ error: 'Cliente nao encontrado' }, { status: 404 })

  // Fetch campaigns with recent metrics
  const since = new Date()
  since.setDate(since.getDate() - 30)

  const { data: campaigns } = await supabase
    .from('hub_campaigns')
    .select('id, name, status, objective')
    .eq('client_id', client_id)

  if (!campaigns?.length) {
    return NextResponse.json({ error: 'Nenhuma campanha vinculada a este cliente' }, { status: 400 })
  }

  // Fetch metrics for all campaigns
  const campaignData = []
  for (const camp of campaigns) {
    const { data: metrics } = await supabase
      .from('hub_campaign_metrics')
      .select('spend, impressions, clicks, ctr, cpc, conversions')
      .eq('campaign_id', camp.id)
      .gte('date', since.toISOString().split('T')[0])

    const totals = (metrics || []).reduce(
      (acc, m) => ({
        spend: acc.spend + parseFloat(String(m.spend || 0)),
        impressions: acc.impressions + (m.impressions || 0),
        clicks: acc.clicks + (m.clicks || 0),
        conversions: acc.conversions + (m.conversions || 0),
      }),
      { spend: 0, impressions: 0, clicks: 0, conversions: 0 }
    )

    campaignData.push({
      name: camp.name,
      status: camp.status || 'UNKNOWN',
      metrics: {
        ...totals,
        ctr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
        cpc: totals.clicks > 0 ? totals.spend / totals.clicks : 0,
      },
    })
  }

  try {
    const response = await callClaude({
      system: PERFORMANCE_TREND_PROMPT,
      messages: [{
        role: 'user',
        content: buildPerformanceTrendMessage({
          clientName: client.nome_empresa || client.nome_cliente,
          campaigns: campaignData,
          periodDays: 30,
        }),
      }],
      maxTokens: 2048,
    })

    const analysis = parseClaudeJSON<{
      summary: string
      trends: Array<{ type: string; description: string }>
      anomalies: string[]
      recommendations: string[]
      health_score: number
    }>(response)

    // Save insights
    const insights = []

    // Main performance trend insight
    insights.push({
      client_id,
      insight_type: 'performance_trend',
      title: `Analise de Performance - ${client.nome_empresa || client.nome_cliente}`,
      content: analysis.summary,
      confidence: analysis.health_score / 100,
      source_data: { trends: analysis.trends, anomalies: analysis.anomalies, health_score: analysis.health_score },
      is_actionable: analysis.recommendations.length > 0,
      is_dismissed: false,
    })

    // Individual recommendations as actionable insights
    for (const rec of analysis.recommendations.slice(0, 3)) {
      insights.push({
        client_id,
        insight_type: 'ad_optimization',
        title: 'Recomendacao de Otimizacao',
        content: rec,
        confidence: 0.8,
        source_data: { origin: 'performance_analysis' },
        is_actionable: true,
        is_dismissed: false,
      })
    }

    const { data: saved, error } = await supabase
      .from('hub_ai_insights')
      .insert(insights)
      .select()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Timeline event
    await supabase.from('hub_timeline_events').insert({
      client_id,
      user_id: user.id,
      event_type: 'ai_insight_generated',
      title: 'Insights de IA gerados',
      description: `${insights.length} insights gerados pela analise de performance`,
      metadata: { insight_count: insights.length },
    })

    return NextResponse.json({ insights: saved, analysis })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao gerar insights'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * PATCH /api/ai/insights
 * Dismiss or un-dismiss an insight
 * Body: { id: string, is_dismissed: boolean }
 */
export async function PATCH(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, is_dismissed } = await request.json()
  if (!id) return NextResponse.json({ error: 'id obrigatorio' }, { status: 400 })

  const { error } = await supabase
    .from('hub_ai_insights')
    .update({ is_dismissed })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
