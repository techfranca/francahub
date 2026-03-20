import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { decryptToken, fetchCampaigns, fetchCampaignInsights } from '@/lib/integrations/meta-ads'

/**
 * POST /api/ads/sync
 *
 * Syncs campaigns and recent metrics from Meta Ads for a given ad account.
 * Body: { account_id: string, days?: number }
 */
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const accountDbId = body.account_id
  const days = body.days || 30

  // Get the ad account with decrypted token
  const { data: account, error: accErr } = await supabase
    .from('hub_ad_accounts')
    .select('*')
    .eq('id', accountDbId)
    .single()

  if (accErr || !account) {
    return NextResponse.json({ error: 'Conta nao encontrada' }, { status: 404 })
  }

  let accessToken: string
  try {
    accessToken = decryptToken(account.access_token_encrypted)
  } catch {
    return NextResponse.json({ error: 'Erro ao descriptografar token' }, { status: 500 })
  }

  const metaAccountId = `act_${account.meta_account_id}`

  try {
    // 1. Sync campaigns
    const metaCampaigns = await fetchCampaigns(metaAccountId, accessToken)

    // Load all clients with tags for auto-matching
    const { data: clientsWithTags } = await supabase
      .from('hub_clients')
      .select('id, tag')
      .not('tag', 'is', null)
      .eq('ativo', true)

    // Build tag → client_id map (uppercase for case-insensitive match)
    const tagMap = new Map<string, string>()
    for (const c of (clientsWithTags || [])) {
      if (c.tag) tagMap.set(c.tag.toUpperCase().trim(), c.id)
    }

    // Find client by campaign name prefix: "TAG - ..."
    const findClientByTag = (campaignName: string): string | null => {
      const prefix = campaignName.split(/[\s-]/)[0].toUpperCase().trim()
      return tagMap.get(prefix) || null
    }

    let campaignsSynced = 0
    let metricsSynced = 0
    let autoLinked = 0

    for (const mc of metaCampaigns) {
      // Auto-detect client from campaign name tag
      const detectedClientId = findClientByTag(mc.name)

      // Check if campaign already exists to preserve manually set client_id
      const { data: existing } = await supabase
        .from('hub_campaigns')
        .select('id, client_id')
        .eq('ad_account_id', accountDbId)
        .eq('meta_campaign_id', mc.id)
        .single()

      // Use existing client_id if set manually, otherwise use auto-detected
      const clientId = existing?.client_id || detectedClientId
      if (detectedClientId && !existing?.client_id) autoLinked++

      const { data: campaign } = await supabase
        .from('hub_campaigns')
        .upsert({
          ad_account_id: accountDbId,
          meta_campaign_id: mc.id,
          name: mc.name,
          objective: mc.objective || null,
          status: mc.status,
          client_id: clientId,
          daily_budget: mc.daily_budget ? parseFloat(mc.daily_budget) / 100 : null,
          lifetime_budget: mc.lifetime_budget ? parseFloat(mc.lifetime_budget) / 100 : null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'ad_account_id,meta_campaign_id' })
        .select('id')
        .single()

      if (!campaign) continue
      campaignsSynced++

      // 2. Sync daily metrics for each campaign
      const since = new Date()
      since.setDate(since.getDate() - days)
      const until = new Date()

      try {
        const insights = await fetchCampaignInsights(mc.id, accessToken, {
          since: since.toISOString().split('T')[0],
          until: until.toISOString().split('T')[0],
        })

        for (const insight of insights) {
          const conversions = insight.actions
            ?.filter(a => a.action_type === 'offsite_conversion' || a.action_type === 'purchase')
            ?.reduce((sum, a) => sum + parseInt(a.value), 0) || 0

          await supabase
            .from('hub_campaign_metrics')
            .upsert({
              campaign_id: campaign.id,
              date: insight.date_start,
              impressions: parseInt(insight.impressions || '0'),
              clicks: parseInt(insight.clicks || '0'),
              spend: parseFloat(insight.spend || '0'),
              conversions,
              cpc: parseFloat(insight.cpc || '0'),
              cpm: parseFloat(insight.cpm || '0'),
              ctr: parseFloat(insight.ctr || '0'),
              reach: parseInt(insight.reach || '0'),
              frequency: parseFloat(insight.frequency || '0'),
              raw_data: insight,
            }, { onConflict: 'campaign_id,date' })

          metricsSynced++
        }
      } catch {
        // Skip metrics for campaigns with errors (e.g., paused campaigns)
      }
    }

    // Update last_sync_at
    await supabase
      .from('hub_ad_accounts')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', accountDbId)

    return NextResponse.json({
      success: true,
      campaigns_synced: campaignsSynced,
      metrics_synced: metricsSynced,
      auto_linked: autoLinked,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao sincronizar'

    // Mark account as error
    await supabase
      .from('hub_ad_accounts')
      .update({ status: 'error' })
      .eq('id', accountDbId)

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
