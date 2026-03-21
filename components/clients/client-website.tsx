"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  ExternalLink,
  Globe,
  Loader2,
  Lock,
  RefreshCw,
  Save,
  Server,
  Sparkles,
} from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"

interface WebsiteInfo {
  website_url: string | null
  website_cms: string | null
  website_hosting: string | null
  website_hosting_expiry: string | null
  website_domain_registrar: string | null
  website_domain_expiry: string | null
  website_ssl: boolean | null
  website_notes: string | null
  website_context: string | null
  website_scraped_at: string | null
}

const CMS_OPTIONS = [
  "WordPress",
  "Shopify",
  "Webflow",
  "Wix",
  "Squarespace",
  "Next.js",
  "Custom",
  "Outro",
]

const HOSTING_OPTIONS = [
  "Hostinger",
  "GoDaddy",
  "Locaweb",
  "Cloudflare Pages",
  "Vercel",
  "Netlify",
  "AWS",
  "DigitalOcean",
  "Outro",
]

export function ClientWebsite({ clientId }: { clientId: string }) {
  const [info, setInfo] = useState<WebsiteInfo>({
    website_url: "",
    website_cms: null,
    website_hosting: null,
    website_hosting_expiry: null,
    website_domain_registrar: null,
    website_domain_expiry: null,
    website_ssl: null,
    website_notes: null,
    website_context: null,
    website_scraped_at: null,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [scraping, setScraping] = useState(false)

  const fetchInfo = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from("hub_clients")
      .select("website_url, website_cms, website_hosting, website_hosting_expiry, website_domain_registrar, website_domain_expiry, website_ssl, website_notes, website_context, website_scraped_at")
      .eq("id", clientId)
      .single()

    if (data) {
      setInfo({
        website_url: data.website_url || "",
        website_cms: data.website_cms || null,
        website_hosting: data.website_hosting || null,
        website_hosting_expiry: data.website_hosting_expiry || null,
        website_domain_registrar: data.website_domain_registrar || null,
        website_domain_expiry: data.website_domain_expiry || null,
        website_ssl: data.website_ssl ?? null,
        website_notes: data.website_notes || null,
        website_context: data.website_context || null,
        website_scraped_at: data.website_scraped_at || null,
      })
    }

    setLoading(false)
  }, [clientId])

  useEffect(() => {
    fetchInfo()
  }, [fetchInfo])

  async function handleSave() {
    setSaving(true)
    try {
      const response = await fetch(`/api/clients/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          website_url: info.website_url || null,
          website_cms: info.website_cms || null,
          website_hosting: info.website_hosting || null,
          website_hosting_expiry: info.website_hosting_expiry || null,
          website_domain_registrar: info.website_domain_registrar || null,
          website_domain_expiry: info.website_domain_expiry || null,
          website_ssl: info.website_ssl,
          website_notes: info.website_notes || null,
        }),
      })

      if (!response.ok) throw new Error("Erro ao salvar")

      toast.success("Informacoes do site salvas!")
    } catch {
      toast.error("Erro ao salvar")
    } finally {
      setSaving(false)
    }
  }

  async function handleScrape() {
    if (!info.website_url) {
      toast.error("Adicione a URL do site primeiro")
      return
    }

    setScraping(true)
    try {
      const response = await fetch(`/api/clients/${clientId}/website`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: info.website_url }),
      })

      if (!response.ok) throw new Error("Erro ao ler site")

      const data = await response.json()
      setInfo((prev) => ({
        ...prev,
        website_context: data.context,
        website_scraped_at: new Date().toISOString(),
      }))
      toast.success("Contexto do site atualizado!")
    } catch {
      toast.error("Nao foi possivel ler o site")
    } finally {
      setScraping(false)
    }
  }

  function getDaysUntil(dateStr: string | null) {
    if (!dateStr) return null
    const target = new Date(`${dateStr}T12:00:00`).getTime()
    const today = new Date()
    today.setHours(12, 0, 0, 0)
    const diff = target - today.getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "Sem data"
    return new Date(`${dateStr}T12:00:00`).toLocaleDateString("pt-BR")
  }

  function formatDateTime(dateStr: string | null) {
    if (!dateStr) return "Nunca"
    return new Date(dateStr).toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    })
  }

  function normalizeUrl(url: string | null) {
    if (!url) return null
    return url.startsWith("http://") || url.startsWith("https://") ? url : `https://${url}`
  }

  const domainDays = getDaysUntil(info.website_domain_expiry)
  const hostingDays = getDaysUntil(info.website_hosting_expiry)
  const hasWebsite = Boolean(info.website_url?.trim())
  const hasContext = Boolean(info.website_context?.trim())
  const normalizedWebsiteUrl = normalizeUrl(info.website_url)
  const domainCritical = domainDays !== null && domainDays <= 30
  const hostingCritical = hostingDays !== null && hostingDays <= 30
  const totalAlerts = Number(domainCritical) + Number(hostingCritical)

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-44 rounded-[24px] bg-muted" />
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="h-72 rounded-[24px] bg-muted" />
          <div className="h-72 rounded-[24px] bg-muted" />
        </div>
        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="h-56 rounded-[24px] bg-muted" />
          <div className="h-56 rounded-[24px] bg-muted" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[26px] border border-cyan-200/70 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.20),transparent_46%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.14),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(236,254,255,0.94))] p-5 lg:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-500/10">
                <Globe className="h-5 w-5 text-cyan-700" />
              </div>
              <div>
                <h3 className="text-lg font-semibold tracking-tight">Sites e infraestrutura digital</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Um panorama premium do ecossistema web do cliente, com URL, stack, renovacoes e contexto de IA em um fluxo mais elegante.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {normalizedWebsiteUrl && (
              <a href={normalizedWebsiteUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="h-11 rounded-2xl bg-white">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Abrir site
                </Button>
              </a>
            )}

            <Button
              variant={hasContext ? "outline" : "default"}
              onClick={handleScrape}
              disabled={scraping || !hasWebsite}
              className={`h-11 rounded-2xl ${hasContext ? "bg-white" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}
            >
              {scraping ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              {hasContext ? "Atualizar contexto" : "Ler site com IA"}
            </Button>

            <Button onClick={handleSave} disabled={saving} className="h-11 rounded-2xl">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Salvar informacoes
            </Button>
          </div>
        </div>

        {totalAlerts > 0 && (
          <div className="mt-6 grid gap-3 lg:grid-cols-2">
            {domainCritical && (
              <AlertTile
                tone="red"
                title={domainDays !== null && domainDays < 0 ? "Dominio vencido" : `Dominio vence em ${domainDays} dias`}
                description="Vale revisar o registro para evitar indisponibilidade ou perda do dominio."
              />
            )}
            {hostingCritical && (
              <AlertTile
                tone="amber"
                title={hostingDays !== null && hostingDays < 0 ? "Hospedagem vencida" : `Hospedagem vence em ${hostingDays} dias`}
                description="Confirme a renovacao e o metodo de pagamento antes de gerar risco operacional."
              />
            )}
          </div>
        )}

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="URL"
            value={hasWebsite ? info.website_url!.replace(/^https?:\/\//, "").replace(/\/$/, "") : "Nao definida"}
            tone="cyan"
          />
          <MetricCard
            label="SSL"
            value={info.website_ssl === null ? "Nao informado" : info.website_ssl ? "HTTPS ativo" : "HTTP apenas"}
            tone={info.website_ssl ? "emerald" : info.website_ssl === false ? "amber" : "slate"}
          />
          <MetricCard
            label="Dominio"
            value={domainDays === null ? "Sem vencimento" : domainDays < 0 ? `Atrasado ${Math.abs(domainDays)}d` : `${domainDays} dias`}
            tone={domainCritical ? "amber" : "slate"}
          />
          <MetricCard
            label="Contexto IA"
            value={hasContext ? `Atualizado ${formatDateTime(info.website_scraped_at)}` : "Nao gerado"}
            tone={hasContext ? "emerald" : "slate"}
          />
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-[24px] border border-border/60 bg-white p-5 shadow-sm shadow-slate-950/5">
          <div className="mb-5 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10">
              <Globe className="h-4 w-4 text-cyan-700" />
            </div>
            <div>
              <h4 className="text-base font-semibold">Identidade do site</h4>
              <p className="text-sm text-muted-foreground">URL principal, plataforma usada e status de seguranca.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">URL do site</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="https://exemplo.com.br"
                  value={info.website_url || ""}
                  onChange={(event) => setInfo((prev) => ({ ...prev, website_url: event.target.value }))}
                  className="h-11 rounded-2xl"
                />
                {normalizedWebsiteUrl && (
                  <a href={normalizedWebsiteUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="icon" className="h-11 w-11 rounded-2xl">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </a>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">CMS / plataforma</Label>
                <Select value={info.website_cms || ""} onValueChange={(value) => setInfo((prev) => ({ ...prev, website_cms: value || null }))}>
                  <SelectTrigger className="h-11 rounded-2xl">
                    <SelectValue placeholder="Selecionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CMS_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">SSL</Label>
                <Select
                  value={info.website_ssl === null ? "" : info.website_ssl ? "yes" : "no"}
                  onValueChange={(value) => setInfo((prev) => ({ ...prev, website_ssl: value === "" ? null : value === "yes" }))}
                >
                  <SelectTrigger className="h-11 rounded-2xl">
                    <SelectValue placeholder="Selecionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Ativo (HTTPS)</SelectItem>
                    <SelectItem value="no">Inativo (HTTP)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <InfoChip
                icon={<Lock className="h-4 w-4 text-emerald-600" />}
                title="Camada de seguranca"
                value={
                  info.website_ssl === null
                    ? "Ainda nao informado"
                    : info.website_ssl
                      ? "Transmissao protegida com HTTPS"
                      : "Sem SSL ativo no momento"
                }
              />
              <InfoChip
                icon={<Sparkles className="h-4 w-4 text-cyan-700" />}
                title="Contexto IA"
                value={hasContext ? "Pronto para apoiar criativos e insights" : "Ainda nao enriquecido pela IA"}
              />
            </div>
          </div>
        </section>

        <section className="rounded-[24px] border border-border/60 bg-white p-5 shadow-sm shadow-slate-950/5">
          <div className="mb-5 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
              <Server className="h-4 w-4 text-emerald-700" />
            </div>
            <div>
              <h4 className="text-base font-semibold">Hospedagem e dominio</h4>
              <p className="text-sm text-muted-foreground">Renovacoes, provedor e referencia do registro do dominio.</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Provedor de hospedagem</Label>
              <Select value={info.website_hosting || ""} onValueChange={(value) => setInfo((prev) => ({ ...prev, website_hosting: value || null }))}>
                <SelectTrigger className="h-11 rounded-2xl">
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent>
                  {HOSTING_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-2 text-xs font-medium">
                <Calendar className="h-3.5 w-3.5" />
                Vencimento da hospedagem
                {hostingCritical && <ExpiryBadge days={hostingDays} />}
              </Label>
              <Input
                type="date"
                value={info.website_hosting_expiry || ""}
                onChange={(event) => setInfo((prev) => ({ ...prev, website_hosting_expiry: event.target.value || null }))}
                className="h-11 rounded-2xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Registrar do dominio</Label>
              <Input
                placeholder="Ex: Registro.br, GoDaddy..."
                value={info.website_domain_registrar || ""}
                onChange={(event) => setInfo((prev) => ({ ...prev, website_domain_registrar: event.target.value || null }))}
                className="h-11 rounded-2xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-2 text-xs font-medium">
                <Calendar className="h-3.5 w-3.5" />
                Vencimento do dominio
                {domainCritical && <ExpiryBadge days={domainDays} />}
              </Label>
              <Input
                type="date"
                value={info.website_domain_expiry || ""}
                onChange={(event) => setInfo((prev) => ({ ...prev, website_domain_expiry: event.target.value || null }))}
                className="h-11 rounded-2xl"
              />
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <InfoChip
              icon={<Calendar className="h-4 w-4 text-emerald-700" />}
              title="Proxima renovacao de hospedagem"
              value={formatDate(info.website_hosting_expiry)}
            />
            <InfoChip
              icon={<Calendar className="h-4 w-4 text-cyan-700" />}
              title="Proxima renovacao de dominio"
              value={formatDate(info.website_domain_expiry)}
            />
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-[24px] border border-border/60 bg-white p-5 shadow-sm shadow-slate-950/5">
          <div className="mb-5 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-500/10">
              <Server className="h-4 w-4 text-slate-700" />
            </div>
            <div>
              <h4 className="text-base font-semibold">Observacoes tecnicas</h4>
              <p className="text-sm text-muted-foreground">Anote logins, painel, detalhes de deploy e informacoes operacionais.</p>
            </div>
          </div>

          <Textarea
            placeholder="Login do painel, acesso FTP, observacoes sobre deploy, rotina de manutencao..."
            value={info.website_notes || ""}
            onChange={(event) => setInfo((prev) => ({ ...prev, website_notes: event.target.value || null }))}
            className="min-h-[220px] resize-none rounded-[22px] border-border/60 bg-muted/20"
          />
        </section>

        <section
          className={`rounded-[24px] border p-5 shadow-sm transition-all ${
            hasContext
              ? "border-emerald-200/80 bg-[linear-gradient(180deg,rgba(236,253,245,0.9),rgba(255,255,255,1))] shadow-emerald-950/5"
              : "border-dashed border-border/70 bg-white shadow-slate-950/5"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${hasContext ? "bg-emerald-500/10" : "bg-muted"}`}>
                <Sparkles className={`h-4 w-4 ${hasContext ? "text-emerald-600" : "text-muted-foreground"}`} />
              </div>
              <div>
                <h4 className="text-base font-semibold">Contexto IA do site</h4>
                <p className="text-sm text-muted-foreground">
                  {hasContext
                    ? "Esse resumo ja pode ser reaproveitado em criativos, insights e futuras automacoes."
                    : "Quando a IA ler o site, o resumo aparece aqui como contexto reaproveitavel."}
                </p>
              </div>
            </div>

            {hasContext && (
              <Badge variant="secondary" className="border-emerald-200 bg-emerald-100 text-emerald-700">
                <CheckCircle className="mr-1 h-3.5 w-3.5" />
                Ativo
              </Badge>
            )}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <InfoChip
              icon={<Sparkles className="h-4 w-4 text-emerald-600" />}
              title="Ultima leitura"
              value={formatDateTime(info.website_scraped_at)}
            />
            <InfoChip
              icon={<Globe className="h-4 w-4 text-cyan-700" />}
              title="Fonte"
              value={hasWebsite ? info.website_url || "Site vinculado" : "Nenhuma URL cadastrada"}
            />
          </div>

          <div className="mt-5 rounded-[20px] border border-border/60 bg-white/80 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Resumo capturado
            </p>
            <div className="mt-3 max-h-[220px] overflow-y-auto pr-1">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {hasContext
                  ? info.website_context!.slice(0, 1200)
                  : "Sem contexto ainda. Use o botao de leitura por IA para transformar o site do cliente em referencia de tom de voz, oferta e posicionamento."}
              </p>
            </div>
          </div>

          <Button
            variant={hasContext ? "outline" : "default"}
            onClick={handleScrape}
            disabled={scraping || !hasWebsite}
            className={`mt-5 h-11 w-full rounded-2xl ${hasContext ? "bg-white" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}
          >
            {scraping ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            {hasContext ? "Atualizar contexto do site" : "Gerar contexto com IA"}
          </Button>
        </section>
      </div>
    </div>
  )
}

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: "cyan" | "emerald" | "amber" | "slate"
}) {
  const toneClass =
    tone === "emerald"
      ? "bg-emerald-500/10 text-emerald-700"
      : tone === "amber"
        ? "bg-amber-500/10 text-amber-700"
        : tone === "cyan"
          ? "bg-cyan-500/10 text-cyan-700"
          : "bg-slate-500/10 text-slate-700"

  return (
    <div className="rounded-2xl border border-white/70 bg-white/85 px-4 py-3 shadow-sm shadow-cyan-950/5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-1 inline-flex max-w-full rounded-full px-2.5 py-1 text-sm font-semibold ${toneClass}`}>
        <span className="truncate">{value}</span>
      </p>
    </div>
  )
}

function AlertTile({
  title,
  description,
  tone,
}: {
  title: string
  description: string
  tone: "red" | "amber"
}) {
  const styles =
    tone === "red"
      ? "border-red-200 bg-red-50/80 text-red-700"
      : "border-amber-200 bg-amber-50/80 text-amber-700"

  return (
    <div className={`flex items-start gap-3 rounded-2xl border px-4 py-3 ${styles}`}>
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-1 text-xs leading-relaxed opacity-90">{description}</p>
      </div>
    </div>
  )
}

function ExpiryBadge({ days }: { days: number | null }) {
  if (days === null) return null

  return (
    <Badge variant="destructive" className="h-5 rounded-full px-2 text-[10px]">
      {days < 0 ? `+${Math.abs(days)}d` : `${days}d`}
    </Badge>
  )
}

function InfoChip({
  icon,
  title,
  value,
}: {
  icon: React.ReactNode
  title: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-3">
      <div className="flex items-center gap-2">
        {icon}
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{title}</p>
      </div>
      <p className="mt-2 text-sm font-medium text-foreground">{value}</p>
    </div>
  )
}
