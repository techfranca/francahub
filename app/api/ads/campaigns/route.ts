import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET: List campaigns, optionally filtered by client or ad account
export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const searchParams = request.nextUrl.searchParams
  const clientId = searchParams.get('client_id')
  const accountId = searchParams.get('account_id')

  let query = supabase
    .from('hub_campaigns')
    .select(`
      *,
      hub_ad_accounts(id, account_name, meta_account_id),
      hub_clients(id, nome_cliente, nome_empresa)
    `)
    .order('updated_at', { ascending: false })

  if (clientId) query = query.eq('client_id', clientId)
  if (accountId) query = query.eq('ad_account_id', accountId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

// PATCH: Link campaign to client or update product_service
export async function PATCH(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  if (!body.id) return NextResponse.json({ error: 'Campaign id required' }, { status: 400 })

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.client_id !== undefined) updates.client_id = body.client_id || null
  if (body.product_service !== undefined) updates.product_service = body.product_service
  if (body.is_product_active !== undefined) updates.is_product_active = body.is_product_active

  const { data, error } = await supabase
    .from('hub_campaigns')
    .update(updates)
    .eq('id', body.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
