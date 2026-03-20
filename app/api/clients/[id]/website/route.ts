import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

async function scrapeWebsite(url: string): Promise<string> {
  const normalized = url.startsWith('http') ? url : `https://${url}`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12000)

  let res: Response
  try {
    res = await fetch(normalized, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FrancaHub/1.0; +https://francahub.com.br)' },
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeout)
  }

  if (!res.ok) throw new Error(`Site retornou status ${res.status}`)

  const html = await res.text()

  // Remove script, style, nav, footer, header tags with content
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')       // strip remaining tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s{2,}/g, ' ')        // collapse whitespace
    .trim()

  // Limit to ~4000 chars to keep AI context reasonable
  return cleaned.slice(0, 4000)
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get website URL from body or from existing client record
  let url: string | undefined
  try {
    const body = await request.json()
    url = body.url
  } catch {
    // no body
  }

  if (!url) {
    const { data: client } = await supabase
      .from('hub_clients')
      .select('website_url')
      .eq('id', params.id)
      .single()
    url = client?.website_url ?? undefined
  }

  if (!url?.trim()) {
    return NextResponse.json({ error: 'URL do site é obrigatória' }, { status: 400 })
  }

  try {
    const context = await scrapeWebsite(url.trim())

    const { error } = await supabase
      .from('hub_clients')
      .update({
        website_url: url.trim(),
        website_context: context,
        website_scraped_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)

    if (error) throw error

    return NextResponse.json({ success: true, chars: context.length })
  } catch (err) {
    console.error('Website scrape error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao acessar o site' },
      { status: 500 }
    )
  }
}
