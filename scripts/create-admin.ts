import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function createAdmin() {
  const email = 'davidsonrj1@gmail.com'
  const password = '11021976sS'

  console.log(`🔐 Configurando admin: ${email}`)

  // Try to create, if exists just fetch
  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: 'super_admin' },
  })

  let userId: string

  if (createErr) {
    console.log(`   Usuário já existe, atualizando...`)

    // List users to find this one
    const { data: { users } } = await supabase.auth.admin.listUsers()
    const existing = users.find(u => u.email === email)

    if (!existing) {
      console.error('❌ Não encontrei o usuário existente')
      process.exit(1)
    }

    userId = existing.id

    // Update password and role
    const { error: updateErr } = await supabase.auth.admin.updateUserById(userId, {
      password,
      app_metadata: { role: 'super_admin' },
    })

    if (updateErr) {
      console.error('❌ Erro ao atualizar:', updateErr.message)
      process.exit(1)
    }

    console.log(`✅ Usuário atualizado: ${userId}`)
  } else {
    userId = created.user.id
    console.log(`✅ Usuário criado: ${userId}`)
  }

  // Upsert hub_user_roles
  const { error: roleErr } = await supabase
    .from('hub_user_roles')
    .upsert({
      user_id: userId,
      hub_role: 'super_admin',
    }, { onConflict: 'user_id,organization_id' })

  if (roleErr) {
    console.log('⚠️  Role:', roleErr.message, '(pode ignorar)')
  } else {
    console.log('✅ Role super_admin atribuída')
  }

  console.log('\n🎉 Pronto! Faça login com:')
  console.log(`   Email: ${email}`)
  console.log(`   Senha: ${password}`)
}

createAdmin().catch(err => {
  console.error('❌ Erro fatal:', err)
  process.exit(1)
})
