export interface HubClient {
  id: string
  organization_id: string | null
  crm_contact_id: string | null
  nome_empresa: string | null
  nome_cliente: string
  segmento: string | null
  nicho: string | null
  status: 'Ativo' | 'Inativo'
  // Endereço
  endereco: string | null
  numero_endereco: string | null
  cep: string | null
  cidade: string | null
  estado: string | null
  // Financeiro
  valor_servico: number | null
  dia_pagamento: number | null
  faturamento_medio: number | null
  modelo_pagamento: string | null
  // Dados
  cnpj_cpf: string | null
  email: string | null
  genero: string | null
  aniversario: string | null
  telefone: string | null
  // Serviços
  servicos_contratados: string | null
  canal_venda: string | null
  tag: string | null
  // Datas
  data_inicio: string | null
  data_encerramento: string | null
  // Drive
  pasta_drive: string | null
  // Site
  website_url: string | null
  website_context: string | null
  website_scraped_at: string | null
  // Perfil comportamental
  behavioral_profile: string | null
  personality_notes: string | null
  active_projects: string[]
  avatar_url: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface HubCredential {
  id: string
  client_id: string
  credential_type: 'standard' | 'custom'
  platform_name: string
  login: string | null
  password: string | null
  notes: string | null
  created_at: string
}

export interface HubTag {
  id: string
  organization_id: string
  name: string
  color: string
  created_at: string
}

export interface HubClientTag {
  client_id: string
  tag_id: string
}

export interface HubNote {
  id: string
  client_id: string
  user_id: string
  content: string
  is_pinned: boolean
  created_at: string
  updated_at: string
}

export type TimelineEventType =
  | 'note_added'
  | 'meeting_recorded'
  | 'campaign_linked'
  | 'tag_changed'
  | 'profile_updated'
  | 'ai_insight_generated'
  | 'status_changed'
  | 'ad_reviewed'
  | 'credential_updated'
  | 'drive_folder_created'

export interface HubTimelineEvent {
  id: string
  client_id: string
  user_id: string | null
  event_type: TimelineEventType
  title: string
  description: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export type MeetingStatus = 'scheduled' | 'in_progress' | 'completed' | 'transcribing' | 'transcribed' | 'cancelled'

export interface HubMeeting {
  id: string
  client_id: string
  organization_id: string
  user_id: string
  title: string
  meeting_date: string
  duration_minutes: number | null
  google_meet_link: string | null
  google_event_id: string | null
  recording_url: string | null
  recording_storage: 'supabase' | 'google_drive' | null
  status: MeetingStatus
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface HubTranscription {
  id: string
  meeting_id: string
  full_text: string
  language: string
  word_count: number | null
  confidence_score: number | null
  provider: 'google_stt' | 'whisper'
  key_points: unknown[]
  action_items: unknown[]
  summary: string | null
  ai_processed_at: string | null
  created_at: string
}

export interface HubAdAccount {
  id: string
  organization_id: string
  meta_account_id: string
  account_name: string | null
  access_token_encrypted: string
  token_expires_at: string | null
  status: 'active' | 'inactive' | 'error'
  last_sync_at: string | null
  created_at: string
}

export interface HubCampaign {
  id: string
  ad_account_id: string
  client_id: string | null
  meta_campaign_id: string
  name: string
  objective: string | null
  status: string | null
  product_service: string | null
  is_product_active: boolean
  daily_budget: number | null
  lifetime_budget: number | null
  created_at: string
  updated_at: string
}

export interface HubCampaignMetric {
  id: string
  campaign_id: string
  date: string
  impressions: number
  clicks: number
  spend: number
  conversions: number
  cpc: number | null
  cpm: number | null
  ctr: number | null
  roas: number | null
  reach: number
  frequency: number | null
  raw_data: Record<string, unknown>
  synced_at: string
}

export interface HubAdCreative {
  id: string
  campaign_id: string
  meta_ad_id: string | null
  name: string
  creative_type: 'image' | 'video' | 'carousel' | null
  thumbnail_url: string | null
  preview_url: string | null
  copy_text: string | null
  headline: string | null
  cta: string | null
  created_at: string
}

export interface HubAdReview {
  id: string
  creative_id: string
  user_id: string | null
  rating: number
  review_type: 'ai' | 'manual'
  strengths: string[]
  weaknesses: string[]
  suggestions: string | null
  ai_analysis: Record<string, unknown>
  created_at: string
}

export type InsightType =
  | 'ad_optimization'
  | 'meeting_correlation'
  | 'performance_trend'
  | 'creative_analysis'
  | 'strategic_recommendation'

export interface HubAiInsight {
  id: string
  client_id: string
  insight_type: InsightType
  title: string
  content: string
  confidence: number | null
  source_data: Record<string, unknown>
  is_actionable: boolean
  is_dismissed: boolean
  created_at: string
}

export interface HubVerificationCode {
  id: string
  code: string
  platform: string | null
  subject: string | null
  sender_email: string | null
  status: 'active' | 'used' | 'expired'
  expires_at: string | null
  used_at: string | null
  used_by: string | null
  raw_body: string | null
  created_at: string
}

export interface HubUserRole {
  id: string
  user_id: string
  organization_id: string
  hub_role: 'super_admin' | 'admin' | 'manager' | 'analyst' | 'viewer'
  created_at: string
}

export interface HubAuditLog {
  id: string
  organization_id: string
  user_id: string
  action: 'create' | 'update' | 'delete' | 'view' | 'export'
  entity_type: 'client' | 'meeting' | 'campaign' | 'insight' | 'credential' | 'tag'
  entity_id: string | null
  changes: Record<string, unknown>
  created_at: string
}
