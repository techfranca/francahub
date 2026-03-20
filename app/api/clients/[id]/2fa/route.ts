import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { encrypt, decrypt } from '@/lib/encryption'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('hub_2fa_codes')
    .select('*')
    .eq('client_id', params.id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Decrypt secrets before sending
  const codes = (data || []).map(item => ({
    ...item,
    secret: decrypt(item.secret_encrypted),
    secret_encrypted: undefined,
  }))

  return NextResponse.json(codes)
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { platform_name, secret, notes } = body

  if (!platform_name?.trim()) return NextResponse.json({ error: 'Nome da plataforma é obrigatório' }, { status: 400 })
  if (!secret?.trim()) return NextResponse.json({ error: 'Código secreto é obrigatório' }, { status: 400 })

  // Clean up secret (remove spaces, uppercase)
  const cleanSecret = secret.replace(/\s/g, '').toUpperCase()

  const { data, error } = await supabase
    .from('hub_2fa_codes')
    .insert({
      client_id: params.id,
      platform_name: platform_name.trim(),
      secret_encrypted: encrypt(cleanSecret),
      notes: notes?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ...data, secret: cleanSecret, secret_encrypted: undefined }, { status: 201 })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await request.json()

  const { error } = await supabase
    .from('hub_2fa_codes')
    .delete()
    .eq('id', id)
    .eq('client_id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
