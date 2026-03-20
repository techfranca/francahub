"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { FileText, Sparkles, CheckCircle, Loader2, Send, ListChecks, Target } from "lucide-react"
import type { HubTranscription } from "@/types/database"
import { toast } from "sonner"

interface TranscriptionViewerProps {
  meetingId: string
  transcription: HubTranscription | null
  onUpdate: () => void
}

export function TranscriptionViewer({ meetingId, transcription, onUpdate }: TranscriptionViewerProps) {
  const [manualText, setManualText] = useState("")
  const [saving, setSaving] = useState(false)
  const [processingAI, setProcessingAI] = useState(false)

  async function saveManualTranscription() {
    if (!manualText.trim()) return
    setSaving(true)

    try {
      const res = await fetch(`/api/meetings/${meetingId}/transcription`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_text: manualText,
          provider: "whisper",
        }),
      })

      if (!res.ok) throw new Error("Erro ao salvar")
      toast.success("Transcricao salva!")
      setManualText("")
      onUpdate()
    } catch {
      toast.error("Erro ao salvar transcricao")
    } finally {
      setSaving(false)
    }
  }

  async function processWithAI() {
    if (!transcription) return
    setProcessingAI(true)

    try {
      const res = await fetch(`/api/meetings/${meetingId}/transcription/ai`, {
        method: "POST",
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Erro ao processar")
      }

      toast.success("Transcricao processada pela IA!")
      onUpdate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao processar com IA")
    } finally {
      setProcessingAI(false)
    }
  }

  // No transcription yet - show input form
  if (!transcription) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" /> Transcricao
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Cole a transcricao da reuniao abaixo ou faca upload de um arquivo de audio para transcricao automatica.
          </p>
          <Textarea
            placeholder="Cole aqui o texto completo da transcricao..."
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            className="min-h-[200px] font-mono text-sm resize-none"
          />
          <div className="flex justify-end">
            <Button
              onClick={saveManualTranscription}
              disabled={saving || !manualText.trim()}
              className="font-semibold"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Salvar Transcricao
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Has transcription - show it
  const keyPoints = (transcription.key_points || []) as string[]
  const actionItems = (transcription.action_items || []) as string[]

  return (
    <div className="space-y-5">
      {/* AI Summary Section */}
      {transcription.summary ? (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Resumo IA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{transcription.summary}</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Processar com IA</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Extrair pontos-chave, itens de acao e resumo automaticamente
              </p>
            </div>
            <Button
              onClick={processWithAI}
              disabled={processingAI}
              variant="outline"
              size="sm"
            >
              {processingAI ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Processar
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Key Points & Action Items */}
      {(keyPoints.length > 0 || actionItems.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {keyPoints.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="h-4 w-4 text-blue-600" /> Pontos-chave
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {keyPoints.map((point, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                      {point}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {actionItems.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-emerald-600" /> Itens de Acao
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {actionItems.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Full Transcription */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" /> Transcricao Completa
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {transcription.word_count?.toLocaleString("pt-BR")} palavras
              </Badge>
              <Badge variant="outline" className="text-xs">
                {transcription.provider === "google_stt" ? "Google STT" : "Whisper"}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/30 rounded-lg p-4 max-h-[500px] overflow-y-auto">
            <p className="text-sm whitespace-pre-wrap leading-relaxed font-mono">
              {transcription.full_text}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
