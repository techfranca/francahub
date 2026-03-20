/**
 * AI prompt templates for all analysis types.
 * All prompts are in Portuguese (pt-BR) since this is a Brazilian marketing agency tool.
 */

export const SYSTEM_BASE = `Voce e um assistente de IA da Franca Assessoria, uma agencia de marketing digital brasileira.
Seu papel e fornecer insights estrategicos, analises de performance e recomendacoes acionaveis.
Responda SEMPRE em portugues do Brasil. Responda SOMENTE em JSON valido, sem markdown, sem code blocks.`

export const CREATIVE_ANALYSIS_PROMPT = `${SYSTEM_BASE}
Voce e especialista em analise de criativos de anuncios digitais (Meta Ads).
Avalie com olhar critico de performance e conversao.`

export function buildCreativeAnalysisMessage(creative: {
  copy_text?: string | null
  headline?: string | null
  cta?: string | null
  creative_type?: string | null
  campaignObjective?: string | null
  clientSegment?: string | null
}) {
  return `Analise este criativo de anuncio e retorne um JSON com:
- "rating": nota de 1 a 5 (inteiro)
- "strengths": array de strings com pontos fortes (maximo 5)
- "weaknesses": array de strings com pontos fracos (maximo 5)
- "suggestions": string com sugestoes de melhoria (2-4 frases)
- "copy_score": nota de 1 a 10 para o texto
- "cta_score": nota de 1 a 10 para o call-to-action
- "overall_assessment": string com avaliacao geral (1-2 frases)

Dados do criativo:
- Tipo: ${creative.creative_type || 'Nao especificado'}
- Titulo: ${creative.headline || 'Sem titulo'}
- Texto/Copy: ${creative.copy_text || 'Sem texto'}
- CTA: ${creative.cta || 'Sem CTA'}
- Objetivo da campanha: ${creative.campaignObjective || 'Nao especificado'}
- Segmento do cliente: ${creative.clientSegment || 'Nao especificado'}`
}

export const PERFORMANCE_TREND_PROMPT = `${SYSTEM_BASE}
Voce e especialista em analise de performance de campanhas de trafego pago.
Identifique tendencias, anomalias e oportunidades de otimizacao.`

export function buildPerformanceTrendMessage(data: {
  clientName: string
  campaigns: Array<{
    name: string
    status: string
    metrics: { spend: number; impressions: number; clicks: number; ctr: number; cpc: number; conversions: number }
  }>
  periodDays: number
}) {
  return `Analise a performance das campanhas deste cliente e retorne um JSON com:
- "summary": resumo geral da performance (2-4 frases)
- "trends": array de objetos { "type": "positive"|"negative"|"neutral", "description": string } (maximo 6)
- "anomalies": array de strings com anomalias identificadas (maximo 3)
- "recommendations": array de strings com recomendacoes de otimizacao (maximo 5)
- "health_score": nota de 0 a 100 para saude geral das campanhas

Cliente: ${data.clientName}
Periodo: ultimos ${data.periodDays} dias
Campanhas:
${data.campaigns.map(c => `- ${c.name} (${c.status}): R$${c.metrics.spend.toFixed(2)} investido, ${c.metrics.impressions} impressoes, ${c.metrics.clicks} cliques, CTR ${c.metrics.ctr.toFixed(2)}%, CPC R$${c.metrics.cpc.toFixed(2)}, ${c.metrics.conversions} conversoes`).join('\n')}`
}

export const CROSS_CORRELATION_PROMPT = `${SYSTEM_BASE}
Voce e especialista em analise estrategica que correlaciona diferentes fontes de dados:
reunioes com o cliente, performance de anuncios e perfil do cliente.
Identifique conexoes, padroes e gere recomendacoes estrategicas integradas.`

export function buildCrossCorrelationMessage(data: {
  client: {
    nome: string
    segmento?: string | null
    nicho?: string | null
    servicos?: string | null
    behavioral_profile?: string | null
  }
  recentMeetings: Array<{ title: string; date: string; summary?: string | null; key_points?: string[] }>
  adPerformance: {
    totalSpend: number
    totalClicks: number
    totalImpressions: number
    avgCTR: number
    avgCPC: number
    activeCampaigns: number
  }
}) {
  const meetingsText = data.recentMeetings.length > 0
    ? data.recentMeetings.map(m => `- ${m.date} "${m.title}": ${m.summary || 'Sem resumo'}${m.key_points?.length ? '\n  Pontos: ' + m.key_points.join('; ') : ''}`).join('\n')
    : 'Nenhuma reuniao recente registrada'

  return `Faca uma analise cruzada dos dados deste cliente e retorne um JSON com:
- "strategic_summary": resumo estrategico integrado (3-5 frases)
- "correlations": array de objetos { "finding": string, "source": "meetings"|"ads"|"profile", "impact": "high"|"medium"|"low" } (maximo 5)
- "recommendations": array de objetos { "action": string, "priority": "urgente"|"alta"|"media"|"baixa", "area": "ads"|"estrategia"|"relacionamento"|"produto" } (maximo 6)
- "risks": array de strings com riscos identificados (maximo 3)
- "opportunities": array de strings com oportunidades (maximo 3)

CLIENTE:
- Nome: ${data.client.nome}
- Segmento: ${data.client.segmento || 'N/A'}
- Nicho: ${data.client.nicho || 'N/A'}
- Servicos: ${data.client.servicos || 'N/A'}
- Perfil comportamental: ${data.client.behavioral_profile || 'N/A'}

REUNIOES RECENTES:
${meetingsText}

PERFORMANCE DE ADS (ultimos 30 dias):
- Investimento total: R$${data.adPerformance.totalSpend.toFixed(2)}
- Campanhas ativas: ${data.adPerformance.activeCampaigns}
- Impressoes: ${data.adPerformance.totalImpressions}
- Cliques: ${data.adPerformance.totalClicks}
- CTR medio: ${data.adPerformance.avgCTR.toFixed(2)}%
- CPC medio: R$${data.adPerformance.avgCPC.toFixed(2)}`
}

export const CLIENT_SUMMARY_PROMPT = `${SYSTEM_BASE}
Gere um resumo executivo rapido do estado atual do cliente para o dashboard.`

export function buildClientSummaryMessage(data: {
  clientName: string
  status: string
  activeCampaigns: number
  totalSpend30d: number
  recentMeetings: number
  pendingActions: number
  insightCount: number
}) {
  return `Gere um resumo executivo curto deste cliente. Retorne JSON com:
- "headline": frase de 1 linha resumindo o status atual do cliente
- "status_emoji": um dos: "otimo"|"bom"|"atencao"|"critico"
- "next_steps": array de strings com proximos passos sugeridos (maximo 3)

Cliente: ${data.clientName} (${data.status})
- ${data.activeCampaigns} campanhas ativas, R$${data.totalSpend30d.toFixed(2)} investidos nos ultimos 30 dias
- ${data.recentMeetings} reunioes recentes
- ${data.pendingActions} acoes pendentes
- ${data.insightCount} insights gerados`
}

/**
 * Parse a JSON response from Claude, handling potential markdown wrapping.
 */
export function parseClaudeJSON<T>(response: string): T {
  let jsonStr = response.trim()
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  }
  return JSON.parse(jsonStr)
}
