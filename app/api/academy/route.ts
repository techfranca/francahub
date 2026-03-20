import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('hub_academy_courses')
    .select('*')
    .eq('ativo', true)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { nome, categoria, descricao, url, login, senha, cor, icon } = body

  if (!nome?.trim()) return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })

  const { data, error } = await supabase
    .from('hub_academy_courses')
    .insert({
      nome: nome.trim(),
      categoria: categoria?.trim() || null,
      descricao: descricao?.trim() || null,
      url: url?.trim() || null,
      login: login?.trim() || null,
      senha: senha?.trim() || null,
      cor: cor || 'blue',
      icon: icon || 'BookOpen',
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
