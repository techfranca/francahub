import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('hub_creatives')
    .select('*')
    .eq('client_id', params.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { titulo, tipo, plataforma, conteudo, status, link_criativo } = body

  if (!titulo?.trim()) return NextResponse.json({ error: 'Título é obrigatório' }, { status: 400 })

  const { data, error } = await supabase
    .from('hub_creatives')
    .insert({
      client_id: params.id,
      titulo: titulo.trim(),
      tipo: tipo || 'Roteiro',
      plataforma: plataforma || null,
      conteudo: conteudo || null,
      status: status || 'Rascunho',
      link_criativo: link_criativo || null,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
