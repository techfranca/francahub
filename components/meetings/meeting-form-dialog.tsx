"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"

interface ClientOption {
  id: string
  nome_cliente: string
  nome_empresa: string | null
}

interface MeetingFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  preselectedClientId?: string | null
}

export function MeetingFormDialog({ open, onOpenChange, onSuccess, preselectedClientId }: MeetingFormDialogProps) {
  const [loading, setLoading] = useState(false)
  const [clients, setClients] = useState<ClientOption[]>([])
  const [form, setForm] = useState({
    client_id: preselectedClientId || "",
    title: "",
    meeting_date: "",
    meeting_time: "",
    duration_minutes: "60",
    google_meet_link: "",
    status: "scheduled",
  })

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
    if (open) fetchClients()
  }, [open])

  useEffect(() => {
    if (preselectedClientId) {
      setForm(prev => ({ ...prev, client_id: preselectedClientId }))
    }
  }, [preselectedClientId])

  function updateField(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.client_id || !form.title || !form.meeting_date) {
      toast.error("Preencha cliente, titulo e data")
      return
    }

    setLoading(true)

    try {
      const meetingDate = form.meeting_time
        ? `${form.meeting_date}T${form.meeting_time}:00`
        : `${form.meeting_date}T09:00:00`

      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: form.client_id,
          title: form.title,
          meeting_date: meetingDate,
          duration_minutes: parseInt(form.duration_minutes) || 60,
          google_meet_link: form.google_meet_link || null,
          status: form.status,
        }),
      })

      if (!res.ok) throw new Error("Erro ao salvar")

      toast.success("Reuniao criada!")
      onOpenChange(false)
      setForm({
        client_id: preselectedClientId || "",
        title: "",
        meeting_date: "",
        meeting_time: "",
        duration_minutes: "60",
        google_meet_link: "",
        status: "scheduled",
      })
      onSuccess()
    } catch {
      toast.error("Erro ao criar reuniao")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Reuniao</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label className="text-xs font-medium">Cliente *</Label>
            <Select value={form.client_id} onValueChange={(v) => updateField("client_id", v || "")}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o cliente" />
              </SelectTrigger>
              <SelectContent>
                {clients.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome_empresa || c.nome_cliente}
                    {c.nome_empresa ? ` (${c.nome_cliente})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium">Titulo da Reuniao *</Label>
            <Input
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
              placeholder="Ex: Alinhamento mensal, Kickoff do projeto..."
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Data *</Label>
              <Input
                type="date"
                value={form.meeting_date}
                onChange={(e) => updateField("meeting_date", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Horario</Label>
              <Input
                type="time"
                value={form.meeting_time}
                onChange={(e) => updateField("meeting_time", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Duracao (min)</Label>
              <Input
                type="number"
                min="15"
                step="15"
                value={form.duration_minutes}
                onChange={(e) => updateField("duration_minutes", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Status</Label>
              <Select value={form.status} onValueChange={(v) => updateField("status", v || "scheduled")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Agendada</SelectItem>
                  <SelectItem value="completed">Realizada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium">Link do Google Meet</Label>
            <Input
              value={form.google_meet_link}
              onChange={(e) => updateField("google_meet_link", e.target.value)}
              placeholder="https://meet.google.com/..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="font-semibold min-w-[120px]">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Criar Reuniao
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
