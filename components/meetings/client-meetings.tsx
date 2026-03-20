"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Video, Clock, ArrowUpRight, FileText } from "lucide-react"
import { MeetingFormDialog } from "@/components/meetings/meeting-form-dialog"
import Link from "next/link"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

interface Meeting {
  id: string
  title: string
  meeting_date: string
  duration_minutes: number | null
  status: string
  google_meet_link: string | null
}

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  scheduled: { label: "Agendada", variant: "outline" },
  in_progress: { label: "Em andamento", variant: "default" },
  completed: { label: "Realizada", variant: "secondary" },
  transcribing: { label: "Transcrevendo", variant: "outline" },
  transcribed: { label: "Transcrita", variant: "default" },
  cancelled: { label: "Cancelada", variant: "secondary" },
}

export function ClientMeetings({ clientId }: { clientId: string }) {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const fetchMeetings = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/meetings?client_id=${clientId}`)
    if (res.ok) {
      const data = await res.json()
      setMeetings(data)
    }
    setLoading(false)
  }, [clientId])

  useEffect(() => {
    fetchMeetings()
  }, [fetchMeetings])

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-5 h-16" />
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {meetings.length} reuniao(es) registrada(s)
        </p>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-1.5" /> Nova Reuniao
        </Button>
      </div>

      {meetings.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Video className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="font-medium">Nenhuma reuniao</p>
          <p className="text-sm text-muted-foreground mt-1">Agende a primeira reuniao com este cliente</p>
        </div>
      ) : (
        <div className="space-y-2">
          {meetings.map((meeting) => {
            const statusConfig = statusLabels[meeting.status] || statusLabels.scheduled
            const meetingDate = new Date(meeting.meeting_date)
            const hasTranscription = meeting.status === "transcribed"

            return (
              <Link key={meeting.id} href={`/meetings/${meeting.id}`}>
                <Card className="group hover:shadow-md hover:border-primary/20 transition-all duration-200 cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 bg-muted/50 rounded-xl flex flex-col items-center justify-center shrink-0 border border-border/50">
                        <span className="text-[10px] font-medium text-muted-foreground uppercase">
                          {format(meetingDate, "MMM", { locale: ptBR })}
                        </span>
                        <span className="text-sm font-bold leading-none">
                          {format(meetingDate, "dd")}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm truncate">{meeting.title}</h4>
                          <ArrowUpRight className="h-3 w-3 text-muted-foreground/30 group-hover:text-primary transition-colors shrink-0" />
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {format(meetingDate, "HH:mm")}
                          </span>
                          {meeting.duration_minutes && <span>{meeting.duration_minutes}min</span>}
                          {hasTranscription && (
                            <span className="flex items-center gap-1 text-primary">
                              <FileText className="h-3 w-3" /> Transcrita
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge variant={statusConfig.variant} className="text-xs shrink-0">
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
        preselectedClientId={clientId}
      />
    </div>
  )
}
