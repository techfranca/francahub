import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { encryptToken, fetchAdAccounts, exchangeCodeForToken, getLongLivedToken } from '@/lib/integrations/meta-ads'

// GET: List connected ad accounts
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('hub_ad_accounts')
    .select('id, meta_account_id, account_name, status, last_sync_at, created_at')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST: Connect a new ad account via OAuth code
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  // Option 1: OAuth code exchange
  if (body.code && body.redirect_uri) {
    try {
      const shortToken = await exchangeCodeForToken(body.code, body.redirect_uri)
      const longToken = await getLongLivedToken(shortToken.access_token)

      // Fetch ad accounts from Meta
      const accounts = await fetchAdAccounts(longToken.access_token)

      if (!accounts.length) {
        return NextResponse.json({ error: 'Nenhuma conta de anuncio encontrada' }, { status: 400 })
      }

      // Save all discovered accounts
      const results = []
      for (const account of accounts) {
        const { data, error } = await supabase
          .from('hub_ad_accounts')
          .upsert({
            meta_account_id: account.account_id,
            account_name: account.name,
            access_token_encrypted: encryptToken(longToken.access_token),
            token_expires_at: new Date(Date.now() + longToken.expires_in * 1000).toISOString(),
            status: 'active',
          }, { onConflict: 'organization_id,meta_account_id' })
          .select('id, meta_account_id, account_name, status')
          .single()

        if (!error && data) results.push(data)
      }

      return NextResponse.json(results, { status: 201 })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro na autenticacao Meta'
      return NextResponse.json({ error: message }, { status: 500 })
    }
  }

  // Option 2: Direct token (for testing / manual setup)
  if (body.access_token && body.meta_account_id) {
    const { data, error } = await supabase
      .from('hub_ad_accounts')
      .upsert({
        meta_account_id: body.meta_account_id,
        account_name: body.account_name || null,
        access_token_encrypted: encryptToken(body.access_token),
        token_expires_at: body.token_expires_at || null,
        status: 'active',
      }, { onConflict: 'organization_id,meta_account_id' })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  }

  return NextResponse.json({ error: 'Envie code+redirect_uri ou access_token+meta_account_id' }, { status: 400 })
}
