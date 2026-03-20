-- ============================================
-- FRANCA HUB - Database Migration
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- HUB: Client Profiles
-- ============================================
CREATE TABLE IF NOT EXISTS hub_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  crm_contact_id UUID,
  nome_empresa TEXT,
  nome_cliente TEXT NOT NULL,
  segmento TEXT,
  nicho TEXT,
  status TEXT DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Inativo')),
  -- Endereço
  endereco TEXT,
  numero_endereco TEXT,
  cep TEXT,
  cidade TEXT,
  estado TEXT,
  -- Financeiro
  valor_servico DECIMAL(10,2),
  dia_pagamento INT,
  faturamento_medio DECIMAL(12,2),
  modelo_pagamento TEXT,
  -- Dados
  cnpj_cpf TEXT,
  email TEXT,
  genero TEXT,
  aniversario DATE,
  telefone TEXT,
  -- Serviços
  servicos_contratados TEXT,
  canal_venda TEXT,
  tag TEXT,
  -- Datas
  data_inicio DATE,
  data_encerramento DATE,
  -- Drive
  pasta_drive TEXT,
  -- Perfil comportamental
  behavioral_profile TEXT,
  personality_notes TEXT,
  active_projects TEXT[] DEFAULT '{}',
  avatar_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hub_clients_org ON hub_clients(organization_id);
CREATE INDEX IF NOT EXISTS idx_hub_clients_status ON hub_clients(status);
CREATE INDEX IF NOT EXISTS idx_hub_clients_segmento ON hub_clients(segmento);

-- ============================================
-- HUB: Cofre de Acessos (Credentials Vault)
-- ============================================
CREATE TABLE IF NOT EXISTS hub_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES hub_clients(id) ON DELETE CASCADE,
  credential_type TEXT DEFAULT 'standard' CHECK (credential_type IN ('standard', 'custom')),
  platform_name TEXT NOT NULL,
  login TEXT,
  password TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hub_credentials_client ON hub_credentials(client_id);

-- ============================================
-- HUB: Tags
-- ============================================
CREATE TABLE IF NOT EXISTS hub_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, name)
);

CREATE TABLE IF NOT EXISTS hub_client_tags (
  client_id UUID NOT NULL REFERENCES hub_clients(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES hub_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (client_id, tag_id)
);

-- ============================================
-- HUB: Notes & Observations
-- ============================================
CREATE TABLE IF NOT EXISTS hub_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES hub_clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hub_notes_client ON hub_notes(client_id);

-- ============================================
-- HUB: Timeline Events
-- ============================================
CREATE TABLE IF NOT EXISTS hub_timeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES hub_clients(id) ON DELETE CASCADE,
  user_id UUID,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hub_timeline_client ON hub_timeline_events(client_id, created_at DESC);

-- ============================================
-- HUB: Meetings
-- ============================================
CREATE TABLE IF NOT EXISTS hub_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES hub_clients(id) ON DELETE CASCADE,
  organization_id UUID,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  meeting_date TIMESTAMPTZ NOT NULL,
  duration_minutes INT,
  google_meet_link TEXT,
  google_event_id TEXT,
  recording_url TEXT,
  recording_storage TEXT CHECK (recording_storage IN ('supabase', 'google_drive')),
  status TEXT DEFAULT 'scheduled' CHECK (status IN (
    'scheduled', 'in_progress', 'completed', 'transcribing', 'transcribed', 'cancelled'
  )),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hub_meetings_client ON hub_meetings(client_id);
CREATE INDEX IF NOT EXISTS idx_hub_meetings_date ON hub_meetings(meeting_date DESC);

-- ============================================
-- HUB: Transcriptions
-- ============================================
CREATE TABLE IF NOT EXISTS hub_transcriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES hub_meetings(id) ON DELETE CASCADE,
  full_text TEXT NOT NULL,
  language TEXT DEFAULT 'pt-BR',
  word_count INT,
  confidence_score FLOAT,
  provider TEXT DEFAULT 'google_stt' CHECK (provider IN ('whisper', 'google_stt')),
  key_points JSONB DEFAULT '[]',
  action_items JSONB DEFAULT '[]',
  summary TEXT,
  ai_processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hub_transcriptions_meeting ON hub_transcriptions(meeting_id);

-- Full text search on transcriptions
ALTER TABLE hub_transcriptions ADD COLUMN IF NOT EXISTS fts tsvector
  GENERATED ALWAYS AS (to_tsvector('portuguese', coalesce(full_text, ''))) STORED;
CREATE INDEX IF NOT EXISTS idx_hub_transcriptions_fts ON hub_transcriptions USING GIN (fts);

-- ============================================
-- HUB: Meta Ads - Ad Accounts
-- ============================================
CREATE TABLE IF NOT EXISTS hub_ad_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  meta_account_id TEXT NOT NULL,
  account_name TEXT,
  access_token_encrypted TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error')),
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, meta_account_id)
);

-- ============================================
-- HUB: Meta Ads - Campaigns
-- ============================================
CREATE TABLE IF NOT EXISTS hub_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_account_id UUID NOT NULL REFERENCES hub_ad_accounts(id) ON DELETE CASCADE,
  client_id UUID REFERENCES hub_clients(id),
  meta_campaign_id TEXT NOT NULL,
  name TEXT NOT NULL,
  objective TEXT,
  status TEXT,
  product_service TEXT,
  is_product_active BOOLEAN DEFAULT true,
  daily_budget DECIMAL(10,2),
  lifetime_budget DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(ad_account_id, meta_campaign_id)
);

CREATE INDEX IF NOT EXISTS idx_hub_campaigns_client ON hub_campaigns(client_id);

-- ============================================
-- HUB: Meta Ads - Performance Snapshots
-- ============================================
CREATE TABLE IF NOT EXISTS hub_campaign_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES hub_campaigns(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  impressions BIGINT DEFAULT 0,
  clicks BIGINT DEFAULT 0,
  spend DECIMAL(12,2) DEFAULT 0,
  conversions INT DEFAULT 0,
  cpc DECIMAL(10,4),
  cpm DECIMAL(10,4),
  ctr DECIMAL(8,4),
  roas DECIMAL(10,4),
  reach BIGINT DEFAULT 0,
  frequency DECIMAL(8,4),
  raw_data JSONB DEFAULT '{}',
  synced_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(campaign_id, date)
);

CREATE INDEX IF NOT EXISTS idx_hub_metrics_campaign_date ON hub_campaign_metrics(campaign_id, date DESC);

-- ============================================
-- HUB: Ad Creatives & Reviews
-- ============================================
CREATE TABLE IF NOT EXISTS hub_ad_creatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES hub_campaigns(id) ON DELETE CASCADE,
  meta_ad_id TEXT,
  name TEXT NOT NULL,
  creative_type TEXT,
  thumbnail_url TEXT,
  preview_url TEXT,
  copy_text TEXT,
  headline TEXT,
  cta TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hub_ad_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creative_id UUID NOT NULL REFERENCES hub_ad_creatives(id) ON DELETE CASCADE,
  user_id UUID,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  review_type TEXT DEFAULT 'ai' CHECK (review_type IN ('ai', 'manual')),
  strengths JSONB DEFAULT '[]',
  weaknesses JSONB DEFAULT '[]',
  suggestions TEXT,
  ai_analysis JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- HUB: AI Insights
-- ============================================
CREATE TABLE IF NOT EXISTS hub_ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES hub_clients(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL CHECK (insight_type IN (
    'ad_optimization', 'meeting_correlation', 'performance_trend',
    'creative_analysis', 'strategic_recommendation'
  )),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  confidence FLOAT,
  source_data JSONB DEFAULT '{}',
  is_actionable BOOLEAN DEFAULT true,
  is_dismissed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hub_insights_client ON hub_ai_insights(client_id, created_at DESC);

-- ============================================
-- HUB: Verification Codes
-- ============================================
CREATE TABLE IF NOT EXISTS hub_verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  platform TEXT,
  subject TEXT,
  sender_email TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired')),
  expires_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ,
  used_by UUID,
  raw_body TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- HUB: User Roles
-- ============================================
CREATE TABLE IF NOT EXISTS hub_user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  organization_id UUID,
  hub_role TEXT NOT NULL CHECK (hub_role IN (
    'super_admin', 'admin', 'manager', 'analyst', 'viewer'
  )),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, organization_id)
);

-- ============================================
-- HUB: Audit Trail
-- ============================================
CREATE TABLE IF NOT EXISTS hub_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  changes JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hub_audit_org ON hub_audit_log(organization_id, created_at DESC);

-- ============================================
-- RLS Policies (basic - enable RLS on all tables)
-- ============================================
ALTER TABLE hub_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE hub_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE hub_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE hub_client_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE hub_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE hub_timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE hub_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE hub_transcriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hub_ad_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE hub_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE hub_campaign_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE hub_ad_creatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE hub_ad_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE hub_ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE hub_verification_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE hub_user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE hub_audit_log ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access (refine per-org later)
CREATE POLICY "hub_clients_all" ON hub_clients FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "hub_credentials_all" ON hub_credentials FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "hub_tags_all" ON hub_tags FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "hub_client_tags_all" ON hub_client_tags FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "hub_notes_all" ON hub_notes FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "hub_timeline_all" ON hub_timeline_events FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "hub_meetings_all" ON hub_meetings FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "hub_transcriptions_all" ON hub_transcriptions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "hub_ad_accounts_all" ON hub_ad_accounts FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "hub_campaigns_all" ON hub_campaigns FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "hub_metrics_all" ON hub_campaign_metrics FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "hub_creatives_all" ON hub_ad_creatives FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "hub_reviews_all" ON hub_ad_reviews FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "hub_insights_all" ON hub_ai_insights FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "hub_codes_all" ON hub_verification_codes FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "hub_roles_all" ON hub_user_roles FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "hub_audit_all" ON hub_audit_log FOR ALL USING (auth.role() = 'authenticated');
