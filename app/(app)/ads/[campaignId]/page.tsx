"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { ArrowLeft, DollarSign, Eye, MousePointer, Target, Users } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { CreativeAnalyzer } from "@/components/ads/creative-analyzer"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts"

interface CampaignDetail {
  id: string
  name: string
  objective: string | null
  status: string | null
  client_id: string | null
  product_service: string | null
  is_product_active: boolean
  daily_budget: number | null
  hub_clients: { id: string; nome_cliente: string; nome_empresa: string | null } | null
}

interface DailyMetric {
  date: string
  impressions: number
  clicks: number
  spend: number
  conversions: number
  cpc: number | null
  ctr: number | null
  reach: number
}

interface Totals {
  impressions: number
  clicks: number
  spend: number
  conversions: number
  reach: number
  cpc: number
  ctr: number
  cpm: number
}

export default function CampaignDetailPage() {
  const params = useParams()
  const campaignId = params.campaignId as string

  const [campaign, setCampaign] = useState<CampaignDetail | null>(null)
  const [daily, setDaily] = useState<DailyMetric[]>([])
  const [totals, setTotals] = useState<Totals | null>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState("30")
  const [clients, setClients] = useState<Array<{ id: string; nome_cliente: string; nome_empresa: string | null }>>([])
  const [productService, setProductService] = useState("")

  const fetchData = useCallback(async () => {
    setLoading(true)

    // Fetch campaign detail
    const supabase = createClient()
    const { data: camp } = await supabase
      .from("hub_campaigns")
      .select("*, hub_clients(id, nome_cliente, nome_empresa)")
      .eq("id", campaignId)
      .single()

    if (camp) {
      setCampaign(camp)
      setProductService(camp.product_service || "")
    }

    // Fetch metrics
    const metricsRes = await fetch(`/api/ads/campaigns/${campaignId}/metrics?days=${days}`)
    if (metricsRes.ok) {
      const metricsData = await metricsRes.json()
      setDaily(metricsData.daily || [])
      setTotals(metricsData.totals || null)
    }

    setLoading(false)
  }, [campaignId, days])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    async function fetchClients() {
      const supabase = createClient()
      const { data } = await supabase
        .from("hub_clients")
        .select("id, nome_cliente, nome_empresa")
        .eq("status", "Ativo")
        .order("nome_cliente")
      setClients(data || [])
    }
    fetchClients()
  }, [])

  async function linkClient(clientId: string) {
    const res = await fetch("/api/ads/campaigns", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: campaignId, client_id: clientId || null }),
    })
    if (res.ok) {
      toast.success("Cliente vinculado!")
      fetchData()
    }
  }

  async function saveProduct() {
    const res = await fetch("/api/ads/campaigns", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: campaignId, product_service: productService }),
    })
    if (res.ok) toast.success("Produto/servico atualizado!")
  }

  if (loading || !campaign) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-muted rounded w-48" />
        <div className="h-64 bg-muted rounded-xl" />
      </div>
    )
  }

  const clientName = campaign.hub_clients?.nome_empresa || campaign.hub_clients?.nome_cliente
  const chartData = daily.map(d => ({
    date: d.date.slice(5), // MM-DD
    spend: Number(d.spend),
    clicks: d.clicks,
    impressions: d.impressions,
  }))

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/ads">
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{campaign.name}</h1>
              <Badge variant="outline" className="text-xs">{campaign.status}</Badge>
            </div>
            {clientName && (
              <Link href={`/clients/${campaign.client_id}`} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                {clientName}
              </Link>
            )}
          </div>
        </div>
        <Select value={days} onValueChange={(v) => { if (v) setDays(v) }}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 dias</SelectItem>
            <SelectItem value="14">14 dias</SelectItem>
            <SelectItem value="30">30 dias</SelectItem>
            <SelectItem value="60">60 dias</SelectItem>
            <SelectItem value="90">90 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      {totals && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <MetricCard icon={DollarSign} label="Investimento" value={`R$ ${totals.spend.toFixed(2)}`} color="emerald" />
          <MetricCard icon={Eye} label="Impressoes" value={totals.impressions.toLocaleString("pt-BR")} color="blue" />
          <MetricCard icon={MousePointer} label="Cliques" value={totals.clicks.toLocaleString("pt-BR")} color="violet" />
          <MetricCard icon={Target} label="CTR" value={`${totals.ctr.toFixed(2)}%`} color="amber" />
          <MetricCard icon={DollarSign} label="CPC" value={`R$ ${totals.cpc.toFixed(2)}`} color="orange" />
          <MetricCard icon={Users} label="Alcance" value={totals.reach.toLocaleString("pt-BR")} color="cyan" />
        </div>
      )}

      {/* Spend chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Investimento Diario (R$)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }}
                    formatter={(value) => [`R$ ${Number(value).toFixed(2)}`, "Investimento"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="spend"
                    stroke="#22c55e"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorSpend)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Vincular Cliente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={campaign.client_id || ""} onValueChange={(v) => linkClient(v || "")}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um cliente" />
              </SelectTrigger>
              <SelectContent>
                {clients.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome_empresa || c.nome_cliente}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Produto / Servico
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                value={productService}
                onChange={(e) => setProductService(e.target.value)}
                placeholder="Ex: Pacote Premium, Curso X..."
              />
              <Button onClick={saveProduct} size="sm" variant="outline">Salvar</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Creative Analyzer */}
      <CreativeAnalyzer campaignId={campaignId} />
    </div>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof DollarSign
  label: string
  value: string
  color: string
}) {
  const bgMap: Record<string, string> = {
    emerald: "bg-emerald-500/10",
    blue: "bg-blue-500/10",
    violet: "bg-violet-500/10",
    amber: "bg-amber-500/10",
    orange: "bg-orange-500/10",
    cyan: "bg-cyan-500/10",
  }
  const textMap: Record<string, string> = {
    emerald: "text-emerald-600",
    blue: "text-blue-600",
    violet: "text-violet-600",
    amber: "text-amber-600",
    orange: "text-orange-600",
    cyan: "text-cyan-600",
  }

  return (
    <Card className="border-dashed">
      <CardContent className="p-3">
        <div className={`w-7 h-7 ${bgMap[color]} rounded-lg flex items-center justify-center mb-2`}>
          <Icon className={`h-3.5 w-3.5 ${textMap[color]}`} />
        </div>
        <p className="text-lg font-bold tracking-tight">{value}</p>
        <p className="text-[11px] text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  )
}
