import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import mammoth from 'mammoth'

function parseDocxFilename(filename: string): {
  titulo: string
  adNumber: string | null
  productTag: string | null
  mediaType: string | null
  plataforma: string
} {
  // Remove .docx extension
  const name = filename.replace(/\.docx$/i, '').trim()

  // Extract media type [VD], [FT], [CR]
  const mediaMatch = name.match(/\[(VD|FT|CR)\]/i)
  const mediaType = mediaMatch ? mediaMatch[1].toUpperCase() : null

  // Extract AD number and product tag: "AD 01DH" or "AD 17"
  const adMatch = name.match(/AD\s*(\d+)([A-Z]*)/i)
  const adNumber = adMatch ? adMatch[1] : null
  const productTag = adMatch && adMatch[2] ? adMatch[2].toUpperCase() : null

  // Map media type to plataforma
  const plataformaMap: Record<string, string> = {
    VD: 'Reels',
    FT: 'Feed',
    CR: 'Carrossel',
  }
  const plataforma = mediaType ? (plataformaMap[mediaType] || 'Anúncio') : 'Anúncio'

  // Build titulo from filename
  let titulo = name
  // Clean up the titulo to be readable
  titulo = titulo
    .replace(/^\d{2}\.\d{2}\.\d{2}\s*-\s*/, '') // remove date prefix "11.03.26 - "
    .replace(/\[(VD|FT|CR)\]\s*/gi, '')           // remove [VD], [FT], [CR]
    .replace(/\s+/g, ' ')
    .trim()

  // If no product tag in name, keep full titulo; if has tag, show "AD 01DH - Name"
  if (adNumber) {
    const tagPart = productTag ? `${adNumber}${productTag}` : adNumber
    // Extract the product/campaign name after "AD XX - " or "AD XXDH - "
    const afterAd = name.replace(/^.*?AD\s*\d+[A-Z]*\s*-\s*/i, '').replace(/\[(VD|FT|CR)\]\s*/gi, '').trim()
    titulo = afterAd ? `AD ${tagPart} - ${afterAd}` : `AD ${tagPart}`
  }

  return { titulo, adNumber, productTag, mediaType, plataforma }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const clientId = params.id

  try {
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]

    if (!files.length) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
    }

    const results = []

    for (const file of files) {
      if (!file.name.toLowerCase().endsWith('.docx')) {
        results.push({ filename: file.name, error: 'Formato inválido (use .docx)' })
        continue
      }

      try {
        // Convert File to Buffer
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // Extract text with mammoth
        const { value: text } = await mammoth.extractRawText({ buffer })

        // Parse filename
        const { titulo, adNumber, productTag, mediaType, plataforma } = parseDocxFilename(file.name)

        // Save creative
        const { data: creative, error: insertError } = await supabase
          .from('hub_creatives')
          .insert({
            client_id: clientId,
            titulo,
            tipo: 'Roteiro',
            plataforma,
            conteudo: text.trim(),
            status: 'Rascunho',
            metadata: {
              ad_number: adNumber,
              product_tag: productTag,
              media_type: mediaType,
              original_filename: file.name,
            },
          })
          .select('id, titulo')
          .single()

        if (insertError) {
          results.push({ filename: file.name, error: insertError.message })
        } else {
          results.push({ filename: file.name, id: creative.id, titulo: creative.titulo })
        }
      } catch (err) {
        results.push({
          filename: file.name,
          error: err instanceof Error ? err.message : 'Erro ao processar arquivo',
        })
      }
    }

    const successCount = results.filter(r => !r.error).length
    return NextResponse.json({ results, success: successCount })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
