"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Calendar, Clock, Trash2, Users, Video } from "lucide-react"
import { TranscriptionViewer } from "@/components/meetings/transcription-viewer"
import { toast } from "sonner"
import Link from "next/link"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import type { HubTranscription } from "@/types/database"

interface MeetingDetail {
  id: string
  client_id: string
  title: string
  meeting_date: string
  duration_minutes: number | null
  google_meet_link: string | null
  status: string
  created_at: string
  hub_clients: {
    id: string
    nome_cliente: string
    nome_empresa: string | null
    segmento: string | null
  }
  hub_transcriptions: HubTranscription[]
}

const statusLabels: Record<string, string> = {
  scheduled: "Agendada",
  in_progress: "Em andamento",
  completed: "Realizada",
  transcribing: "Transcrevendo",
  transcribed: "Transcrita",
  cancelled: "Cancelada",
}

export default function MeetingDetailPage() {
  const params = useParams()
  const router = useRouter()
  const meetingId = params.id as string

  const [meeting, setMeeting] = useState<MeetingDetail | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchMeeting = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/meetings/${meetingId}`)
    if (res.ok) {
      const data = await res.json()
      setMeeting(data)
    }
    setLoading(false)
  }, [meetingId])

  useEffect(() => {
    fetchMeeting()
  }, [fetchMeeting])

  async function updateStatus(newStatus: string) {
    const res = await fetch(`/api/meetings/${meetingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    })
    if (res.ok) {
      toast.success("Status atualizado")
      fetchMeeting()
    }
  }

  async function handleDelete() {
    if (!confirm("Tem certeza que deseja excluir esta reuniao?")) return
    const res = await fetch(`/api/meetings/${meetingId}`, { method: "DELETE" })
    if (res.ok) {
      toast.success("Reuniao excluida")
      router.push("/meetings")
    }
  }

  if (loading || !meeting) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-muted rounded w-48" />
        <div className="h-48 bg-muted rounded-xl" />
      </div>
    )
  }

  const meetingDate = new Date(meeting.meeting_date)
  const transcription = meeting.hub_transcriptions?.[0] || null
  const clientName = meeting.hub_clients?.nome_empresa || meeting.hub_clients?.nome_cliente

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/meetings">
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{meeting.title}</h1>
              <Badge variant="outline">{statusLabels[meeting.status] || meeting.status}</Badge>
            </div>
            <Link
              href={`/clients/${meeting.client_id}`}
              className="text-sm text-muted-foreground hover:text-primary transition-colors mt-0.5 inline-block"
            >
              {clientName}
            </Link>
          </div>
        </div>
        <div className="flex gap-2">
          {meeting.google_meet_link && (
            <a href={meeting.google_meet_link} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                <Video className="h-4 w-4 mr-1.5" /> Google Meet
              </Button>
            </a>
          )}
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-dashed">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center shrink-0">
              <Calendar className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Data</p>
              <p className="text-sm font-medium">
                {format(meetingDate, "dd 'de' MMMM, yyyy", { locale: ptBR })}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-dashed">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-500/10 rounded-lg flex items-center justify-center shrink-0">
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Horario</p>
              <p className="text-sm font-medium">
                {format(meetingDate, "HH:mm")}
                {meeting.duration_minutes ? ` (${meeting.duration_minutes}min)` : ""}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-dashed">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center shrink-0">
              <Users className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Cliente</p>
              <Link href={`/clients/${meeting.client_id}`} className="text-sm font-medium hover:text-primary transition-colors">
                {clientName}
              </Link>
            </div>
          </CardContent>
        </Card>
        <Card className="border-dashed">
          <CardContent className="p-4">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1.5">Status</p>
            <Select value={meeting.status} onValueChange={(v) => { if (v) updateStatus(v) }}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="scheduled">Agendada</SelectItem>
                <SelectItem value="in_progress">Em andamento</SelectItem>
                <SelectItem value="completed">Realizada</SelectItem>
                <SelectItem value="transcribing">Transcrevendo</SelectItem>
                <SelectItem value="transcribed">Transcrita</SelectItem>
                <SelectItem value="cancelled">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {/* Transcription Section */}
      <TranscriptionViewer
        meetingId={meetingId}
        transcription={transcription}
        onUpdate={fetchMeeting}
      />
    </div>
  )
}
