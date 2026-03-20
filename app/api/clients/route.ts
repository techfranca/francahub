import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createClientFolderStructure } from '@/lib/integrations/google-drive'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const searchParams = request.nextUrl.searchParams
  const status = searchParams.get('status')
  const segmento = searchParams.get('segmento')
  const search = searchParams.get('search')

  let query = supabase
    .from('hub_clients')
    .select('*')
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)
  if (segmento) query = query.eq('segmento', segmento)
  if (search) {
    query = query.or(`nome_cliente.ilike.%${search}%,nome_empresa.ilike.%${search}%,tag.ilike.%${search}%`)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { credentials: rawCredentials, ...clientData } = body
  const credentials = Array.isArray(rawCredentials) ? rawCredentials : []

  // Remove any non-database fields that might come from the form
  const cleanData: Record<string, unknown> = {}
  const allowedFields = [
    'nome_cliente', 'nome_empresa', 'email', 'telefone', 'cnpj_cpf',
    'segmento', 'nicho', 'status', 'tag', 'canal_venda',
    'endereco', 'numero_endereco', 'cep', 'cidade', 'estado',
    'servicos_contratados', 'valor_servico', 'dia_pagamento',
    'modelo_pagamento', 'faturamento_medio', 'data_inicio', 'data_encerramento',
    'pasta_drive', 'avatar_url', 'genero', 'aniversario',
  ]
  const numericFields = ['valor_servico', 'dia_pagamento', 'faturamento_medio']
  for (const key of allowedFields) {
    if (clientData[key] !== undefined && clientData[key] !== '') {
      // Convert numeric fields properly
      if (numericFields.includes(key)) {
        const num = Number(clientData[key])
        cleanData[key] = isNaN(num) ? null : num
      } else {
        cleanData[key] = clientData[key]
      }
    }
  }
  cleanData.updated_at = new Date().toISOString()

  // Create client
  const { data: client, error } = await supabase
    .from('hub_clients')
    .insert(cleanData)
    .select()
    .single()

  if (error) {
    console.error('Error creating client:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Save credentials if provided
  if (credentials.length) {
    const credentialsToSave = credentials
      .filter((c: Record<string, string>) => c.platform_name)
      .map((c: Record<string, string>) => ({
        client_id: client.id,
        credential_type: c.credential_type || 'standard',
        platform_name: c.platform_name,
        login: c.login || null,
        password: c.password || null,
        notes: c.notes || null,
      }))

    if (credentialsToSave.length) {
      await supabase.from('hub_credentials').insert(credentialsToSave)
    }
  }

  // Create Google Drive folder structure if empresa + segmento
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
      }
    } catch (e) {
      console.error('Error creating Drive folders:', e)
    }
  }

  // Add timeline event
  await supabase.from('hub_timeline_events').insert({
    client_id: client.id,
    user_id: user.id,
    event_type: 'profile_updated',
    title: 'Cliente criado',
    description: `${client.nome_cliente} foi adicionado ao sistema`,
  })

  return NextResponse.json(client, { status: 201 })
}
