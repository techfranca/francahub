"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BarChart3, ArrowUpRight, DollarSign, Eye, TrendingUp, RefreshCw, Loader2, Settings } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { useRealtimeTable } from "@/lib/supabase/realtime"

interface Campaign {
  id: string
  meta_campaign_id: string
  name: string
  objective: string | null
  status: string | null
  product_service: string | null
  is_product_active: boolean
  client_id: string | null
  daily_budget: number | null
  hub_ad_accounts: { id: string; account_name: string | null; meta_account_id: string } | null
  hub_clients: { id: string; nome_cliente: string; nome_empresa: string | null } | null
}

const statusColors: Record<string, string> = {
  ACTIVE: "bg-emerald-500/10 text-emerald-600",
  PAUSED: "bg-amber-500/10 text-amber-600",
  DELETED: "bg-red-500/10 text-red-600",
  ARCHIVED: "bg-slate-500/10 text-slate-500",
}

export default function AdsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [clientFilter, setClientFilter] = useState("all")
  const [syncing, setSyncing] = useState(false)
  const [accounts, setAccounts] = useState<Array<{ id: string; account_name: string | null }>>([])

  const fetchCampaigns = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (clientFilter !== "all") params.set("client_id", clientFilter)

    const res = await fetch(`/api/ads/campaigns?${params}`)
    if (res.ok) setCampaigns(await res.json())
    setLoading(false)
  }, [clientFilter])

  useEffect(() => { fetchCampaigns() }, [fetchCampaigns])

  useRealtimeTable("hub_campaigns", fetchCampaigns)

  useEffect(() => {
    async function fetchAccounts() {
      const res = await fetch("/api/ads/accounts")
      if (res.ok) setAccounts(await res.json())
    }
    fetchAccounts()
  }, [])

  async function syncAll() {
    if (!accounts.length) {
      toast.error("Nenhuma conta conectada. Va em Configuracoes > Integracoes.")
      return
    }
    setSyncing(true)
    for (const acc of accounts) {
      try {
        const res = await fetch("/api/ads/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ account_id: acc.id }),
        })
        const data = await res.json()
        if (res.ok) {
          toast.success(
            `${acc.account_name || acc.id}: ${data.campaigns_synced} campanhas sincronizadas, ${data.auto_linked || 0} auto-vinculadas`
          )
        }
      } catch {
        toast.error(`Erro ao sincronizar ${acc.account_name || acc.id}`)
      }
    }
    setSyncing(false)
    fetchCampaigns()
  }

  const activeCampaigns = campaigns.filter(c => c.status === "ACTIVE").length
  const uniqueClients = new Set(campaigns.filter(c => c.client_id).map(c => c.client_id)).size

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Ads & Performance</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Campanhas Meta Ads e metricas de performance</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={syncAll} disabled={syncing} className="flex-1 sm:flex-initial h-9 border-border/60">
            {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
            Sincronizar
          </Button>
          <Link href="/settings/integrations">
            <Button variant="outline" size="icon" className="h-9 w-9 border-border/60">
              <Settings className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-border/60">
          <CardContent className="flex items-center gap-3 p-3.5">
            <div className="w-9 h-9 bg-blue-500/8 rounded-lg flex items-center justify-center ring-1 ring-blue-500/10">
              <BarChart3 className="h-[18px] w-[18px] text-blue-500" />
            </div>
            <div>
              <p className="text-xl font-bold tracking-tight tabular-nums">{campaigns.length}</p>
              <p className="text-[11px] text-muted-foreground font-medium">Total de Campanhas</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="flex items-center gap-3 p-3.5">
            <div className="w-9 h-9 bg-emerald-500/8 rounded-lg flex items-center justify-center ring-1 ring-emerald-500/10">
              <TrendingUp className="h-[18px] w-[18px] text-emerald-500" />
            </div>
            <div>
              <p className="text-xl font-bold tracking-tight tabular-nums">{activeCampaigns}</p>
              <p className="text-[11px] text-muted-foreground font-medium">Ativas</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="flex items-center gap-3 p-3.5">
            <div className="w-9 h-9 bg-violet-500/8 rounded-lg flex items-center justify-center ring-1 ring-violet-500/10">
              <Eye className="h-[18px] w-[18px] text-violet-500" />
            </div>
            <div>
              <p className="text-xl font-bold tracking-tight tabular-nums">{uniqueClients}</p>
              <p className="text-[11px] text-muted-foreground font-medium">Clientes vinculados</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex gap-2.5">
        <Select value={clientFilter} onValueChange={(v) => setClientFilter(v || "all")}>
          <SelectTrigger className="w-[200px] h-9 text-sm bg-card border-border/60">
            <SelectValue placeholder="Filtrar por cliente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os clientes</SelectItem>
            {Array.from(new Map(
              campaigns
                .filter(c => c.hub_clients)
                .map(c => [c.client_id, c.hub_clients] as const)
            )).map(([id, client]) => (
              <SelectItem key={id!} value={id!}>
                {client?.nome_empresa || client?.nome_cliente}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Campaigns list */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="border-border/60">
              <CardContent className="p-4 h-[68px]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-muted rounded-lg" />
                  <div className="flex-1">
                    <div className="h-3.5 bg-muted rounded w-1/3 mb-2" />
                    <div className="h-3 bg-muted rounded w-1/4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-12 h-12 bg-muted/80 rounded-xl flex items-center justify-center mx-auto mb-3">
            <BarChart3 className="h-6 w-6 text-muted-foreground/60" />
          </div>
          <h3 className="text-base font-semibold">Nenhuma campanha encontrada</h3>
          <p className="text-sm text-muted-foreground mt-1">Conecte uma conta Meta Ads e sincronize para ver campanhas</p>
          <Link href="/settings/integrations">
            <Button size="sm" className="mt-4">Conectar Meta Ads</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {campaigns.map((campaign) => {
            const statusClass = statusColors[campaign.status || ""] || statusColors.ARCHIVED
            const clientName = campaign.hub_clients?.nome_empresa || campaign.hub_clients?.nome_cliente

            return (
              <Link key={campaign.id} href={`/ads/${campaign.id}`}>
                <Card className="group hover:shadow-md hover:shadow-black/5 transition-all duration-200 cursor-pointer border-border/60 hover:border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-9 h-9 bg-blue-500/8 rounded-lg flex items-center justify-center shrink-0 ring-1 ring-blue-500/10">
                        <BarChart3 className="h-[18px] w-[18px] text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-semibold text-sm truncate">{campaign.name}</h3>
                          <ArrowUpRight className="h-3 w-3 text-muted-foreground/0 group-hover:text-primary transition-all duration-200 shrink-0" />
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground font-medium">
                          {clientName && <span>{clientName}</span>}
                          {campaign.objective && <span>{campaign.objective}</span>}
                          {campaign.daily_budget && (
                            <span className="flex items-center gap-0.5">
                              <DollarSign className="h-3 w-3" />
                              R$ {Number(campaign.daily_budget).toFixed(2)}/dia
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {campaign.product_service && (
                          <Badge variant="outline" className="text-[10px] font-medium px-1.5 h-5">{campaign.product_service}</Badge>
                        )}
                        <Badge className={`text-[10px] font-semibold border-0 px-1.5 h-5 ${statusClass}`}>
                          {campaign.status || "—"}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
