"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Pin, PinOff, Trash2, Send, StickyNote } from "lucide-react"
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

  async function addNote() {
    if (!newNote.trim()) return
    setSending(true)

    const res = await fetch(`/api/clients/${clientId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newNote }),
    })

    if (res.ok) {
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
      {/* Input area */}
      <div className="flex gap-3">
        <Textarea
          placeholder="Adicionar uma observacao sobre o cliente..."
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          className="min-h-[80px] resize-none"
        />
        <Button
          onClick={addNote}
          disabled={sending || !newNote.trim()}
          className="shrink-0 h-auto"
          size="sm"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {notes.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
            <StickyNote className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="font-medium">Nenhuma nota ainda</p>
          <p className="text-sm text-muted-foreground mt-1">Adicione uma observacao acima</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <Card
              key={note.id}
              className={note.is_pinned ? "border-primary/30 bg-primary/5" : ""}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    {note.is_pinned && (
                      <div className="flex items-center gap-1 text-[11px] text-primary font-medium uppercase tracking-wider mb-1.5">
                        <Pin className="h-3 w-3" /> Fixada
                      </div>
                    )}
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{note.content}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatDistanceToNow(new Date(note.created_at), { addSuffix: true, locale: ptBR })}
                    </p>
                  </div>
                  <div className="flex gap-0.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => togglePin(note.id, note.is_pinned)}
                    >
                      {note.is_pinned ? (
                        <PinOff className="h-3.5 w-3.5" />
                      ) : (
                        <Pin className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => deleteNote(note.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
