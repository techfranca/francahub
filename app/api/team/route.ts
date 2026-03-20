import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/team
 * List all users in the Supabase Auth system
 */
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: { users }, error } = await admin.auth.admin.listUsers()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Return safe user data (no sensitive fields)
  const members = users.map(u => ({
    id: u.id,
    email: u.email,
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at,
    name: u.user_metadata?.name || u.user_metadata?.full_name || null,
    avatar_url: u.user_metadata?.avatar_url || null,
  }))

  return NextResponse.json(members)
}

/**
 * POST /api/team
 * Invite a new team member (creates user with temporary password)
 */
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { email, name, password } = body

  if (!email || !password) {
    return NextResponse.json({ error: 'Email e senha sao obrigatorios' }, { status: 400 })
  }

  if (password.length < 6) {
    return NextResponse.json({ error: 'Senha deve ter no minimo 6 caracteres' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: name || null },
  })

  if (error) {
    if (error.message.includes('already been registered')) {
      return NextResponse.json({ error: 'Este email ja esta cadastrado' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Log to audit
  await supabase.from('hub_audit_log').insert({
    user_id: user.id,
    action: 'create',
    entity_type: 'team_member' as string,
    entity_id: data.user.id,
    changes: { email, name },
  })

  return NextResponse.json({
    id: data.user.id,
    email: data.user.email,
    name: name || null,
    created_at: data.user.created_at,
    last_sign_in_at: null,
  }, { status: 201 })
}
