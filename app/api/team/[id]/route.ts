import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

/**
 * PATCH /api/team/[id]
 * Update team member name
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const admin = createAdminClient()

  const updateData: Record<string, unknown> = {}
  if (body.name !== undefined) {
    updateData.user_metadata = { name: body.name }
  }
  if (body.password) {
    if (body.password.length < 6) {
      return NextResponse.json({ error: 'Senha deve ter no minimo 6 caracteres' }, { status: 400 })
    }
    updateData.password = body.password
  }

  const { error } = await admin.auth.admin.updateUserById(params.id, updateData)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('hub_audit_log').insert({
    user_id: user.id,
    action: 'update',
    entity_type: 'team_member' as string,
    entity_id: params.id,
    changes: { fields: Object.keys(updateData) },
  })

  return NextResponse.json({ success: true })
}

/**
 * DELETE /api/team/[id]
 * Remove a team member
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Prevent self-deletion
  if (params.id === user.id) {
    return NextResponse.json({ error: 'Voce nao pode remover a si mesmo' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('hub_audit_log').insert({
    user_id: user.id,
    action: 'delete',
    entity_type: 'team_member' as string,
    entity_id: params.id,
    changes: {},
  })

  return NextResponse.json({ success: true })
}
