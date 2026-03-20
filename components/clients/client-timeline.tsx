"use client"

import { Badge } from "@/components/ui/badge"
import { Clock, FileText, Video, Tag, UserCog, Sparkles, Shield, FolderOpen, BarChart3, CheckCircle } from "lucide-react"
import type { HubTimelineEvent, TimelineEventType } from "@/types/database"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"

const eventConfig: Record<TimelineEventType, { icon: typeof Clock; bg: string; color: string; label: string }> = {
  note_added: { icon: FileText, bg: "bg-blue-500/10", color: "text-blue-600", label: "Nota" },
  meeting_recorded: { icon: Video, bg: "bg-emerald-500/10", color: "text-emerald-600", label: "Reuniao" },
  campaign_linked: { icon: BarChart3, bg: "bg-orange-500/10", color: "text-orange-600", label: "Campanha" },
  tag_changed: { icon: Tag, bg: "bg-violet-500/10", color: "text-violet-600", label: "Tag" },
  profile_updated: { icon: UserCog, bg: "bg-slate-500/10", color: "text-slate-600", label: "Perfil" },
  ai_insight_generated: { icon: Sparkles, bg: "bg-amber-500/10", color: "text-amber-600", label: "IA" },
  status_changed: { icon: CheckCircle, bg: "bg-emerald-500/10", color: "text-emerald-600", label: "Status" },
  ad_reviewed: { icon: BarChart3, bg: "bg-pink-500/10", color: "text-pink-600", label: "Ad Review" },
  credential_updated: { icon: Shield, bg: "bg-emerald-500/10", color: "text-emerald-600", label: "Acessos" },
  drive_folder_created: { icon: FolderOpen, bg: "bg-cyan-500/10", color: "text-cyan-600", label: "Drive" },
}

export function ClientTimeline({ events }: { events: HubTimelineEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Clock className="h-7 w-7 text-muted-foreground" />
        </div>
        <p className="font-medium">Nenhum evento na timeline</p>
        <p className="text-sm text-muted-foreground mt-1">Eventos aparecerão aqui conforme ações forem realizadas</p>
      </div>
    )
  }

  return (
    <div className="space-y-0.5">
      {events.map((event, idx) => {
        const config = eventConfig[event.event_type as TimelineEventType] || eventConfig.profile_updated
        const Icon = config.icon

        return (
          <div key={event.id} className="flex gap-4 py-3 group">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 ${config.bg} rounded-lg flex items-center justify-center shrink-0`}>
                <Icon className={`h-4 w-4 ${config.color}`} />
              </div>
              {idx < events.length - 1 && <div className="w-px flex-1 bg-border/50 mt-1" />}
            </div>
            <div className="flex-1 pb-3">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">{event.title}</p>
                <Badge variant="outline" className="text-[10px] h-5 px-1.5">{config.label}</Badge>
              </div>
              {event.description && (
                <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{event.description}</p>
              )}
              <p className="text-xs text-muted-foreground/60 mt-1">
                {formatDistanceToNow(new Date(event.created_at), { addSuffix: true, locale: ptBR })}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
