import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { instrucao, tipo, plataforma, titulo } = body

  if (!instrucao?.trim()) return NextResponse.json({ error: 'Instrução é obrigatória' }, { status: 400 })

  // Get client context
  const { data: client } = await supabase
    .from('hub_clients')
    .select('nome_empresa, nome_cliente, segmento, nicho, servicos_contratados, website_context, website_url')
    .eq('id', params.id)
    .single()

  const tipoLabel = tipo || 'Roteiro'
  const plataformaLabel = plataforma || 'Redes sociais'
  const nomeCliente = client?.nome_empresa || client?.nome_cliente || 'Cliente'

  const systemPrompt = `Você é um especialista em marketing digital e copywriting para agências brasileiras.
Sua função é criar ${tipoLabel.toLowerCase()}s de alta qualidade para as redes sociais dos clientes da agência Franca Assessoria.
Seja direto, criativo e escreva em português brasileiro natural. Não use emojis em excesso.
Adapte o tom ao segmento do cliente.`

  const userPrompt = `Crie um ${tipoLabel.toLowerCase()} para ${plataformaLabel} do cliente ${nomeCliente}.
${client?.segmento ? `Segmento: ${client.segmento}` : ''}
${client?.nicho ? `Nicho: ${client.nicho}` : ''}
${titulo ? `Título do criativo: ${titulo}` : ''}
${client?.website_context ? `\nContexto do site do cliente (use para capturar tom de voz, produtos e diferenciais reais):\n${client.website_context.slice(0, 2000)}` : ''}

Instrução/briefing:
${instrucao}

Responda APENAS com o conteúdo do ${tipoLabel.toLowerCase()}, sem explicações adicionais.`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{ role: 'user', content: userPrompt }],
      system: systemPrompt,
    })

    const content = message.content[0].type === 'text' ? message.content[0].text : ''
    return NextResponse.json({ content })
  } catch (error) {
    console.error('AI generation error:', error)
    return NextResponse.json({ error: 'Erro ao gerar conteúdo com IA' }, { status: 500 })
  }
}
