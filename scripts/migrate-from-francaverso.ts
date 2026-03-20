/**
 * Script de migração: Francaverso → Franca Hub
 *
 * Lê clientes e credenciais do Supabase do francaverso
 * e escreve nas tabelas hub_* do Supabase do hub.
 *
 * Uso:
 *   npx tsx scripts/migrate-from-francaverso.ts
 *
 * Requer as variáveis no .env.local:
 *   FRANCAVERSO_SUPABASE_URL
 *   FRANCAVERSO_SUPABASE_SERVICE_KEY
 *   NEXT_PUBLIC_SUPABASE_URL       (hub)
 *   SUPABASE_SERVICE_ROLE_KEY      (hub)
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

// ── Validate env ───────────────────────────────────────────
const REQUIRED_VARS = [
  'FRANCAVERSO_SUPABASE_URL',
  'FRANCAVERSO_SUPABASE_SERVICE_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
]

for (const v of REQUIRED_VARS) {
  if (!process.env[v]) {
    console.error(`❌ Variável de ambiente ${v} não definida no .env.local`)
    process.exit(1)
  }
}

// ── Connect to both databases ──────────────────────────────
const source = createClient(
  process.env.FRANCAVERSO_SUPABASE_URL!,
  process.env.FRANCAVERSO_SUPABASE_SERVICE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const target = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// ── Types ──────────────────────────────────────────────────
interface FrancaversoClient {
  id: string
  nome_empresa: string | null
  nome_cliente: string | null
  segmento: string | null
  nicho: string | null
  status: string | null
  endereco: string | null
  numero_endereco: string | null
  cep: string | null
  cidade: string | null
  estado: string | null
  valor_servico: number | null
  dia_pagamento: number | null
  faturamento_medio: number | null
  modelo_pagamento: string | null
  cnpj_cpf: string | null
  email: string | null
  genero: string | null
  aniversario: string | null
  numero: string | null // telefone no francaverso
  servicos_contratados: string | null
  canal_venda: string | null
  tag: string | null
  data_inicio: string | null
  data_encerramento: string | null
  pasta_drive: string | null
  created_at: string | null
}

interface FrancaversoCredential {
  id: string
  client_id: string
  credential_type: string | null
  platform_name: string | null
  login: string | null
  password: string | null
  notes: string | null
}

// ── Main ───────────────────────────────────────────────────
async function migrate() {
  console.log('🚀 Iniciando migração Francaverso → Franca Hub\n')

  // ── Step 1: Read all clients from francaverso ────────────
  console.log('📖 Lendo clientes do francaverso...')
  const { data: sourceClients, error: srcErr } = await source
    .from('clients')
    .select('*')
    .order('created_at', { ascending: true })

  if (srcErr) {
    console.error('❌ Erro ao ler clientes do francaverso:', srcErr.message)
    process.exit(1)
  }

  if (!sourceClients?.length) {
    console.log('⚠️  Nenhum cliente encontrado no francaverso. Nada para migrar.')
    return
  }

  console.log(`   ✅ ${sourceClients.length} clientes encontrados\n`)

  // ── Step 2: Read all credentials from francaverso ────────
  console.log('📖 Lendo credenciais do francaverso...')
  const { data: sourceCredentials, error: credErr } = await source
    .from('client_credentials')
    .select('*')

  if (credErr) {
    console.error('❌ Erro ao ler credenciais:', credErr.message)
    process.exit(1)
  }

  console.log(`   ✅ ${sourceCredentials?.length ?? 0} credenciais encontradas\n`)

  // ── Step 3: Check existing in hub (idempotent) ───────────
  console.log('🔍 Verificando clientes já migrados no hub...')
  const { data: existingClients } = await target
    .from('hub_clients')
    .select('nome_cliente, nome_empresa')

  const existingSet = new Set(
    (existingClients || []).map(c =>
      `${c.nome_cliente || ''}::${c.nome_empresa || ''}`
    )
  )

  console.log(`   ✅ ${existingSet.size} clientes já existem no hub\n`)

  // ── Step 4: Insert clients ───────────────────────────────
  // Map: francaverso client id → hub client id
  const idMap = new Map<string, string>()

  let inserted = 0
  let skipped = 0
  let errors = 0

  console.log('📝 Migrando clientes...')
  for (const client of sourceClients as FrancaversoClient[]) {
    const key = `${client.nome_cliente || ''}::${client.nome_empresa || ''}`

    if (existingSet.has(key)) {
      // Already migrated — get the hub id
      const { data: existing } = await target
        .from('hub_clients')
        .select('id')
        .eq('nome_cliente', client.nome_cliente || '')
        .eq('nome_empresa', client.nome_empresa || '')
        .limit(1)
        .single()

      if (existing) {
        idMap.set(client.id, existing.id)
      }
      skipped++
      continue
    }

    const { data: newClient, error: insertErr } = await target
      .from('hub_clients')
      .insert({
        nome_empresa: client.nome_empresa,
        nome_cliente: client.nome_cliente || 'Sem nome',
        segmento: client.segmento,
        nicho: client.nicho,
        status: client.status || 'Ativo',
        endereco: client.endereco,
        numero_endereco: client.numero_endereco,
        cep: client.cep,
        cidade: client.cidade,
        estado: client.estado,
        valor_servico: client.valor_servico,
        dia_pagamento: client.dia_pagamento,
        faturamento_medio: client.faturamento_medio,
        modelo_pagamento: client.modelo_pagamento,
        cnpj_cpf: client.cnpj_cpf,
        email: client.email,
        genero: client.genero,
        aniversario: client.aniversario,
        telefone: client.numero, // campo "numero" no francaverso = telefone
        servicos_contratados: client.servicos_contratados,
        canal_venda: client.canal_venda,
        tag: client.tag,
        data_inicio: client.data_inicio,
        data_encerramento: client.data_encerramento,
        pasta_drive: client.pasta_drive,
        created_at: client.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (insertErr) {
      console.error(`   ❌ Erro ao inserir "${client.nome_cliente}": ${insertErr.message}`)
      errors++
      continue
    }

    idMap.set(client.id, newClient!.id)
    inserted++
  }

  console.log(`   ✅ Clientes: ${inserted} inseridos, ${skipped} já existiam, ${errors} erros\n`)

  // ── Step 5: Insert credentials ───────────────────────────
  if (sourceCredentials?.length) {
    console.log('📝 Migrando credenciais...')

    let credInserted = 0
    let credSkipped = 0
    let credErrors = 0

    for (const cred of sourceCredentials as FrancaversoCredential[]) {
      const hubClientId = idMap.get(cred.client_id)
      if (!hubClientId) {
        credSkipped++
        continue
      }

      if (!cred.platform_name) {
        credSkipped++
        continue
      }

      // Check if already exists
      const { data: existing } = await target
        .from('hub_credentials')
        .select('id')
        .eq('client_id', hubClientId)
        .eq('platform_name', cred.platform_name)
        .limit(1)

      if (existing?.length) {
        credSkipped++
        continue
      }

      const { error: credInsertErr } = await target
        .from('hub_credentials')
        .insert({
          client_id: hubClientId,
          credential_type: cred.credential_type || 'standard',
          platform_name: cred.platform_name,
          login: cred.login,
          password: cred.password,
          notes: cred.notes,
        })

      if (credInsertErr) {
        console.error(`   ❌ Erro credencial "${cred.platform_name}": ${credInsertErr.message}`)
        credErrors++
        continue
      }

      credInserted++
    }

    console.log(`   ✅ Credenciais: ${credInserted} inseridas, ${credSkipped} já existiam/ignoradas, ${credErrors} erros\n`)
  }

  // ── Step 6: Verify ──────────────────────────────────────
  console.log('🔎 Verificando resultado...')

  const { count: hubClients } = await target
    .from('hub_clients')
    .select('*', { count: 'exact', head: true })

  const { count: hubCredentials } = await target
    .from('hub_credentials')
    .select('*', { count: 'exact', head: true })

  console.log(`\n📊 Resultado final:`)
  console.log(`   Francaverso: ${sourceClients.length} clientes, ${sourceCredentials?.length ?? 0} credenciais`)
  console.log(`   Hub:         ${hubClients} clientes, ${hubCredentials} credenciais`)
  console.log(`\n✅ Migração concluída!`)

  if (hubClients === sourceClients.length) {
    console.log('🎉 100% dos clientes migrados com sucesso!')
  } else {
    console.log(`⚠️  Diferença de ${sourceClients.length - (hubClients ?? 0)} clientes — verifique os erros acima`)
  }
}

migrate().catch(err => {
  console.error('❌ Erro fatal:', err)
  process.exit(1)
})
