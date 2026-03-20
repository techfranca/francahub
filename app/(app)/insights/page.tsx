"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sparkles, TrendingUp, Target, Lightbulb, X, CheckCircle, AlertTriangle, ArrowUpRight, Loader2 } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { useRealtimeTable } from "@/lib/supabase/realtime"

interface Insight {
  id: string
  client_id: string
  insight_type: string
  title: string
  content: string
  confidence: number | null
  source_data: Record<string, unknown>
  is_actionable: boolean
  is_dismissed: boolean
  created_at: string
  hub_clients: { id: string; nome_cliente: string; nome_empresa: string | null } | null
}

const typeConfig: Record<string, { icon: typeof Sparkles; label: string; color: string; bg: string }> = {
  performance_trend: { icon: TrendingUp, label: "Tendencia", color: "text-blue-500", bg: "bg-blue-500/8" },
  ad_optimization: { icon: Target, label: "Otimizacao", color: "text-emerald-500", bg: "bg-emerald-500/8" },
  meeting_correlation: { icon: Sparkles, label: "Correlacao", color: "text-violet-500", bg: "bg-violet-500/8" },
  strategic_recommendation: { icon: Lightbulb, label: "Estrategia", color: "text-amber-500", bg: "bg-amber-500/8" },
  creative_analysis: { icon: Target, label: "Criativo", color: "text-orange-500", bg: "bg-orange-500/8" },
}

export default function InsightsPage() {
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState("all")
  const [generating, setGenerating] = useState(false)
  const [clients, setClients] = useState<Array<{ id: string; nome_cliente: string; nome_empresa: string | null }>>([])
  const [selectedClient, setSelectedClient] = useState("")

  const fetchInsights = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/ai/insights?limit=100")
    if (res.ok) {
      const data = await res.json()
      setInsights(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchInsights() }, [fetchInsights])

  useRealtimeTable("hub_ai_insights", fetchInsights)

  useEffect(() => {
    async function fetchClients() {
      const res = await fetch("/api/clients")
      if (res.ok) {
        const data = await res.json()
        setClients(data.map((c: { id: string; nome_cliente: string; nome_empresa: string | null }) => ({
          id: c.id,
          nome_cliente: c.nome_cliente,
          nome_empresa: c.nome_empresa,
        })))
      }
    }
    fetchClients()
  }, [])

  async function generateInsights() {
    if (!selectedClient) {
      toast.error("Selecione um cliente para gerar insights")
      return
    }
    setGenerating(true)
    try {
      const res = await fetch("/api/ai/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: selectedClient }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`${data.insights?.length || 0} insights gerados!`)
      fetchInsights()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao gerar insights")
    } finally {
      setGenerating(false)
    }
  }

  async function generateCorrelation() {
    if (!selectedClient) {
      toast.error("Selecione um cliente para gerar correlacao")
      return
    }
    setGenerating(true)
    try {
      const res = await fetch("/api/ai/correlate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: selectedClient }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success("Analise cruzada gerada!")
      fetchInsights()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao gerar correlacao")
    } finally {
      setGenerating(false)
    }
  }

  async function dismissInsight(id: string) {
    const res = await fetch("/api/ai/insights", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, is_dismissed: true }),
    })
    if (res.ok) {
      setInsights(prev => prev.filter(i => i.id !== id))
      toast.success("Insight descartado")
    }
  }

  const filtered = typeFilter === "all"
    ? insights
    : insights.filter(i => i.insight_type === typeFilter)

  const actionableCount = insights.filter(i => i.is_actionable).length

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Insights IA</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Analises e recomendacoes geradas por inteligencia artificial</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-border/60">
          <CardContent className="flex items-center gap-3 p-3.5">
            <div className="w-9 h-9 bg-violet-500/8 rounded-lg flex items-center justify-center ring-1 ring-violet-500/10">
              <Sparkles className="h-[18px] w-[18px] text-violet-500" />
            </div>
            <div>
              <p className="text-xl font-bold tracking-tight tabular-nums">{insights.length}</p>
              <p className="text-[11px] text-muted-foreground font-medium">Total de Insights</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="flex items-center gap-3 p-3.5">
            <div className="w-9 h-9 bg-emerald-500/8 rounded-lg flex items-center justify-center ring-1 ring-emerald-500/10">
              <CheckCircle className="h-[18px] w-[18px] text-emerald-500" />
            </div>
            <div>
              <p className="text-xl font-bold tracking-tight tabular-nums">{actionableCount}</p>
              <p className="text-[11px] text-muted-foreground font-medium">Acionaveis</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="flex items-center gap-3 p-3.5">
            <div className="w-9 h-9 bg-amber-500/8 rounded-lg flex items-center justify-center ring-1 ring-amber-500/10">
              <AlertTriangle className="h-[18px] w-[18px] text-amber-500" />
            </div>
            <div>
              <p className="text-xl font-bold tracking-tight tabular-nums">
                {insights.filter(i => (i.confidence || 0) > 0.8).length}
              </p>
              <p className="text-[11px] text-muted-foreground font-medium">Alta Confianca</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card className="border-border/60">
        <CardHeader className="pb-2 px-4 pt-4">
          <CardTitle className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Gerar Novos Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <Select value={selectedClient} onValueChange={(v) => setSelectedClient(v || "")}>
              <SelectTrigger className="sm:w-[240px] h-9 text-sm bg-background border-border/60">
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
            <Button onClick={generateInsights} disabled={generating || !selectedClient} size="sm" className="h-9">
              {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <TrendingUp className="h-3.5 w-3.5 mr-1.5" />}
              Performance
            </Button>
            <Button onClick={generateCorrelation} disabled={generating || !selectedClient} size="sm" variant="outline" className="h-9 border-border/60">
              {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
              Correlacao Cruzada
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filter */}
      <div className="flex gap-2.5">
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v || "all")}>
          <SelectTrigger className="w-[180px] h-9 text-sm bg-card border-border/60">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="performance_trend">Tendencias</SelectItem>
            <SelectItem value="ad_optimization">Otimizacao</SelectItem>
            <SelectItem value="meeting_correlation">Correlacao</SelectItem>
            <SelectItem value="strategic_recommendation">Estrategia</SelectItem>
            <SelectItem value="creative_analysis">Criativos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Insights Feed */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="border-border/60">
              <CardContent className="p-4 h-20">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-muted rounded-lg" />
                  <div className="flex-1">
                    <div className="h-3.5 bg-muted rounded w-2/5 mb-2" />
                    <div className="h-3 bg-muted rounded w-3/4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-12 h-12 bg-muted/80 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Sparkles className="h-6 w-6 text-muted-foreground/60" />
          </div>
          <h3 className="text-base font-semibold">Nenhum insight gerado</h3>
          <p className="text-sm text-muted-foreground mt-1">Selecione um cliente e gere insights de performance ou correlacao</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((insight) => {
            const config = typeConfig[insight.insight_type] || typeConfig.performance_trend
            const Icon = config.icon
            const clientName = insight.hub_clients?.nome_empresa || insight.hub_clients?.nome_cliente

            return (
              <Card key={insight.id} className="group hover:shadow-md hover:shadow-black/5 transition-all duration-200 border-border/60 hover:border-border">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3.5">
                    <div className={`w-9 h-9 ${config.bg} rounded-lg flex items-center justify-center shrink-0 mt-0.5 ring-1 ring-black/[0.03]`}>
                      <Icon className={`h-[18px] w-[18px] ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <h3 className="font-semibold text-sm">{insight.title}</h3>
                        <Badge variant="outline" className="text-[10px] font-medium px-1.5 h-5">{config.label}</Badge>
                        {insight.is_actionable && (
                          <Badge className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 border-0 px-1.5 h-5">Acionavel</Badge>
                        )}
                      </div>
                      <p className="text-[13px] text-muted-foreground leading-relaxed">{insight.content}</p>
                      <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground font-medium">
                        {clientName && (
                          <Link href={`/clients/${insight.client_id}`} className="hover:text-primary transition-colors flex items-center gap-1">
                            {clientName} <ArrowUpRight className="h-3 w-3" />
                          </Link>
                        )}
                        {insight.confidence && (
                          <span>Confianca: {Math.round(insight.confidence * 100)}%</span>
                        )}
                        <span>{new Date(insight.created_at).toLocaleDateString("pt-BR")}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-muted-foreground hover:text-foreground"
                      onClick={() => dismissInsight(insight.id)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
