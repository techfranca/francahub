"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sparkles, TrendingUp, Target, Lightbulb, X, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface Insight {
  id: string
  insight_type: string
  title: string
  content: string
  confidence: number | null
  is_actionable: boolean
  created_at: string
}

const typeConfig: Record<string, { icon: typeof Sparkles; color: string; bg: string }> = {
  performance_trend: { icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-500/10" },
  ad_optimization: { icon: Target, color: "text-emerald-600", bg: "bg-emerald-500/10" },
  meeting_correlation: { icon: Sparkles, color: "text-violet-600", bg: "bg-violet-500/10" },
  strategic_recommendation: { icon: Lightbulb, color: "text-amber-600", bg: "bg-amber-500/10" },
  creative_analysis: { icon: Target, color: "text-orange-600", bg: "bg-orange-500/10" },
}

export function ClientInsights({ clientId }: { clientId: string }) {
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState<string | null>(null)

  useEffect(() => {
    async function fetch_() {
      const res = await fetch(`/api/ai/insights?client_id=${clientId}`)
      if (res.ok) setInsights(await res.json())
      setLoading(false)
    }
    fetch_()
  }, [clientId])

  async function generate(type: "performance" | "correlation") {
    setGenerating(type)
    try {
      const url = type === "performance" ? "/api/ai/insights" : "/api/ai/correlate"
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: clientId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(type === "performance" ? "Insights de performance gerados!" : "Analise cruzada gerada!")

      // Refresh
      const updated = await fetch(`/api/ai/insights?client_id=${clientId}`)
      if (updated.ok) setInsights(await updated.json())
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao gerar")
    } finally {
      setGenerating(null)
    }
  }

  async function dismiss(id: string) {
    await fetch("/api/ai/insights", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, is_dismissed: true }),
    })
    setInsights(prev => prev.filter(i => i.id !== id))
  }

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-muted rounded-lg" />)}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Generate buttons */}
      <div className="flex gap-2">
        <Button onClick={() => generate("performance")} disabled={!!generating} size="sm">
          {generating === "performance" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <TrendingUp className="h-4 w-4 mr-2" />}
          Gerar Insights de Performance
        </Button>
        <Button onClick={() => generate("correlation")} disabled={!!generating} size="sm" variant="outline">
          {generating === "correlation" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
          Analise Cruzada
        </Button>
      </div>

      {/* Insights list */}
      {insights.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Sparkles className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="font-medium">Nenhum insight ainda</p>
          <p className="text-sm text-muted-foreground mt-1">Gere insights de performance ou analise cruzada</p>
        </div>
      ) : (
        <div className="space-y-2">
          {insights.map((insight) => {
            const config = typeConfig[insight.insight_type] || typeConfig.performance_trend
            const Icon = config.icon
            return (
              <Card key={insight.id} className="group">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 ${config.bg} rounded-lg flex items-center justify-center shrink-0 mt-0.5`}>
                      <Icon className={`h-4 w-4 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h4 className="font-medium text-sm">{insight.title}</h4>
                        {insight.is_actionable && (
                          <Badge className="text-[10px] bg-emerald-500/10 text-emerald-700 border-0">Acionavel</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{insight.content}</p>
                      <p className="text-[11px] text-muted-foreground/60 mt-1">
                        {new Date(insight.created_at).toLocaleDateString("pt-BR")}
                        {insight.confidence ? ` · ${Math.round(insight.confidence * 100)}% confianca` : ""}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      onClick={() => dismiss(insight.id)}
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
