import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createClientFolderStructure } from '@/lib/integrations/google-drive'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('hub_clients')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })

  return NextResponse.json(data)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  // Only allow known fields
  const allowedFields = [
    'nome_cliente', 'nome_empresa', 'email', 'telefone', 'cnpj_cpf',
    'segmento', 'nicho', 'status', 'tag', 'canal_venda',
    'endereco', 'numero_endereco', 'cep', 'cidade', 'estado',
    'servicos_contratados', 'valor_servico', 'dia_pagamento',
    'modelo_pagamento', 'faturamento_medio', 'data_inicio', 'data_encerramento',
    'pasta_drive', 'avatar_url', 'website_url',
    'website_cms', 'website_hosting', 'website_hosting_expiry',
    'website_domain_registrar', 'website_domain_expiry', 'website_ssl', 'website_notes',
  ]
  const cleanData: Record<string, unknown> = {}
  for (const key of allowedFields) {
    if (body[key] !== undefined) {
      cleanData[key] = body[key] === '' ? null : body[key]
    }
  }
  cleanData.updated_at = new Date().toISOString()

  // Check if we need to create Drive folders (client didn't have folder before)
  const { data: existing } = await supabase
    .from('hub_clients')
    .select('pasta_drive, nome_empresa, segmento')
    .eq('id', params.id)
    .single()

  const { data: client, error } = await supabase
    .from('hub_clients')
    .update(cleanData)
    .eq('id', params.id)
    .select()
    .single()

  if (error) {
    console.error('Error updating client:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Create Drive folders if not already created and now has empresa + segmento
  if (!existing?.pasta_drive && client.nome_empresa && client.segmento) {
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
      }
    } catch (e) {
      console.error('Error creating Drive folders:', e)
    }
  }

  // Timeline event
  await supabase.from('hub_timeline_events').insert({
    client_id: params.id,
    user_id: user.id,
    event_type: 'profile_updated',
    title: 'Perfil atualizado',
    description: `Dados do cliente foram atualizados`,
  })

  return NextResponse.json(client)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('hub_clients')
    .delete()
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
