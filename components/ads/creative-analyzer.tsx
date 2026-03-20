"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sparkles, Star, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface AnalysisResult {
  rating: number
  strengths: string[]
  weaknesses: string[]
  suggestions: string
  copy_score: number
  cta_score: number
  overall_assessment: string
}

export function CreativeAnalyzer({ campaignId }: { campaignId?: string }) {
  const [headline, setHeadline] = useState("")
  const [copyText, setCopyText] = useState("")
  const [cta, setCta] = useState("")
  const [creativeType, setCreativeType] = useState("image")
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)

  async function analyze() {
    if (!headline && !copyText) {
      toast.error("Preencha pelo menos o titulo ou o texto do criativo")
      return
    }
    setAnalyzing(true)
    setResult(null)

    try {
      const res = await fetch("/api/ai/analyze-creative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headline,
          copy_text: copyText,
          cta,
          creative_type: creativeType,
          campaign_id: campaignId,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao analisar")
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> Analisar Criativo com IA
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Titulo / Headline</Label>
              <Input
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="Ex: Descubra o poder do marketing digital"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">CTA (Call to Action)</Label>
              <Input
                value={cta}
                onChange={(e) => setCta(e.target.value)}
                placeholder="Ex: Saiba Mais, Compre Agora"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Texto / Copy</Label>
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={copyText}
              onChange={(e) => setCopyText(e.target.value)}
              placeholder="Texto principal do anuncio..."
            />
          </div>
          <div className="flex items-center gap-3">
            <Select value={creativeType} onValueChange={(v) => { if (v) setCreativeType(v) }}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="image">Imagem</SelectItem>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="carousel">Carrossel</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={analyze} disabled={analyzing} size="sm">
              {analyzing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Analisar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <Card className="animate-fade-in">
          <CardContent className="p-5 space-y-4">
            {/* Rating */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Nota Geral:</span>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`h-5 w-5 ${s <= result.rating ? "text-amber-500 fill-amber-500" : "text-muted-foreground/30"}`}
                    />
                  ))}
                </div>
                <span className="text-lg font-bold">{result.rating}/5</span>
              </div>
              <div className="flex gap-3 text-sm">
                <span>Copy: <strong>{result.copy_score}/10</strong></span>
                <span>CTA: <strong>{result.cta_score}/10</strong></span>
              </div>
            </div>

            {/* Assessment */}
            <p className="text-sm text-muted-foreground">{result.overall_assessment}</p>

            {/* Strengths & Weaknesses */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-2">Pontos Fortes</p>
                <ul className="space-y-1">
                  {result.strengths.map((s, i) => (
                    <li key={i} className="text-sm flex items-start gap-1.5">
                      <span className="text-emerald-500 mt-0.5">+</span> {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-2">Pontos Fracos</p>
                <ul className="space-y-1">
                  {result.weaknesses.map((w, i) => (
                    <li key={i} className="text-sm flex items-start gap-1.5">
                      <span className="text-red-500 mt-0.5">-</span> {w}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Suggestions */}
            <div>
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1.5">Sugestoes</p>
              <p className="text-sm text-muted-foreground">{result.suggestions}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
