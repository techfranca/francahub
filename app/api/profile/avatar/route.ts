import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })

  const ext = file.name.split('.').pop() || 'png'
  const filePath = `profiles/${user.id}.${ext}`

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, { upsert: true, contentType: file.type })

  if (uploadError) {
    console.error('Upload error:', uploadError)
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath)

  // Add cache buster
  const avatarUrl = `${publicUrl}?t=${Date.now()}`

  // Update profile
  await supabase
    .from('hub_profiles')
    .upsert({
      user_id: user.id,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

  return NextResponse.json({ avatar_url: avatarUrl })
}

export async function DELETE() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Remove from storage
  const { data: files } = await supabase.storage.from('avatars').list('profiles', {
    search: user.id,
  })

  if (files?.length) {
    await supabase.storage.from('avatars').remove(files.map(f => `profiles/${f.name}`))
  }

  // Update profile
  await supabase
    .from('hub_profiles')
    .upsert({
      user_id: user.id,
      avatar_url: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

  return NextResponse.json({ success: true })
}
