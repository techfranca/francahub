"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  ArrowLeft, Edit, FolderOpen, Mail, Phone, Trash2,
  DollarSign, Shield, StickyNote, Clock, BarChart3, Video, Sparkles,
  FileDown, MapPin, CreditCard, Tag, Briefcase,
  Hash, Copy, Check, ExternalLink, Calendar, Building2, User2,
  Camera, ImagePlus, Pencil, X, Loader2, UserMinus, UserCheck, Smartphone,
  Globe, RefreshCw
} from "lucide-react"
import { getSegmentColor } from "@/lib/constants"
import type { HubClient, HubCredential, HubNote, HubTimelineEvent } from "@/types/database"
import { CredentialsVault } from "@/components/clients/credentials-vault"
import { TwoFactorVault } from "@/components/clients/two-factor-vault"
import { ClientNotes } from "@/components/clients/client-notes"
import { ClientTimeline } from "@/components/clients/client-timeline"
import { ClientFormDialog } from "@/components/clients/client-form-dialog"
import { ClientMeetings } from "@/components/meetings/client-meetings"
import { ClientCampaigns } from "@/components/ads/client-campaigns"
import { ClientInsights } from "@/components/insights/client-insights"
import { ClientCreatives } from "@/components/clients/client-creatives"
import { useRealtimeTables } from "@/lib/supabase/realtime"
import { toast } from "sonner"
import Link from "next/link"

export default function ClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = params.id as string

  const [client, setClient] = useState<HubClient | null>(null)
  const [credentials, setCredentials] = useState<HubCredential[]>([])
  const [notes, setNotes] = useState<HubNote[]>([])
  const [timeline, setTimeline] = useState<HubTimelineEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [showEdit, setShowEdit] = useState(false)
  const [copiedEmail, setCopiedEmail] = useState(false)
  const [copiedPhone, setCopiedPhone] = useState(false)
  const [showAvatarMenu, setShowAvatarMenu] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [creatingDrive, setCreatingDrive] = useState(false)
  const [scrapingWebsite, setScrapingWebsite] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    const [clientRes, credRes, notesRes, timelineRes] = await Promise.all([
      supabase.from("hub_clients").select("*").eq("id", clientId).single(),
      supabase.from("hub_credentials").select("*").eq("client_id", clientId).order("credential_type").order("platform_name"),
      supabase.from("hub_notes").select("*").eq("client_id", clientId).order("is_pinned", { ascending: false }).order("created_at", { ascending: false }),
      supabase.from("hub_timeline_events").select("*").eq("client_id", clientId).order("created_at", { ascending: false }).limit(50),
    ])

    if (clientRes.data) setClient(clientRes.data)
    if (credRes.data) setCredentials(credRes.data)
    if (notesRes.data) setNotes(notesRes.data)
    if (timelineRes.data) setTimeline(timelineRes.data)
    setLoading(false)
  }, [clientId])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  useRealtimeTables(
    [
      { table: "hub_clients", filter: `id=eq.${clientId}` },
      { table: "hub_notes", filter: `client_id=eq.${clientId}` },
      { table: "hub_credentials", filter: `client_id=eq.${clientId}` },
      { table: "hub_timeline_events", filter: `client_id=eq.${clientId}` },
    ],
    fetchAll
  )

  async function handleToggleStatus() {
    if (!client) return
    const newStatus = client.status === "Ativo" ? "Inativo" : "Ativo"
    const confirmMsg = newStatus === "Inativo"
      ? "Tem certeza que deseja inativar este cliente?"
      : "Deseja reativar este cliente?"
    if (!confirm(confirmMsg)) return

    const res = await fetch(`/api/clients/${clientId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    })
    if (res.ok) {
      toast.success(newStatus === "Inativo" ? "Cliente inativado" : "Cliente reativado")
      fetchAll()
    } else {
      toast.error("Erro ao atualizar status")
    }
  }

  async function handleDelete() {
    if (!confirm("Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.")) return
    const res = await fetch(`/api/clients/${clientId}`, { method: "DELETE" })
    if (res.ok) {
      toast.success("Cliente excluído com sucesso")
      router.push("/clients")
    }
  }

  function copyText(text: string, type: "email" | "phone") {
    navigator.clipboard.writeText(text)
    if (type === "email") {
      setCopiedEmail(true)
      setTimeout(() => setCopiedEmail(false), 1500)
    } else {
      setCopiedPhone(true)
      setTimeout(() => setCopiedPhone(false), 1500)
    }
    toast.success("Copiado!")
  }

  async function handleAvatarUpload(file: File) {
    setUploadingAvatar(true)
    setShowAvatarMenu(false)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch(`/api/clients/${clientId}/avatar`, {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Erro ao enviar imagem")
      }

      toast.success("Imagem atualizada!")
      fetchAll()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar imagem")
    } finally {
      setUploadingAvatar(false)
    }
  }

  async function handleAvatarRemove() {
    setShowAvatarMenu(false)
    setUploadingAvatar(true)
    try {
      const res = await fetch(`/api/clients/${clientId}/avatar`, { method: "DELETE" })
      if (!res.ok) throw new Error("Erro ao remover")
      toast.success("Imagem removida")
      fetchAll()
    } catch {
      toast.error("Erro ao remover imagem")
    } finally {
      setUploadingAvatar(false)
    }
  }

  async function handleCreateDrive() {
    setCreatingDrive(true)
    try {
      const res = await fetch(`/api/clients/${clientId}/drive`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erro ao criar pasta")
      toast.success(data.alreadyExisted ? "Pasta já existia — link vinculado!" : "Pasta criada no Google Drive!")
      fetchAll()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar pasta no Drive")
    } finally {
      setCreatingDrive(false)
    }
  }

  async function handleScrapeWebsite() {
    setScrapingWebsite(true)
    try {
      const res = await fetch(`/api/clients/${clientId}/website`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erro ao acessar o site")
      toast.success(`Contexto atualizado! (${data.chars} caracteres lidos)`)
      fetchAll()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao acessar o site")
    } finally {
      setScrapingWebsite(false)
    }
  }

  function triggerFileInput() {
    setShowAvatarMenu(false)
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "image/jpeg,image/png,image/webp,image/svg+xml"
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) handleAvatarUpload(file)
    }
    input.click()
  }

  if (loading || !client) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-muted rounded-xl w-48" />
        <div className="h-80 bg-muted rounded-2xl" />
        <div className="h-12 bg-muted rounded-2xl" />
        <div className="h-64 bg-muted rounded-2xl" />
      </div>
    )
  }

  const colors = getSegmentColor(client.segmento || "")
  const initials = (client.nome_empresa || client.nome_cliente || "")
    .split(" ")
    .map(w => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()

  const memberSince = client.data_inicio
    ? new Date(client.data_inicio).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    : client.created_at
      ? new Date(client.created_at).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
      : null

  const hasAddress = client.endereco || client.cidade || client.estado || client.cep
  const hasFinancial = client.valor_servico || client.dia_pagamento || client.modelo_pagamento || client.faturamento_medio
  const hasPersonalExtras = client.genero || client.aniversario || client.canal_venda || client.cnpj_cpf

  return (
    <div className="animate-fade-in">
      {/* Back */}
      <div className="mb-6">
        <Link href="/clients" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Voltar para clientes
        </Link>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* HERO — All client information in one card                      */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <Card className="shadow-card border-transparent overflow-hidden mb-8">
        <div className={`h-1.5 ${colors.bg}`} />
        <CardContent className="p-0">

          {/* ── Top: Identity + Actions ── */}
          <div className="p-6 lg:p-8 pb-0 lg:pb-0">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              {/* Left: Avatar + Name */}
              <div className="flex items-start gap-4">
                {/* Clickable Avatar */}
                <div className="relative shrink-0">
                  <button
                    onClick={() => setShowAvatarMenu(!showAvatarMenu)}
                    className="relative w-16 h-16 rounded-2xl overflow-hidden group cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 rounded-2xl"
                  >
                    {client.avatar_url ? (
                      <img
                        src={client.avatar_url}
                        alt={client.nome_empresa || client.nome_cliente}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className={`w-full h-full ${colors.light} flex items-center justify-center`}>
                        <span className={`text-xl font-bold ${colors.text}`}>{initials}</span>
                      </div>
                    )}
                    {/* Hover overlay */}
                    {uploadingAvatar ? (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Loader2 className="h-5 w-5 text-white animate-spin" />
                      </div>
                    ) : (
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center transition-all">
                        <Camera className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    )}
                  </button>

                  {/* Avatar dropdown menu */}
                  {showAvatarMenu && (
                    <>
                      {/* Backdrop to close */}
                      <div className="fixed inset-0 z-40" onClick={() => setShowAvatarMenu(false)} />
                      <div className="absolute top-full left-0 mt-2 z-50 bg-white rounded-xl shadow-lg border border-border/50 py-1.5 min-w-[180px] animate-fade-in">
                        <button
                          onClick={triggerFileInput}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
                        >
                          <ImagePlus className="h-4 w-4 text-muted-foreground" />
                          {client.avatar_url ? "Trocar imagem" : "Adicionar imagem"}
                        </button>
                        {client.avatar_url && (
                          <button
                            onClick={handleAvatarRemove}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-destructive hover:bg-red-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                            Remover imagem
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-2xl font-bold tracking-tight">
                      {client.nome_empresa || client.nome_cliente}
                    </h1>
                    <Badge
                      className={`text-xs font-semibold px-3 h-7 rounded-full border-0 ${
                        client.status === "Ativo"
                          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${client.status === "Ativo" ? "bg-emerald-500" : "bg-slate-400"}`} />
                      {client.status}
                    </Badge>
                  </div>
                  {client.nome_empresa && (
                    <p className="text-muted-foreground mt-0.5">{client.nome_cliente}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {client.segmento && (
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 ${colors.light} ${colors.text} rounded-lg text-xs font-semibold`}>
                        <div className={`w-2 h-2 rounded-full ${colors.dot}`} />
                        {client.segmento}
                      </span>
                    )}
                    {client.nicho && (
                      <Badge variant="outline" className="text-xs font-medium px-2.5 h-6 rounded-lg">{client.nicho}</Badge>
                    )}
                    {client.tag && (
                      <Badge variant="outline" className="text-xs font-medium px-2.5 h-6 rounded-lg">
                        <Tag className="h-3 w-3 mr-1" />{client.tag}
                      </Badge>
                    )}
                    {memberSince && (
                      <span className="text-xs text-muted-foreground">
                        Cliente desde {memberSince}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-2 shrink-0">
                {client.pasta_drive ? (
                  <a href={client.pasta_drive} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="rounded-xl h-9">
                      <FolderOpen className="h-4 w-4 mr-1.5" /> Drive
                      <ExternalLink className="h-3 w-3 ml-1 opacity-40" />
                    </Button>
                  </a>
                ) : client.nome_empresa && client.segmento ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl h-9"
                    onClick={handleCreateDrive}
                    disabled={creatingDrive}
                  >
                    {creatingDrive ? (
                      <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    ) : (
                      <FolderOpen className="h-4 w-4 mr-1.5" />
                    )}
                    {creatingDrive ? "Criando..." : "Criar pasta Drive"}
                  </Button>
                ) : null}
                {client.website_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl h-9"
                    onClick={handleScrapeWebsite}
                    disabled={scrapingWebsite}
                    title={client.website_context
                      ? `Contexto IA ativo (${client.website_scraped_at ? new Date(client.website_scraped_at).toLocaleDateString("pt-BR") : ""})`
                      : "Ler site para IA"}
                  >
                    {scrapingWebsite ? (
                      <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    ) : (
                      <Globe className={`h-4 w-4 mr-1.5 ${client.website_context ? "text-emerald-500" : ""}`} />
                    )}
                    {scrapingWebsite ? "Lendo..." : client.website_context ? "Contexto IA ✓" : "Ler Site"}
                  </Button>
                )}
                <Link href={`/clients/${clientId}/export`}>
                  <Button variant="outline" size="sm" className="rounded-xl h-9">
                    <FileDown className="h-4 w-4 mr-1.5" /> PDF
                  </Button>
                </Link>
                <Button variant="outline" size="sm" className="rounded-xl h-9" onClick={() => setShowEdit(true)}>
                  <Edit className="h-4 w-4 mr-1.5" /> Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className={`rounded-xl h-9 ${
                    client.status === "Ativo"
                      ? "text-muted-foreground hover:text-red-600 hover:bg-red-50 hover:border-red-200"
                      : "text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200"
                  }`}
                  onClick={handleToggleStatus}
                >
                  {client.status === "Ativo" ? (
                    <><UserMinus className="h-4 w-4 mr-1.5" /> Inativar</>
                  ) : (
                    <><UserCheck className="h-4 w-4 mr-1.5" /> Reativar</>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-xl h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-red-50 hover:border-red-200"
                  onClick={handleDelete}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Contact row */}
            <div className="flex items-center gap-5 mt-5 flex-wrap text-sm text-muted-foreground">
              {client.email && (
                <button
                  onClick={() => copyText(client.email!, "email")}
                  className="flex items-center gap-1.5 hover:text-foreground transition-colors group cursor-pointer"
                >
                  <Mail className="h-3.5 w-3.5" />
                  <span>{client.email}</span>
                  {copiedEmail ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />}
                </button>
              )}
              {client.telefone && (
                <button
                  onClick={() => copyText(client.telefone!, "phone")}
                  className="flex items-center gap-1.5 hover:text-foreground transition-colors group cursor-pointer"
                >
                  <Phone className="h-3.5 w-3.5" />
                  <span>{client.telefone}</span>
                  {copiedPhone ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />}
                </button>
              )}
              {client.cnpj_cpf && (
                <span className="flex items-center gap-1.5">
                  <Hash className="h-3.5 w-3.5" /> {client.cnpj_cpf}
                </span>
              )}
              {(client.cidade || client.estado) && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" /> {[client.cidade, client.estado].filter(Boolean).join(", ")}
                </span>
              )}
              {client.website_url && (
                <a
                  href={client.website_url.startsWith("http") ? client.website_url : `https://${client.website_url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 hover:text-foreground transition-colors group"
                >
                  <Globe className="h-3.5 w-3.5" />
                  <span>{client.website_url.replace(/^https?:\/\//, "").replace(/\/$/, "")}</span>
                  <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity" />
                </a>
              )}
            </div>
          </div>

          {/* ── Bottom: Data sections in columns ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 mt-6 border-t">
            {/* Column 1: Dados Pessoais */}
            <div className="p-6 lg:p-8 md:border-r border-b md:border-b-0">
              <div className="flex items-center gap-2 mb-4">
                <User2 className="h-4 w-4 text-blue-500" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dados Pessoais</h3>
              </div>
              <div className="space-y-0">
                <InfoLine label="Nome" value={client.nome_cliente} />
                <InfoLine label="Empresa" value={client.nome_empresa} />
                <InfoLine label="Nicho" value={client.nicho} />
                <InfoLine label="Genero" value={client.genero} />
                <InfoLine label="Aniversario" value={client.aniversario ? new Date(client.aniversario + "T12:00:00").toLocaleDateString("pt-BR") : null} />
                <InfoLine label="Canal de Venda" value={client.canal_venda} />
                {client.servicos_contratados && (
                  <div className="pt-3 mt-1">
                    <p className="text-xs text-muted-foreground mb-2">Servicos Contratados</p>
                    <div className="flex flex-wrap gap-1.5">
                      {client.servicos_contratados.split(",").map((s, i) => (
                        <Badge key={i} variant="outline" className="text-[11px] font-medium px-2 h-6 rounded-lg">
                          {s.trim()}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Column 2: Financeiro */}
            <div className="p-6 lg:p-8 lg:border-r border-b lg:border-b-0">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="h-4 w-4 text-emerald-500" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Financeiro</h3>
              </div>
              {client.valor_servico && (
                <div className="bg-emerald-50 rounded-xl p-4 mb-4">
                  <p className="text-xs text-emerald-600 font-medium mb-0.5">Valor Mensal</p>
                  <p className="text-2xl font-bold tracking-tight text-emerald-700">
                    R$ {Number(client.valor_servico).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              )}
              <div className="space-y-0">
                <InfoLine label="Dia de Pagamento" value={client.dia_pagamento ? `Dia ${client.dia_pagamento}` : null} />
                <InfoLine label="Modelo" value={client.modelo_pagamento} />
                <InfoLine label="Faturamento Medio" value={client.faturamento_medio ? `R$ ${Number(client.faturamento_medio).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : null} />
                <InfoLine label="Data Inicio" value={client.data_inicio ? new Date(client.data_inicio + "T12:00:00").toLocaleDateString("pt-BR") : null} />
                <InfoLine label="Encerramento" value={client.data_encerramento ? new Date(client.data_encerramento + "T12:00:00").toLocaleDateString("pt-BR") : null} />
              </div>
            </div>

            {/* Column 3: Endereco + Perfil */}
            <div className="p-6 lg:p-8">
              {hasAddress && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Building2 className="h-4 w-4 text-violet-500" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Endereco</h3>
                  </div>
                  <div className="space-y-0">
                    <InfoLine label="Logradouro" value={client.endereco} />
                    <InfoLine label="Numero" value={client.numero_endereco} />
                    <InfoLine label="CEP" value={client.cep} mono />
                    <InfoLine label="Cidade" value={client.cidade} />
                    <InfoLine label="Estado" value={client.estado} />
                  </div>
                </div>
              )}

              {(client.behavioral_profile || client.personality_notes) && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Perfil</h3>
                  </div>
                  {client.behavioral_profile && (
                    <InfoLine label="Tipo" value={client.behavioral_profile} />
                  )}
                  {client.personality_notes && (
                    <p className="text-sm text-muted-foreground leading-relaxed mt-2 bg-muted/30 rounded-lg p-3 border border-border/30">
                      {client.personality_notes}
                    </p>
                  )}
                </div>
              )}

              {/* If no address and no profile, show a placeholder */}
              {!hasAddress && !client.behavioral_profile && !client.personality_notes && (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">Sem informacoes adicionais</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* TABS — 100% dedicated to features                              */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <Tabs defaultValue="timeline" className="w-full">
        <div className="bg-white rounded-2xl shadow-card p-1.5 mb-6 overflow-x-auto">
          <TabsList className="bg-transparent rounded-xl h-11 w-full justify-start gap-1">
            <TabsTrigger value="timeline" className="rounded-xl data-[state=active]:shadow-sm px-4 text-sm font-medium">
              <Clock className="h-4 w-4 mr-1.5" /> Timeline
            </TabsTrigger>
            <TabsTrigger value="2fa" className="rounded-xl data-[state=active]:shadow-sm px-4 text-sm font-medium">
              <Smartphone className="h-4 w-4 mr-1.5" /> 2FA
            </TabsTrigger>
            <TabsTrigger value="credentials" className="rounded-xl data-[state=active]:shadow-sm px-4 text-sm font-medium">
              <Shield className="h-4 w-4 mr-1.5" /> Cofre
              {credentials.length > 0 && (
                <span className="ml-1.5 bg-muted text-muted-foreground text-[10px] font-semibold px-1.5 py-0.5 rounded-md">
                  {credentials.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="notes" className="rounded-xl data-[state=active]:shadow-sm px-4 text-sm font-medium">
              <StickyNote className="h-4 w-4 mr-1.5" /> Notas
              {notes.length > 0 && (
                <span className="ml-1.5 bg-muted text-muted-foreground text-[10px] font-semibold px-1.5 py-0.5 rounded-md">
                  {notes.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="meetings" className="rounded-xl data-[state=active]:shadow-sm px-4 text-sm font-medium">
              <Video className="h-4 w-4 mr-1.5" /> Reunioes
            </TabsTrigger>
            <TabsTrigger value="ads" className="rounded-xl data-[state=active]:shadow-sm px-4 text-sm font-medium">
              <BarChart3 className="h-4 w-4 mr-1.5" /> Ads
            </TabsTrigger>
            <TabsTrigger value="insights" className="rounded-xl data-[state=active]:shadow-sm px-4 text-sm font-medium">
              <Sparkles className="h-4 w-4 mr-1.5" /> Insights
            </TabsTrigger>
            <TabsTrigger value="creatives" className="rounded-xl data-[state=active]:shadow-sm px-4 text-sm font-medium">
              <Smartphone className="h-4 w-4 mr-1.5" /> Criativos
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="timeline" className="mt-0">
          <Card className="shadow-card border-transparent">
            <CardContent className="p-6">
              <ClientTimeline events={timeline} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="2fa" className="mt-0">
          <Card className="shadow-card border-transparent">
            <CardContent className="p-6">
              <TwoFactorVault clientId={clientId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="credentials" className="mt-0">
          <Card className="shadow-card border-transparent">
            <CardContent className="p-6">
              <CredentialsVault
                credentials={credentials}
                clientId={clientId}
                clientSegment={client.segmento || ""}
                onUpdate={fetchAll}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes" className="mt-0">
          <Card className="shadow-card border-transparent">
            <CardContent className="p-6">
              <ClientNotes
                clientId={clientId}
                notes={notes}
                onUpdate={fetchAll}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="meetings" className="mt-0">
          <Card className="shadow-card border-transparent">
            <CardContent className="p-6">
              <ClientMeetings clientId={clientId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ads" className="mt-0">
          <Card className="shadow-card border-transparent">
            <CardContent className="p-6">
              <ClientCampaigns clientId={clientId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="mt-0">
          <Card className="shadow-card border-transparent">
            <CardContent className="p-6">
              <ClientInsights clientId={clientId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="creatives" className="mt-0">
          <Card className="shadow-card border-transparent">
            <CardContent className="p-6">
              <ClientCreatives clientId={clientId} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ClientFormDialog
        open={showEdit}
        onOpenChange={setShowEdit}
        onSuccess={fetchAll}
        editClient={client}
      />
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════ */
/* InfoLine — Compact data row for the hero card                  */
/* ═══════════════════════════════════════════════════════════════ */
function InfoLine({ label, value, mono }: { label: string; value: string | number | null | undefined; mono?: boolean }) {
  if (!value) return null
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border/30 last:border-b-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-sm font-medium text-foreground text-right max-w-[60%] truncate ${mono ? "font-mono text-xs" : ""}`}>
        {value}
      </span>
    </div>
  )
}
