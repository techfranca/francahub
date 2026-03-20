import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClientFolderStructure } from '@/lib/integrations/google-drive'

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET

export async function POST(request: NextRequest) {
  // Validate API key
  const authHeader = request.headers.get('authorization')
  const apiKey = authHeader?.replace('Bearer ', '') || request.nextUrl.searchParams.get('key')

  if (!WEBHOOK_SECRET || apiKey !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Clean and validate fields
  const allowedFields = [
    'nome_cliente', 'nome_empresa', 'email', 'telefone', 'cnpj_cpf',
    'segmento', 'nicho', 'status', 'tag', 'canal_venda',
    'endereco', 'numero_endereco', 'cep', 'cidade', 'estado',
    'servicos_contratados', 'valor_servico', 'dia_pagamento',
    'modelo_pagamento', 'faturamento_medio', 'data_inicio', 'data_encerramento',
    'pasta_drive', 'avatar_url', 'genero', 'aniversario',
  ]
  const numericFields = ['valor_servico', 'dia_pagamento', 'faturamento_medio']

  const cleanData: Record<string, unknown> = {}
  for (const key of allowedFields) {
    if (body[key] !== undefined && body[key] !== '') {
      if (numericFields.includes(key)) {
        const num = Number(body[key])
        cleanData[key] = isNaN(num) ? null : num
      } else {
        cleanData[key] = body[key]
      }
    }
  }

  // Defaults
  if (!cleanData.status) cleanData.status = 'Ativo'
  cleanData.updated_at = new Date().toISOString()

  // Require at least nome_cliente
  if (!cleanData.nome_cliente) {
    return NextResponse.json({ error: 'Campo nome_cliente é obrigatório' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Create client
  const { data: client, error } = await supabase
    .from('hub_clients')
    .insert(cleanData)
    .select()
    .single()

  if (error) {
    console.error('[webhook/new-client] Error creating client:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Create Google Drive folder structure if empresa + segmento
  let driveResult = null
  if (client.nome_empresa && client.segmento) {
    try {
      const result = await createClientFolderStructure({
        nomeCliente: client.nome_empresa,
        segmento: client.segmento,
        servicosContratados: client.servicos_contratados,
      })

      if (result.success && result.folderLink) {
        await supabase
          .from('hub_clients')
          .update({ pasta_drive: result.folderLink })
          .eq('id', client.id)

        client.pasta_drive = result.folderLink
        driveResult = { success: true, folderLink: result.folderLink }
      }
    } catch (e) {
      console.error('[webhook/new-client] Error creating Drive folders:', e)
      driveResult = { success: false, error: String(e) }
    }
  }

  // Timeline event (no user_id since it's from webhook)
  await supabase.from('hub_timeline_events').insert({
    client_id: client.id,
    event_type: 'profile_updated',
    title: 'Cliente criado via formulário',
    description: `${client.nome_cliente} foi adicionado automaticamente via webhook`,
  })

  return NextResponse.json({
    success: true,
    client: {
      id: client.id,
      nome_cliente: client.nome_cliente,
      nome_empresa: client.nome_empresa,
      status: client.status,
      pasta_drive: client.pasta_drive,
    },
    drive: driveResult,
  }, { status: 201 })
}
