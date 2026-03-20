"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Globe, Server, Lock, Calendar, ExternalLink, Save,
  Loader2, RefreshCw, CheckCircle, AlertCircle, Sparkles
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
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [scraping, setScraping] = useState(false)

  const fetchInfo = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from("hub_clients")
      .select("website_url, website_cms, website_hosting, website_hosting_expiry, website_domain_registrar, website_domain_expiry, website_ssl, website_notes, website_context")
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
      })
    }
    setLoading(false)
  }, [clientId])

  useEffect(() => { fetchInfo() }, [fetchInfo])

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch(`/api/clients/${clientId}`, {
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
      if (!res.ok) throw new Error("Erro ao salvar")
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
      const res = await fetch(`/api/clients/${clientId}/website`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: info.website_url }),
      })
      if (!res.ok) throw new Error("Erro ao ler site")
      const data = await res.json()
      setInfo(prev => ({ ...prev, website_context: data.context }))
      toast.success("Contexto do site atualizado!")
    } catch {
      toast.error("Nao foi possivel ler o site")
    } finally {
      setScraping(false)
    }
  }

  // Check domain expiry warning (within 30 days)
  function getDaysUntil(dateStr: string | null) {
    if (!dateStr) return null
    const diff = new Date(dateStr).getTime() - Date.now()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  const domainDays = getDaysUntil(info.website_domain_expiry)
  const hostingDays = getDaysUntil(info.website_hosting_expiry)

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-32 bg-muted rounded-xl" />
        <div className="h-32 bg-muted rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Expiry Warnings */}
      {((domainDays !== null && domainDays <= 30) || (hostingDays !== null && hostingDays <= 30)) && (
        <div className="flex flex-col gap-2">
          {domainDays !== null && domainDays <= 30 && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
              <p className="text-sm text-red-700">
                <strong>Dominio vence em {domainDays} dias</strong> — Renove logo para nao perder o dominio do cliente.
              </p>
            </div>
          )}
          {hostingDays !== null && hostingDays <= 30 && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
              <p className="text-sm text-amber-700">
                <strong>Hospedagem vence em {hostingDays} dias</strong> — Verifique a renovacao.
              </p>
            </div>
          )}
        </div>
      )}

      {/* URL + CMS */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Globe className="h-4 w-4" /> Site
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1 space-y-1.5">
              <Label className="text-xs text-muted-foreground">URL do Site</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="https://exemplo.com.br"
                  value={info.website_url || ""}
                  onChange={e => setInfo(prev => ({ ...prev, website_url: e.target.value }))}
                />
                {info.website_url && (
                  <a href={info.website_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="icon" className="shrink-0">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">CMS / Plataforma</Label>
              <Select value={info.website_cms || ""} onValueChange={v => setInfo(prev => ({ ...prev, website_cms: v || null }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent>
                  {CMS_OPTIONS.map(opt => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">SSL</Label>
              <Select
                value={info.website_ssl === null ? "" : info.website_ssl ? "yes" : "no"}
                onValueChange={v => setInfo(prev => ({ ...prev, website_ssl: v === "" ? null : v === "yes" }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">✅ Ativo (HTTPS)</SelectItem>
                  <SelectItem value="no">❌ Inativo (HTTP)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hosting */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Server className="h-4 w-4" /> Hospedagem & Dominio
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Provedor de Hospedagem</Label>
              <Select value={info.website_hosting || ""} onValueChange={v => setInfo(prev => ({ ...prev, website_hosting: v || null }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent>
                  {HOSTING_OPTIONS.map(opt => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3 w-3" /> Vencimento da Hospedagem
                {hostingDays !== null && hostingDays <= 30 && (
                  <Badge variant="destructive" className="text-[10px] h-4">{hostingDays}d</Badge>
                )}
              </Label>
              <Input
                type="date"
                value={info.website_hosting_expiry || ""}
                onChange={e => setInfo(prev => ({ ...prev, website_hosting_expiry: e.target.value || null }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Registrar do Dominio</Label>
              <Input
                placeholder="Ex: GoDaddy, Registro.br..."
                value={info.website_domain_registrar || ""}
                onChange={e => setInfo(prev => ({ ...prev, website_domain_registrar: e.target.value || null }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3 w-3" /> Vencimento do Dominio
                {domainDays !== null && domainDays <= 30 && (
                  <Badge variant="destructive" className="text-[10px] h-4">{domainDays}d</Badge>
                )}
              </Label>
              <Input
                type="date"
                value={info.website_domain_expiry || ""}
                onChange={e => setInfo(prev => ({ ...prev, website_domain_expiry: e.target.value || null }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Observacoes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Login do painel, acesso FTP, informacoes tecnicas..."
            value={info.website_notes || ""}
            onChange={e => setInfo(prev => ({ ...prev, website_notes: e.target.value || null }))}
            className="min-h-[100px] resize-none"
          />
        </CardContent>
      </Card>

      {/* AI Context */}
      <Card className={info.website_context ? "border-emerald-200 bg-emerald-50/30" : "border-dashed"}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-500" /> Contexto IA
            </CardTitle>
            {info.website_context && (
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 border-emerald-200">
                <CheckCircle className="h-3 w-3 mr-1" /> Ativo
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {info.website_context
              ? "O site foi lido pela IA. Este contexto e usado automaticamente ao gerar criativos e insights."
              : "Clique em 'Ler Site' para que a IA leia o conteudo do site e use como contexto ao gerar criativos."}
          </p>
          {info.website_context && (
            <div className="bg-muted/40 rounded-lg p-3 max-h-[120px] overflow-y-auto">
              <p className="text-xs font-mono text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {info.website_context.slice(0, 600)}...
              </p>
            </div>
          )}
          <Button
            variant={info.website_context ? "outline" : "default"}
            size="sm"
            onClick={handleScrape}
            disabled={scraping || !info.website_url}
            className={info.website_context ? "" : "bg-emerald-600 hover:bg-emerald-700 text-white"}
          >
            {scraping ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {info.website_context ? "Atualizar contexto" : "Ler Site com IA"}
          </Button>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar Informacoes
        </Button>
      </div>
    </div>
  )
}
