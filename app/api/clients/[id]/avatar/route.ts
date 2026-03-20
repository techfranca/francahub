import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
  }

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: 'Tipo de arquivo não permitido. Use JPG, PNG, WebP ou SVG.' }, { status: 400 })
  }

  // Max 5MB
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'Arquivo muito grande. Máximo 5MB.' }, { status: 400 })
  }

  const clientId = params.id
  const ext = file.name.split('.').pop() || 'jpg'
  const filePath = `${clientId}/avatar.${ext}`

  // Delete existing avatar files for this client
  const { data: existingFiles } = await supabase.storage
    .from('client-avatars')
    .list(clientId)

  if (existingFiles && existingFiles.length > 0) {
    await supabase.storage
      .from('client-avatars')
      .remove(existingFiles.map(f => `${clientId}/${f.name}`))
  }

  // Upload new file
  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadError } = await supabase.storage
    .from('client-avatars')
    .upload(filePath, arrayBuffer, {
      contentType: file.type,
      upsert: true,
    })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('client-avatars')
    .getPublicUrl(filePath)

  // Add cache-buster to URL
  const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`

  // Update client record
  const { error: updateError } = await supabase
    .from('hub_clients')
    .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
    .eq('id', clientId)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ avatar_url: avatarUrl })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const clientId = params.id

  // Delete all avatar files for this client
  const { data: existingFiles } = await supabase.storage
    .from('client-avatars')
    .list(clientId)

  if (existingFiles && existingFiles.length > 0) {
    await supabase.storage
      .from('client-avatars')
      .remove(existingFiles.map(f => `${clientId}/${f.name}`))
  }

  // Clear avatar_url in database
  const { error } = await supabase
    .from('hub_clients')
    .update({ avatar_url: null, updated_at: new Date().toISOString() })
    .eq('id', clientId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
