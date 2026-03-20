import { Instagram, Facebook, Mail, Globe, type LucideIcon } from 'lucide-react'

// Cores por segmento
export const segmentColors: Record<string, { bg: string; text: string; light: string; dot: string }> = {
  'E-commerce': { bg: 'bg-emerald-500', text: 'text-emerald-700', light: 'bg-emerald-100', dot: 'bg-emerald-500' },
  'Negócio Local': { bg: 'bg-blue-500', text: 'text-blue-700', light: 'bg-blue-100', dot: 'bg-blue-500' },
  'Infoproduto': { bg: 'bg-purple-500', text: 'text-purple-700', light: 'bg-purple-100', dot: 'bg-purple-500' },
  'Inside Sales': { bg: 'bg-orange-500', text: 'text-orange-700', light: 'bg-orange-100', dot: 'bg-orange-500' },
  'Lançamento': { bg: 'bg-pink-500', text: 'text-pink-700', light: 'bg-pink-100', dot: 'bg-pink-500' },
  'Food service': { bg: 'bg-amber-500', text: 'text-amber-700', light: 'bg-amber-100', dot: 'bg-amber-500' },
  'Serviços online': { bg: 'bg-cyan-500', text: 'text-cyan-700', light: 'bg-cyan-100', dot: 'bg-cyan-500' },
}

// Sugestões de plataformas por segmento (para o cofre de acessos)
export const platformSuggestions: Record<string, string[]> = {
  'E-commerce': ['Shopify', 'Nuvemshop', 'WooCommerce', 'VTEX', 'Tray', 'Loja Integrada', 'Mercado Livre', 'Amazon'],
  'Infoproduto': ['Hotmart', 'Eduzz', 'Monetizze', 'Kiwify', 'Braip', 'Perfect Pay', 'Lastlink'],
  'Negócio Local': ['RD Station', 'Pipedrive', 'HubSpot', 'Kommo', 'Bitrix24', 'Pipefy'],
  'Inside Sales': ['RD Station', 'Pipedrive', 'HubSpot', 'Salesforce', 'Kommo', 'Bitrix24'],
  'Lançamento': ['Hotmart', 'Eduzz', 'ActiveCampaign', 'RD Station', 'Leadlovers'],
  'Food service': ['iFood', 'Rappi', 'Goomer', 'Neemo', 'Anota Aí'],
  'Serviços online': ['Calendly', 'Notion', 'Trello', 'Asana', 'Monday'],
}

// Plataformas padrão (sempre disponíveis)
export const defaultPlatforms = ['Instagram', 'Facebook', 'E-mail', 'Google', 'WhatsApp Business']

export const SEGMENTOS = [
  'E-commerce',
  'Negócio Local',
  'Infoproduto',
  'Inside Sales',
  'Lançamento',
  'Food service',
  'Serviços online',
]

export const CANAIS_VENDA = [
  'Indicação',
  'Prospecção ativa',
  'Tráfego pago',
  'Redes sociais',
  'Site/Landing page',
  'Networking',
  'Parceria',
  'Outro',
]

export const SERVICOS_DISPONIVEIS = [
  'Tráfego Pago',
  'Produção de Conteúdo',
  'IA',
  'Consultoria',
  'Gestão de Redes',
  'Landing Pages',
  'Email Marketing',
]

export const MODELOS_PAGAMENTO = ['Fixo', 'Percentual', 'Misto']

export const emptyClient = {
  status: 'Ativo' as const,
  nome_empresa: '',
  modelo_pagamento: 'Fixo',
  tag: '',
  nome_cliente: '',
  segmento: '',
  nicho: '',
  faturamento_medio: '',
  genero: '',
  aniversario: '',
  servicos_contratados: '',
  telefone: '',
  cnpj_cpf: '',
  email: '',
  endereco: '',
  numero_endereco: '',
  cep: '',
  cidade: '',
  estado: '',
  valor_servico: '',
  dia_pagamento: '',
  canal_venda: '',
  data_inicio: '',
  data_encerramento: '',
}

export function getPlatformStyle(platformName: string): { icon: LucideIcon; bgColor: string } {
  const name = platformName?.toLowerCase() || ''

  if (name.includes('instagram')) {
    return { icon: Instagram, bgColor: 'bg-gradient-to-br from-pink-500 via-purple-500 to-orange-400' }
  }
  if (name.includes('facebook') || name.includes('meta')) {
    return { icon: Facebook, bgColor: 'bg-gradient-to-br from-blue-600 to-blue-700' }
  }
  if (name.includes('email') || name.includes('e-mail') || name.includes('gmail') || name.includes('outlook')) {
    return { icon: Mail, bgColor: 'bg-gradient-to-br from-red-500 to-red-600' }
  }

  return { icon: Globe, bgColor: 'bg-gradient-to-br from-violet-500 to-purple-600' }
}

export function getSegmentColor(segmento: string) {
  return segmentColors[segmento] || { bg: 'bg-slate-500', text: 'text-slate-700', light: 'bg-slate-100', dot: 'bg-slate-400' }
}
