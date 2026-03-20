"use client"

import { useEffect, useState, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Search, Video, Calendar, Clock, FileText, ArrowUpRight, Users } from "lucide-react"
import Link from "next/link"
import { MeetingFormDialog } from "@/components/meetings/meeting-form-dialog"
import { useRealtimeTable } from "@/lib/supabase/realtime"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

interface MeetingWithClient {
  id: string
  client_id: string
  title: string
  meeting_date: string
  duration_minutes: number | null
  google_meet_link: string | null
  status: string
  hub_clients: {
    id: string
    nome_cliente: string
    nome_empresa: string | null
  }
}

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  scheduled: { label: "Agendada", variant: "outline" },
  in_progress: { label: "Em andamento", variant: "default" },
  completed: { label: "Realizada", variant: "secondary" },
  transcribing: { label: "Transcrevendo", variant: "outline" },
  transcribed: { label: "Transcrita", variant: "default" },
  cancelled: { label: "Cancelada", variant: "secondary" },
}

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<MeetingWithClient[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [showForm, setShowForm] = useState(false)

  const fetchMeetings = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (statusFilter !== "all") params.set("status", statusFilter)
    if (search) params.set("search", search)

    const res = await fetch(`/api/meetings?${params}`)
    if (res.ok) {
      const data = await res.json()
      setMeetings(data)
    }
    setLoading(false)
  }, [search, statusFilter])

  useEffect(() => {
    fetchMeetings()
  }, [fetchMeetings])

  useRealtimeTable("hub_meetings", fetchMeetings)

  const scheduledCount = meetings.filter(m => m.status === "scheduled").length
  const completedCount = meetings.filter(m => ["completed", "transcribed"].includes(m.status)).length

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reunioes</h1>
          <p className="text-muted-foreground mt-1">Repositorio de reunioes e transcricoes</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="font-semibold rounded-xl h-10 px-5">
          <Plus className="h-4 w-4 mr-2" />
          Nova Reuniao
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-card border-transparent">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center">
              <Video className="h-6 w-6 text-violet-600" />
            </div>
            <div>
              <p className="text-3xl font-bold tracking-tight tabular-nums">{meetings.length}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card border-transparent">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <Calendar className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-3xl font-bold tracking-tight tabular-nums">{scheduledCount}</p>
              <p className="text-sm text-muted-foreground">Agendadas</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card border-transparent">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
              <FileText className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-3xl font-bold tracking-tight tabular-nums">{completedCount}</p>
              <p className="text-sm text-muted-foreground">Realizadas</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por titulo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 rounded-xl bg-white"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v || "all")}>
          <SelectTrigger className="w-full sm:w-[160px] h-10 rounded-xl bg-white">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="scheduled">Agendadas</SelectItem>
            <SelectItem value="completed">Realizadas</SelectItem>
            <SelectItem value="transcribed">Transcritas</SelectItem>
            <SelectItem value="cancelled">Canceladas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Meetings list */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="border-border/60">
              <CardContent className="p-4 h-[72px]">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-muted rounded-lg" />
                  <div className="flex-1">
                    <div className="h-3.5 bg-muted rounded w-1/3 mb-2" />
                    <div className="h-3 bg-muted rounded w-1/4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : meetings.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-12 h-12 bg-muted/80 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Video className="h-6 w-6 text-muted-foreground/60" />
          </div>
          <h3 className="text-base font-semibold">Nenhuma reuniao encontrada</h3>
          <p className="text-sm text-muted-foreground mt-1">Agende sua primeira reuniao para comecar</p>
          <Button onClick={() => setShowForm(true)} size="sm" className="mt-4">
            <Plus className="h-4 w-4 mr-1.5" /> Nova Reuniao
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {meetings.map((meeting) => {
            const statusConfig = statusLabels[meeting.status] || statusLabels.scheduled
            const meetingDate = new Date(meeting.meeting_date)
            const clientName = meeting.hub_clients?.nome_empresa || meeting.hub_clients?.nome_cliente || "—"

            return (
              <Link key={meeting.id} href={`/meetings/${meeting.id}`}>
                <Card className="group cursor-pointer shadow-card hover:shadow-card-hover transition-all duration-200 border-transparent hover:border-primary/20">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Date block */}
                      <div className="w-12 h-12 bg-muted rounded-xl flex flex-col items-center justify-center shrink-0">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase leading-none">
                          {format(meetingDate, "MMM", { locale: ptBR })}
                        </span>
                        <span className="text-base font-bold leading-tight mt-0.5">
                          {format(meetingDate, "dd")}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-semibold text-sm truncate">{meeting.title}</h3>
                          <ArrowUpRight className="h-3 w-3 text-muted-foreground/0 group-hover:text-primary transition-all duration-200 shrink-0" />
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground font-medium">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" /> {clientName}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {format(meetingDate, "HH:mm")}
                          </span>
                          {meeting.duration_minutes && (
                            <span>{meeting.duration_minutes}min</span>
                          )}
                        </div>
                      </div>

                      {/* Status badge */}
                      <Badge variant={statusConfig.variant} className="shrink-0 text-[10px] font-semibold px-1.5 h-5">
                        {statusConfig.label}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}

      <MeetingFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        onSuccess={fetchMeetings}
      />
    </div>
  )
}
