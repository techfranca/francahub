import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { callClaude } from '@/lib/ai/claude'
import {
  CROSS_CORRELATION_PROMPT,
  buildCrossCorrelationMessage,
  parseClaudeJSON,
} from '@/lib/ai/prompts'

/**
 * POST /api/ai/correlate
 * Cross-correlation analysis: meetings + ads + client profile
 * Body: { client_id: string }
 */
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { client_id } = await request.json()
  if (!client_id) return NextResponse.json({ error: 'client_id obrigatorio' }, { status: 400 })

  // Fetch client profile
  const { data: client } = await supabase
    .from('hub_clients')
    .select('*')
    .eq('id', client_id)
    .single()

  if (!client) return NextResponse.json({ error: 'Cliente nao encontrado' }, { status: 404 })

  // Fetch recent meetings with transcriptions
  const { data: meetings } = await supabase
    .from('hub_meetings')
    .select('title, meeting_date, hub_transcriptions(summary, key_points)')
    .eq('client_id', client_id)
    .order('meeting_date', { ascending: false })
    .limit(5)

  const recentMeetings = (meetings || []).map(m => {
    const transcription = Array.isArray(m.hub_transcriptions) ? m.hub_transcriptions[0] : m.hub_transcriptions
    return {
      title: m.title,
      date: m.meeting_date,
      summary: transcription?.summary || null,
      key_points: (transcription?.key_points || []) as string[],
    }
  })

  // Fetch ad performance (30 days)
  const since = new Date()
  since.setDate(since.getDate() - 30)

  const { data: campaigns } = await supabase
    .from('hub_campaigns')
    .select('id, status')
    .eq('client_id', client_id)

  const adPerformance = {
    totalSpend: 0,
    totalClicks: 0,
    totalImpressions: 0,
    avgCTR: 0,
    avgCPC: 0,
    activeCampaigns: 0,
  }

  if (campaigns?.length) {
    adPerformance.activeCampaigns = campaigns.filter(c => c.status === 'ACTIVE').length
    const campaignIds = campaigns.map(c => c.id)

    const { data: metrics } = await supabase
      .from('hub_campaign_metrics')
      .select('spend, impressions, clicks')
      .in('campaign_id', campaignIds)
      .gte('date', since.toISOString().split('T')[0])

    if (metrics?.length) {
      const totals = metrics.reduce(
        (acc, m) => ({
          spend: acc.spend + parseFloat(String(m.spend || 0)),
          impressions: acc.impressions + (m.impressions || 0),
          clicks: acc.clicks + (m.clicks || 0),
        }),
        { spend: 0, impressions: 0, clicks: 0 }
      )

      adPerformance.totalSpend = totals.spend
      adPerformance.totalClicks = totals.clicks
      adPerformance.totalImpressions = totals.impressions
      adPerformance.avgCTR = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0
      adPerformance.avgCPC = totals.clicks > 0 ? totals.spend / totals.clicks : 0
    }
  }

  try {
    const response = await callClaude({
      system: CROSS_CORRELATION_PROMPT,
      messages: [{
        role: 'user',
        content: buildCrossCorrelationMessage({
          client: {
            nome: client.nome_empresa || client.nome_cliente,
            segmento: client.segmento,
            nicho: client.nicho,
            servicos: client.servicos_contratados,
            behavioral_profile: client.behavioral_profile,
          },
          recentMeetings,
          adPerformance,
        }),
      }],
      maxTokens: 2048,
    })

    const analysis = parseClaudeJSON<{
      strategic_summary: string
      correlations: Array<{ finding: string; source: string; impact: string }>
      recommendations: Array<{ action: string; priority: string; area: string }>
      risks: string[]
      opportunities: string[]
    }>(response)

    // Save as insights
    const insights = []

    insights.push({
      client_id,
      insight_type: 'meeting_correlation',
      title: `Analise Cruzada - ${client.nome_empresa || client.nome_cliente}`,
      content: analysis.strategic_summary,
      confidence: 0.85,
      source_data: { correlations: analysis.correlations, risks: analysis.risks, opportunities: analysis.opportunities },
      is_actionable: true,
      is_dismissed: false,
    })

    for (const rec of analysis.recommendations.slice(0, 3)) {
      insights.push({
        client_id,
        insight_type: 'strategic_recommendation',
        title: `${rec.area.charAt(0).toUpperCase() + rec.area.slice(1)}: ${rec.action.slice(0, 80)}`,
        content: rec.action,
        confidence: rec.priority === 'urgente' ? 0.95 : rec.priority === 'alta' ? 0.85 : 0.7,
        source_data: { priority: rec.priority, area: rec.area, origin: 'cross_correlation' },
        is_actionable: true,
        is_dismissed: false,
      })
    }

    const { data: saved } = await supabase
      .from('hub_ai_insights')
      .insert(insights)
      .select()

    // Timeline event
    await supabase.from('hub_timeline_events').insert({
      client_id,
      user_id: user.id,
      event_type: 'ai_insight_generated',
      title: 'Analise cruzada de IA gerada',
      description: analysis.strategic_summary.slice(0, 200),
      metadata: { type: 'cross_correlation', insight_count: insights.length },
    })

    return NextResponse.json({ insights: saved, analysis })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao gerar correlacao'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
