"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  BarChart3,
  CheckCircle,
  Clock,
  FileText,
  Filter,
  FolderOpen,
  Shield,
  Sparkles,
  Tag,
  UserCog,
  Video,
} from "lucide-react"
import type { HubTimelineEvent, TimelineEventType } from "@/types/database"
import { format, formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"

const eventConfig: Record<
  TimelineEventType,
  { icon: typeof Clock; bg: string; color: string; label: string; dotColor: string }
> = {
  note_added: { icon: FileText, bg: "bg-blue-500/10", color: "text-blue-600", label: "Nota", dotColor: "bg-blue-500" },
  meeting_recorded: { icon: Video, bg: "bg-emerald-500/10", color: "text-emerald-600", label: "Reuniao", dotColor: "bg-emerald-500" },
  campaign_linked: { icon: BarChart3, bg: "bg-orange-500/10", color: "text-orange-600", label: "Campanha", dotColor: "bg-orange-500" },
  tag_changed: { icon: Tag, bg: "bg-violet-500/10", color: "text-violet-600", label: "Tag", dotColor: "bg-violet-500" },
  profile_updated: { icon: UserCog, bg: "bg-slate-500/10", color: "text-slate-600", label: "Perfil", dotColor: "bg-slate-400" },
  ai_insight_generated: { icon: Sparkles, bg: "bg-amber-500/10", color: "text-amber-600", label: "IA", dotColor: "bg-amber-500" },
  status_changed: { icon: CheckCircle, bg: "bg-emerald-500/10", color: "text-emerald-600", label: "Status", dotColor: "bg-emerald-500" },
  ad_reviewed: { icon: BarChart3, bg: "bg-pink-500/10", color: "text-pink-600", label: "Ad Review", dotColor: "bg-pink-500" },
  credential_updated: { icon: Shield, bg: "bg-emerald-500/10", color: "text-emerald-600", label: "Acessos", dotColor: "bg-emerald-400" },
  drive_folder_created: { icon: FolderOpen, bg: "bg-cyan-500/10", color: "text-cyan-600", label: "Drive", dotColor: "bg-cyan-500" },
}

export function ClientTimeline({ events }: { events: HubTimelineEvent[] }) {
  const [activeFilter, setActiveFilter] = useState<TimelineEventType | null>(null)

  const counts = events.reduce<Record<string, number>>((acc, event) => {
    acc[event.event_type] = (acc[event.event_type] || 0) + 1
    return acc
  }, {})

  const filteredEvents = activeFilter
    ? events.filter((event) => event.event_type === activeFilter)
    : events

  const presentTypes = Object.keys(counts) as TimelineEventType[]
  const latestEvent = filteredEvents[0] || events[0] || null

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[24px] border border-slate-200/70 bg-[radial-gradient(circle_at_top_left,rgba(148,163,184,0.18),transparent_50%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.94))] p-5 lg:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-500/10">
                <Clock className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold tracking-tight">Timeline operacional</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Veja tudo o que aconteceu com este cliente em um fluxo mais legivel e sem desperdiçar largura.
                </p>
                {activeFilter && (
                  <p className="mt-2 text-xs font-medium text-slate-600">
                    Filtro ativo: {eventConfig[activeFilter]?.label}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[380px]">
            <MetricCard label="Exibindo" value={String(filteredEvents.length)} tone="slate" />
            <MetricCard label="Categorias" value={String(presentTypes.length)} tone="violet" />
            <MetricCard
              label="Ultimo registro"
              value={latestEvent ? format(new Date(latestEvent.created_at), "dd/MM/yy", { locale: ptBR }) : "--"}
              tone="emerald"
            />
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-white/80 bg-white/80 p-3 shadow-sm shadow-slate-950/5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              <Filter className="h-3.5 w-3.5" />
              Filtrar eventos
            </div>
            {activeFilter && (
              <Button variant="ghost" size="sm" className="h-8 w-fit text-xs" onClick={() => setActiveFilter(null)}>
                Limpar filtro
              </Button>
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <FilterPill
              label="Todos"
              count={events.length}
              active={!activeFilter}
              onClick={() => setActiveFilter(null)}
            />
            {presentTypes.map((type) => {
              const config = eventConfig[type] || eventConfig.profile_updated

              return (
                <FilterPill
                  key={type}
                  label={config.label}
                  count={counts[type]}
                  icon={config.icon}
                  iconClassName={config.color}
                  active={activeFilter === type}
                  onClick={() => setActiveFilter(activeFilter === type ? null : type)}
                />
              )
            })}
          </div>
        </div>
      </div>

      {filteredEvents.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[24px] border border-dashed border-border/60 bg-muted/20 px-6 py-16 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-500/10">
            <Clock className="h-6 w-6 text-slate-600/70" />
          </div>
          <p className="text-base font-medium text-foreground">
            {activeFilter ? "Nenhum evento corresponde a este filtro" : "Nenhum evento registrado ainda"}
          </p>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            {activeFilter
              ? "Tente outra categoria ou limpe o filtro para voltar ao panorama completo."
              : "As atualizacoes do cliente vao aparecer aqui conforme o time trabalhar."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {filteredEvents.map((event) => {
            const config = eventConfig[event.event_type as TimelineEventType] || eventConfig.profile_updated
            const Icon = config.icon

            return (
              <div
                key={event.id}
                className="rounded-[22px] border border-border/60 bg-white p-4 shadow-sm shadow-slate-950/5 transition-all duration-200 hover:border-border hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${config.bg}`}>
                    <Icon className={`h-4 w-4 ${config.color}`} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{event.title}</p>
                      <Badge variant="outline" className="h-5 rounded-full px-2 text-[10px]">
                        {config.label}
                      </Badge>
                    </div>

                    {event.description && (
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {event.description}
                      </p>
                    )}
                  </div>

                  <div className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${config.dotColor}`} />
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-3 text-xs text-muted-foreground">
                  <span>{formatDistanceToNow(new Date(event.created_at), { addSuffix: true, locale: ptBR })}</span>
                  <span>{format(new Date(event.created_at), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
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
  tone: "slate" | "violet" | "emerald"
}) {
  const toneClass =
    tone === "violet"
      ? "bg-violet-500/10 text-violet-700"
      : tone === "emerald"
        ? "bg-emerald-500/10 text-emerald-700"
        : "bg-slate-500/10 text-slate-700"

  return (
    <div className="rounded-2xl border border-white/70 bg-white/85 px-4 py-3 shadow-sm shadow-slate-950/5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-sm font-semibold ${toneClass}`}>
        {value}
      </p>
    </div>
  )
}

function FilterPill({
  label,
  count,
  active,
  onClick,
  icon: Icon,
  iconClassName,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
  icon?: typeof Clock
  iconClassName?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition-all ${
        active
          ? "border-foreground bg-foreground text-background shadow-sm"
          : "border-border/60 bg-background text-muted-foreground hover:border-foreground/20 hover:text-foreground"
      }`}
    >
      {Icon && <Icon className={`h-3.5 w-3.5 ${active ? "text-background" : iconClassName || "text-foreground"}`} />}
      <span>{label}</span>
      <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${active ? "bg-white/15" : "bg-muted"}`}>
        {count}
      </span>
    </button>
  )
}
