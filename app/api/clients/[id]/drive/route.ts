import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createClientFolderStructure } from '@/lib/integrations/google-drive'

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get client data
  const { data: client, error: fetchError } = await supabase
    .from('hub_clients')
    .select('*')
    .eq('id', params.id)
    .single()

  if (fetchError || !client) {
    return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
  }

  if (client.pasta_drive) {
    return NextResponse.json({ error: 'Cliente já possui pasta no Drive', pasta_drive: client.pasta_drive }, { status: 400 })
  }

  if (!client.nome_empresa) {
    return NextResponse.json({ error: 'Cliente precisa ter nome da empresa preenchido para criar pasta no Drive' }, { status: 400 })
  }

  if (!client.segmento) {
    return NextResponse.json({ error: 'Cliente precisa ter segmento preenchido para criar pasta no Drive' }, { status: 400 })
  }

  try {
    const result = await createClientFolderStructure({
      nomeCliente: client.nome_empresa,
      segmento: client.segmento,
      servicosContratados: client.servicos_contratados,
    })

    if (result.success && result.folderLink) {
      await supabase
        .from('hub_clients')
        .update({ pasta_drive: result.folderLink, updated_at: new Date().toISOString() })
        .eq('id', params.id)

      // Timeline event
      await supabase.from('hub_timeline_events').insert({
        client_id: params.id,
        user_id: user.id,
        event_type: 'drive_folder_created',
        title: 'Pasta do Drive criada',
        description: `Estrutura de pastas criada no Google Drive`,
      })

      return NextResponse.json({
        success: true,
        pasta_drive: result.folderLink,
        alreadyExisted: result.alreadyExisted,
      })
    }

    return NextResponse.json({ error: result.message || 'Erro ao criar pasta' }, { status: 500 })
  } catch (e) {
    console.error('Error creating Drive folders:', e)
    return NextResponse.json({ error: 'Erro interno ao criar pasta no Drive' }, { status: 500 })
  }
}
