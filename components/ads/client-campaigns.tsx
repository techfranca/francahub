"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BarChart3, DollarSign, Eye, ArrowUpRight } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

interface ClientCampaign {
  id: string
  name: string
  status: string | null
  objective: string | null
  product_service: string | null
  daily_budget: number | null
}

const statusColors: Record<string, string> = {
  ACTIVE: "bg-emerald-500/10 text-emerald-700",
  PAUSED: "bg-amber-500/10 text-amber-700",
  DELETED: "bg-red-500/10 text-red-700",
  ARCHIVED: "bg-slate-500/10 text-slate-600",
}

export function ClientCampaigns({ clientId }: { clientId: string }) {
  const [campaigns, setCampaigns] = useState<ClientCampaign[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCampaigns() {
      const supabase = createClient()
      const { data } = await supabase
        .from("hub_campaigns")
        .select("id, name, status, objective, product_service, daily_budget")
        .eq("client_id", clientId)
        .order("status")
        .order("name")

      setCampaigns(data || [])
      setLoading(false)
    }
    fetchCampaigns()
  }, [clientId])

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 bg-muted rounded-lg" />
        ))}
      </div>
    )
  }

  if (campaigns.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
          <BarChart3 className="h-7 w-7 text-muted-foreground" />
        </div>
        <p className="font-medium">Nenhuma campanha vinculada</p>
        <p className="text-sm text-muted-foreground mt-1">
          Vincule campanhas a este cliente na pagina de{" "}
          <Link href="/ads" className="text-primary hover:underline">Ads</Link>
        </p>
      </div>
    )
  }

  const active = campaigns.filter(c => c.status === "ACTIVE").length

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-dashed">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <BarChart3 className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-lg font-bold">{campaigns.length}</p>
              <p className="text-[11px] text-muted-foreground">Campanhas</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-dashed">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center">
              <Eye className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-lg font-bold">{active}</p>
              <p className="text-[11px] text-muted-foreground">Ativas</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaign List */}
      <div className="space-y-2">
        {campaigns.map((campaign) => {
          const statusClass = statusColors[campaign.status || ""] || statusColors.ARCHIVED
          return (
            <Link key={campaign.id} href={`/ads/${campaign.id}`}>
              <Card className="group hover:shadow-md hover:border-primary/20 transition-all duration-200 cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-blue-500/10 rounded-lg flex items-center justify-center shrink-0">
                      <BarChart3 className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm truncate">{campaign.name}</h3>
                        <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-primary transition-colors shrink-0" />
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                        {campaign.objective && <span>{campaign.objective}</span>}
                        {campaign.daily_budget && (
                          <span className="flex items-center gap-0.5">
                            <DollarSign className="h-3 w-3" />
                            R$ {Number(campaign.daily_budget).toFixed(2)}/dia
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {campaign.product_service && (
                        <Badge variant="outline" className="text-xs">{campaign.product_service}</Badge>
                      )}
                      <Badge className={`text-xs border-0 ${statusClass}`}>
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
    </div>
  )
}
