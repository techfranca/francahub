import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get all profiles
  const { data: profiles } = await supabase
    .from('hub_profiles')
    .select('*')
    .order('nome', { ascending: true })

  // Get all auth users for email info
  const admin = createAdminClient()
  const { data: { users } } = await admin.auth.admin.listUsers()

  // Merge profiles with user email
  const members = users.map(user => {
    const profile = profiles?.find(p => p.user_id === user.id)
    return {
      id: user.id,
      email: user.email,
      nome: profile?.nome || user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || '',
      cargo: profile?.cargo || null,
      bio: profile?.bio || null,
      avatar_url: profile?.avatar_url || user.user_metadata?.avatar_url || null,
      telefone: profile?.telefone || null,
      instagram: profile?.instagram || null,
      linkedin: profile?.linkedin || null,
      created_at: user.created_at,
    }
  })

  return NextResponse.json(members)
}
