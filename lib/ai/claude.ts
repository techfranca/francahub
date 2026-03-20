/**
 * Claude API integration for AI-powered features.
 *
 * Requires ANTHROPIC_API_KEY in .env.local
 */

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

interface ClaudeMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ClaudeResponse {
  content: Array<{ type: 'text'; text: string }>
}

export async function callClaude({
  system,
  messages,
  maxTokens = 4096,
}: {
  system?: string
  messages: ClaudeMessage[]
  maxTokens?: number
}): Promise<string> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY nao configurada')
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      system,
      messages,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Claude API error: ${res.status} - ${err}`)
  }

  const data: ClaudeResponse = await res.json()
  return data.content[0]?.text || ''
}

/**
 * Process a meeting transcription: extract key points, action items, and summary.
 */
export async function processTranscription(fullText: string, meetingTitle: string): Promise<{
  key_points: string[]
  action_items: string[]
  summary: string
}> {
  const response = await callClaude({
    system: `Voce e um assistente especializado em analisar transcricoes de reunioes de uma agencia de marketing digital (Franca Assessoria).
Sua funcao e extrair informacoes uteis de forma concisa e acionavel.
Responda SOMENTE em JSON valido, sem markdown, sem code blocks.`,
    messages: [
      {
        role: 'user',
        content: `Analise a transcricao da reuniao "${meetingTitle}" e retorne um JSON com:
- "summary": resumo executivo da reuniao (2-4 frases)
- "key_points": array de strings com os pontos principais discutidos (maximo 8)
- "action_items": array de strings com itens de acao identificados (maximo 10)

Transcricao:
${fullText.slice(0, 50000)}`,
      },
    ],
    maxTokens: 2048,
  })

  try {
    // Try to parse the JSON response, handling potential markdown wrapping
    let jsonStr = response.trim()
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    }
    const parsed = JSON.parse(jsonStr)
    return {
      key_points: parsed.key_points || [],
      action_items: parsed.action_items || [],
      summary: parsed.summary || '',
    }
  } catch {
    // Fallback if JSON parsing fails
    return {
      key_points: [],
      action_items: [],
      summary: response.slice(0, 500),
    }
  }
}
