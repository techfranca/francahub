import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createClientFolderStructure, testDriveConnection } from '@/lib/integrations/google-drive'

export async function GET() {
  const result = await testDriveConnection()
  return NextResponse.json(result)
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { clientId } = await request.json()

  const { data: client, error } = await supabase
    .from('hub_clients')
    .select('nome_empresa, segmento, servicos_contratados')
    .eq('id', clientId)
    .single()

  if (error || !client) {
    return NextResponse.json({ error: 'Cliente nao encontrado' }, { status: 404 })
  }

  if (!client.nome_empresa || !client.segmento) {
    return NextResponse.json({ error: 'Cliente precisa ter empresa e segmento' }, { status: 400 })
  }

  const result = await createClientFolderStructure({
    nomeCliente: client.nome_empresa,
    segmento: client.segmento,
    servicosContratados: client.servicos_contratados,
  })

  if (result.success && result.folderLink) {
    await supabase
      .from('hub_clients')
      .update({ pasta_drive: result.folderLink })
      .eq('id', clientId)
  }

  return NextResponse.json(result)
}
