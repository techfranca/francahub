"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Pin, PinOff, Send, StickyNote, Trash2 } from "lucide-react"
import type { HubNote } from "@/types/database"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"

interface ClientNotesProps {
  clientId: string
  notes: HubNote[]
  onUpdate: () => void
}

export function ClientNotes({ clientId, notes, onUpdate }: ClientNotesProps) {
  const [newNote, setNewNote] = useState("")
  const [sending, setSending] = useState(false)

  const pinnedNotes = notes.filter((note) => note.is_pinned)
  const regularNotes = notes.filter((note) => !note.is_pinned)

  async function addNote() {
    if (!newNote.trim()) return

    setSending(true)

    const response = await fetch(`/api/clients/${clientId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newNote }),
    })

    if (response.ok) {
      setNewNote("")
      toast.success("Nota adicionada")
      onUpdate()
    }

    setSending(false)
  }

  async function togglePin(noteId: string, currentlyPinned: boolean) {
    await fetch(`/api/clients/${clientId}/notes/${noteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_pinned: !currentlyPinned }),
    })
    onUpdate()
  }

  async function deleteNote(noteId: string) {
    if (!confirm("Excluir esta nota?")) return
    await fetch(`/api/clients/${clientId}/notes/${noteId}`, { method: "DELETE" })
    toast.success("Nota excluida")
    onUpdate()
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[24px] border border-blue-200/70 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_50%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(239,246,255,0.94))] p-5 lg:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-500/10">
                <StickyNote className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold tracking-tight">Notas do cliente</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Escreva uma observacao no topo e acompanhe as notas em uma grade mais larga, sem empilhar tudo num cantinho.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[380px]">
            <MetricCard label="Total" value={String(notes.length)} tone="blue" />
            <MetricCard label="Fixadas" value={String(pinnedNotes.length)} tone="amber" />
            <MetricCard label="Recentes" value={String(regularNotes.length)} tone="slate" />
          </div>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-12">
          <div className="space-y-1.5 xl:col-span-8">
            <label className="text-xs font-medium">Nova nota</label>
            <Textarea
              placeholder="Escreva uma observacao importante sobre este cliente..."
              value={newNote}
              onChange={(event) => setNewNote(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) addNote()
              }}
              className="min-h-[180px] rounded-[22px] border-white/70 bg-white text-sm shadow-sm shadow-blue-950/5"
            />
          </div>

          <div className="flex flex-col justify-between rounded-[22px] border border-white/70 bg-white/85 p-4 shadow-sm shadow-blue-950/5 xl:col-span-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                Fluxo rapido
              </p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Registre contexto logo no topo, fixe o que for importante e deixe o restante seguir como historico recente.
              </p>
            </div>

            <div className="mt-6 space-y-3">
              <Button onClick={addNote} disabled={sending || !newNote.trim()} className="h-11 w-full rounded-2xl">
                {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Adicionar nota
              </Button>
              <p className="text-center text-[11px] text-muted-foreground">
                Ctrl+Enter para enviar rapidamente
              </p>
            </div>
          </div>
        </div>
      </div>

      {notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[24px] border border-dashed border-border/60 bg-muted/20 px-6 py-16 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10">
            <StickyNote className="h-6 w-6 text-blue-600/70" />
          </div>
          <p className="text-base font-medium text-foreground">Nenhuma nota registrada ainda</p>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            A area de composicao ja esta pronta acima, entao o proximo comentario importante pode entrar sem perder largura util.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {pinnedNotes.length > 0 && (
            <section className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10">
                    <Pin className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold">Notas fixadas</h4>
                    <p className="text-xs text-muted-foreground">O que precisa ficar sempre visivel para o time</p>
                  </div>
                </div>
                <span className="w-fit rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                  {pinnedNotes.length} item(ns)
                </span>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {pinnedNotes.map((note) => (
                  <NoteCard key={note.id} note={note} onPin={togglePin} onDelete={deleteNote} />
                ))}
              </div>
            </section>
          )}

          {regularNotes.length > 0 && (
            <section className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-500/10">
                    <StickyNote className="h-4 w-4 text-slate-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold">Notas recentes</h4>
                    <p className="text-xs text-muted-foreground">Historico de contexto e observacoes do cliente</p>
                  </div>
                </div>
                <span className="w-fit rounded-full bg-slate-500/10 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                  {regularNotes.length} item(ns)
                </span>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {regularNotes.map((note) => (
                  <NoteCard key={note.id} note={note} onPin={togglePin} onDelete={deleteNote} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

function NoteCard({
  note,
  onPin,
  onDelete,
}: {
  note: HubNote
  onPin: (id: string, pinned: boolean) => void
  onDelete: (id: string) => void
}) {
  return (
    <div
      className={`group rounded-[22px] border p-4 shadow-sm shadow-slate-950/5 transition-all duration-200 hover:shadow-md ${
        note.is_pinned
          ? "border-amber-200/80 bg-amber-50/70"
          : "border-border/60 bg-white hover:border-border"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {note.is_pinned && (
            <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-700">
              <Pin className="h-3 w-3" />
              Fixada
            </div>
          )}

          <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">{note.content}</p>
          <p className="mt-3 text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(note.created_at), { addSuffix: true, locale: ptBR })}
          </p>
        </div>

        <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            className="rounded-lg border border-border/60 p-2 transition-colors hover:bg-muted"
            onClick={() => onPin(note.id, note.is_pinned)}
            title={note.is_pinned ? "Desafixar" : "Fixar"}
          >
            {note.is_pinned ? <PinOff className="h-3.5 w-3.5 text-muted-foreground" /> : <Pin className="h-3.5 w-3.5 text-muted-foreground" />}
          </button>

          <button
            type="button"
            className="rounded-lg border border-border/60 p-2 transition-colors hover:bg-red-50"
            onClick={() => onDelete(note.id)}
            title="Excluir nota"
          >
            <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
          </button>
        </div>
      </div>
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
  tone: "blue" | "amber" | "slate"
}) {
  const toneClass =
    tone === "amber"
      ? "bg-amber-500/10 text-amber-700"
      : tone === "slate"
        ? "bg-slate-500/10 text-slate-700"
        : "bg-blue-500/10 text-blue-700"

  return (
    <div className="rounded-2xl border border-white/70 bg-white/85 px-4 py-3 shadow-sm shadow-blue-950/5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-sm font-semibold ${toneClass}`}>{value}</p>
    </div>
  )
}
