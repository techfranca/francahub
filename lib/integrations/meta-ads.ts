/**
 * Meta (Facebook) Ads API integration.
 *
 * Handles OAuth token exchange, campaign fetching, and metrics syncing.
 *
 * Requires in .env.local:
 *   META_APP_ID
 *   META_APP_SECRET
 */

const META_APP_ID = process.env.META_APP_ID || ''
const META_APP_SECRET = process.env.META_APP_SECRET || ''
const META_GRAPH_URL = 'https://graph.facebook.com/v21.0'

// ── OAuth ──────────────────────────────────────────────────

export function getMetaOAuthURL(redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: META_APP_ID,
    redirect_uri: redirectUri,
    scope: 'ads_read,ads_management,business_management',
    response_type: 'code',
  })
  return `https://www.facebook.com/v21.0/dialog/oauth?${params}`
}

export async function exchangeCodeForToken(code: string, redirectUri: string): Promise<{
  access_token: string
  expires_in: number
}> {
  const params = new URLSearchParams({
    client_id: META_APP_ID,
    client_secret: META_APP_SECRET,
    redirect_uri: redirectUri,
    code,
  })

  const res = await fetch(`${META_GRAPH_URL}/oauth/access_token?${params}`)
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error?.message || 'Erro ao trocar codigo por token')
  }
  return res.json()
}

export async function getLongLivedToken(shortToken: string): Promise<{
  access_token: string
  expires_in: number
}> {
  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: META_APP_ID,
    client_secret: META_APP_SECRET,
    fb_exchange_token: shortToken,
  })

  const res = await fetch(`${META_GRAPH_URL}/oauth/access_token?${params}`)
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error?.message || 'Erro ao obter token de longa duracao')
  }
  return res.json()
}

// ── Ad Accounts ────────────────────────────────────────────

export interface MetaAdAccount {
  id: string
  account_id: string
  name: string
  account_status: number
  currency: string
}

export async function fetchAdAccounts(accessToken: string): Promise<MetaAdAccount[]> {
  const res = await fetch(
    `${META_GRAPH_URL}/me/adaccounts?fields=id,account_id,name,account_status,currency&access_token=${accessToken}`
  )
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error?.message || 'Erro ao buscar contas de anuncio')
  }
  const data = await res.json()
  return data.data || []
}

// ── Campaigns ──────────────────────────────────────────────

export interface MetaCampaign {
  id: string
  name: string
  objective: string
  status: string
  daily_budget: string | null
  lifetime_budget: string | null
  created_time: string
}

export async function fetchCampaigns(adAccountId: string, accessToken: string): Promise<MetaCampaign[]> {
  const fields = 'id,name,objective,status,daily_budget,lifetime_budget,created_time'
  const res = await fetch(
    `${META_GRAPH_URL}/${adAccountId}/campaigns?fields=${fields}&limit=100&access_token=${accessToken}`
  )
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error?.message || 'Erro ao buscar campanhas')
  }
  const data = await res.json()
  return data.data || []
}

// ── Campaign Insights (Metrics) ────────────────────────────

export interface MetaInsight {
  date_start: string
  date_stop: string
  impressions: string
  clicks: string
  spend: string
  conversions?: string
  cpc: string
  cpm: string
  ctr: string
  reach: string
  frequency: string
  actions?: Array<{ action_type: string; value: string }>
}

export async function fetchCampaignInsights(
  campaignId: string,
  accessToken: string,
  dateRange: { since: string; until: string }
): Promise<MetaInsight[]> {
  const fields = 'impressions,clicks,spend,cpc,cpm,ctr,reach,frequency,actions'
  const params = new URLSearchParams({
    fields,
    time_range: JSON.stringify(dateRange),
    time_increment: '1', // daily breakdown
    access_token: accessToken,
  })

  const res = await fetch(`${META_GRAPH_URL}/${campaignId}/insights?${params}`)
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error?.message || 'Erro ao buscar metricas')
  }
  const data = await res.json()
  return data.data || []
}

// ── Encryption helpers ─────────────────────────────────────
export { encrypt as encryptToken, decrypt as decryptToken } from '@/lib/encryption'
