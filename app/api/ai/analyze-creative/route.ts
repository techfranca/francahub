import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { callClaude } from '@/lib/ai/claude'
import {
  CREATIVE_ANALYSIS_PROMPT,
  buildCreativeAnalysisMessage,
  parseClaudeJSON,
} from '@/lib/ai/prompts'

/**
 * POST /api/ai/analyze-creative
 * Analyze an ad creative using AI
 * Body: { creative_id: string } or { copy_text, headline, cta, creative_type, campaign_id }
 */
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  let creativeData: {
    id?: string
    copy_text?: string | null
    headline?: string | null
    cta?: string | null
    creative_type?: string | null
    campaignObjective?: string | null
    clientSegment?: string | null
  }

  // If creative_id provided, fetch from DB
  if (body.creative_id) {
    const { data: creative } = await supabase
      .from('hub_ad_creatives')
      .select('*, hub_campaigns(objective, client_id, hub_clients(segmento))')
      .eq('id', body.creative_id)
      .single()

    if (!creative) return NextResponse.json({ error: 'Criativo nao encontrado' }, { status: 404 })

    const campaign = creative.hub_campaigns as { objective: string | null; client_id: string | null; hub_clients: { segmento: string | null } | null } | null
    creativeData = {
      id: creative.id,
      copy_text: creative.copy_text,
      headline: creative.headline,
      cta: creative.cta,
      creative_type: creative.creative_type,
      campaignObjective: campaign?.objective,
      clientSegment: campaign?.hub_clients?.segmento,
    }
  } else {
    // Direct input
    if (!body.copy_text && !body.headline) {
      return NextResponse.json({ error: 'copy_text ou headline obrigatorio' }, { status: 400 })
    }

    let campaignObjective: string | null = null
    let clientSegment: string | null = null

    if (body.campaign_id) {
      const { data: campaign } = await supabase
        .from('hub_campaigns')
        .select('objective, hub_clients(segmento)')
        .eq('id', body.campaign_id)
        .single()

      if (campaign) {
        campaignObjective = campaign.objective
        const client = campaign.hub_clients as unknown as { segmento: string | null } | null
        clientSegment = client?.segmento || null
      }
    }

    creativeData = {
      copy_text: body.copy_text,
      headline: body.headline,
      cta: body.cta,
      creative_type: body.creative_type,
      campaignObjective,
      clientSegment,
    }
  }

  try {
    const response = await callClaude({
      system: CREATIVE_ANALYSIS_PROMPT,
      messages: [{
        role: 'user',
        content: buildCreativeAnalysisMessage(creativeData),
      }],
      maxTokens: 1500,
    })

    const analysis = parseClaudeJSON<{
      rating: number
      strengths: string[]
      weaknesses: string[]
      suggestions: string
      copy_score: number
      cta_score: number
      overall_assessment: string
    }>(response)

    // Save review if we have a creative_id
    if (creativeData.id) {
      await supabase.from('hub_ad_reviews').insert({
        creative_id: creativeData.id,
        user_id: user.id,
        rating: analysis.rating,
        review_type: 'ai',
        strengths: analysis.strengths,
        weaknesses: analysis.weaknesses,
        suggestions: analysis.suggestions,
        ai_analysis: { copy_score: analysis.copy_score, cta_score: analysis.cta_score, overall_assessment: analysis.overall_assessment },
      })
    }

    return NextResponse.json(analysis)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao analisar criativo'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
