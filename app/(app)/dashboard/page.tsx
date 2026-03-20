import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, UserCheck, Video, BarChart3, Sparkles, ArrowUpRight, TrendingUp, Target, Lightbulb } from "lucide-react"
import Link from "next/link"

const insightIcons: Record<string, { icon: typeof Sparkles; color: string; bg: string }> = {
  performance_trend: { icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-100" },
  ad_optimization: { icon: Target, color: "text-emerald-600", bg: "bg-emerald-100" },
  meeting_correlation: { icon: Sparkles, color: "text-violet-600", bg: "bg-violet-100" },
  strategic_recommendation: { icon: Lightbulb, color: "text-amber-600", bg: "bg-amber-100" },
  creative_analysis: { icon: Target, color: "text-orange-600", bg: "bg-orange-100" },
}

export default async function DashboardPage() {
  const supabase = createClient()

  const [
    { count: totalClients },
    { count: activeClients },
    { count: totalMeetings },
    { count: activeCampaigns },
    { data: recentInsights },
  ] = await Promise.all([
    supabase.from("hub_clients").select("*", { count: "exact", head: true }),
    supabase.from("hub_clients").select("*", { count: "exact", head: true }).eq("status", "Ativo"),
    supabase.from("hub_meetings").select("*", { count: "exact", head: true }),
    supabase.from("hub_campaigns").select("*", { count: "exact", head: true }).eq("status", "ACTIVE"),
    supabase
      .from("hub_ai_insights")
      .select("id, insight_type, title, content, is_actionable, created_at, hub_clients(id, nome_cliente, nome_empresa)")
      .eq("is_dismissed", false)
      .order("created_at", { ascending: false })
      .limit(5),
  ])

  const stats = [
    {
      title: "Total Clientes",
      value: totalClients ?? 0,
      icon: Users,
      href: "/clients",
      color: "text-emerald-600",
      bg: "bg-emerald-100",
      change: null,
    },
    {
      title: "Clientes Ativos",
      value: activeClients ?? 0,
      icon: UserCheck,
      href: "/clients?status=Ativo",
      color: "text-blue-600",
      bg: "bg-blue-100",
      change: null,
    },
    {
      title: "Reunioes",
      value: totalMeetings ?? 0,
      icon: Video,
      href: "/meetings",
      color: "text-violet-600",
      bg: "bg-violet-100",
      change: null,
    },
    {
      title: "Campanhas Ativas",
      value: activeCampaigns ?? 0,
      icon: BarChart3,
      href: "/ads",
      color: "text-amber-600",
      bg: "bg-amber-100",
      change: null,
    },
  ]

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Bem-vindo de volta</h1>
        <p className="text-muted-foreground mt-1">Aqui esta o resumo do seu painel</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="group cursor-pointer shadow-card hover:shadow-card-hover transition-all duration-200 border-transparent hover:border-border/50">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                </div>
                <p className="text-3xl font-bold tracking-tight tabular-nums">{stat.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{stat.title}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Ads summary */}
        <Card className="shadow-card border-transparent">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-3">
              <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-amber-600" />
              </div>
              Performance de Ads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-8 mb-5">
              <div>
                <p className="text-3xl font-bold tabular-nums">{activeCampaigns ?? 0}</p>
                <p className="text-sm text-muted-foreground mt-0.5">Campanhas ativas</p>
              </div>
              <div className="h-10 w-px bg-border" />
              <div>
                <p className="text-3xl font-bold tabular-nums">{totalClients ?? 0}</p>
                <p className="text-sm text-muted-foreground mt-0.5">Clientes</p>
              </div>
            </div>
            <Link
              href="/ads"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              Ver campanhas <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </CardContent>
        </Card>

        {/* AI Insights */}
        <Card className="shadow-card border-transparent">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-3">
                <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-violet-600" />
                </div>
                Insights IA
              </CardTitle>
              <Link href="/insights" className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
                Ver todos <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentInsights && recentInsights.length > 0 ? (
              <div className="space-y-4">
                {recentInsights.slice(0, 3).map((insight) => {
                  const config = insightIcons[insight.insight_type] || insightIcons.performance_trend
                  const Icon = config.icon
                  const clientData = insight.hub_clients as unknown as { id: string; nome_cliente: string; nome_empresa: string | null } | null
                  return (
                    <div key={insight.id} className="flex items-start gap-3">
                      <div className={`w-8 h-8 ${config.bg} rounded-lg flex items-center justify-center shrink-0`}>
                        <Icon className={`h-4 w-4 ${config.color}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{insight.title}</p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{clientData?.nome_empresa || clientData?.nome_cliente}</p>
                      </div>
                      {insight.is_actionable && (
                        <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-0 shrink-0 font-semibold px-2 h-5 hover:bg-emerald-100">Acao</Badge>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhum insight gerado ainda. Gere insights na pagina de{" "}
                <Link href="/insights" className="text-primary hover:underline font-medium">Insights IA</Link>.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
