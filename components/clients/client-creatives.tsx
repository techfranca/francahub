"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Plus, Loader2, Sparkles, Edit, Trash2, ExternalLink,
  Copy, Check, Film, FileText, Megaphone, PenLine, Clapperboard, Upload
} from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

interface Creative {
  id: string
  client_id: string
  titulo: string
  tipo: string
  plataforma: string | null
  conteudo: string | null
  status: "Rascunho" | "Em revisão" | "Aprovado" | "Publicado"
  link_criativo: string | null
  created_at: string
  updated_at: string
}

const TIPOS = ["Roteiro", "Briefing", "Copy", "Legenda", "Script de anúncio"]
const PLATAFORMAS = ["Reels", "Stories", "Feed", "TikTok", "YouTube", "Anúncio", "WhatsApp", "Outro"]
const STATUS_LIST = ["Rascunho", "Em revisão", "Aprovado", "Publicado"] as const

const statusConfig: Record<string, { label: string; class: string }> = {
  "Rascunho":    { label: "Rascunho",    class: "bg-slate-100 text-slate-600" },
  "Em revisão":  { label: "Em revisão",  class: "bg-amber-100 text-amber-700" },
  "Aprovado":    { label: "Aprovado",    class: "bg-emerald-100 text-emerald-700" },
  "Publicado":   { label: "Publicado",   class: "bg-blue-100 text-blue-700" },
}

const tipoIcon: Record<string, React.ElementType> = {
  "Roteiro": Clapperboard,
  "Briefing": FileText,
  "Copy": PenLine,
  "Legenda": Film,
  "Script de anúncio": Megaphone,
}

const EMPTY_FORM: { titulo: string; tipo: string; plataforma: string; conteudo: string; status: Creative["status"]; link_criativo: string } = {
  titulo: "", tipo: "Roteiro", plataforma: "", conteudo: "", status: "Rascunho", link_criativo: ""
}

interface Props {
  clientId: string
  clientName?: string
}

export function ClientCreatives({ clientId, clientName }: Props) {
  const [creatives, setCreatives] = useState<Creative[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Creative | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterTipo, setFilterTipo] = useState("all")
  const [copied, setCopied] = useState(false)

  // AI generation
  const [showAI, setShowAI] = useState(false)
  const [aiInstrucao, setAiInstrucao] = useState("")
  const [generating, setGenerating] = useState(false)

  // DOCX upload
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Edit mode in modal
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState<Partial<Creative>>({})

  const fetchCreatives = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/clients/${clientId}/creatives`)
    if (res.ok) setCreatives(await res.json())
    setLoading(false)
  }, [clientId])

  useEffect(() => { fetchCreatives() }, [fetchCreatives])

  const filtered = creatives.filter(c => {
    const matchStatus = filterStatus === "all" || c.status === filterStatus
    const matchTipo = filterTipo === "all" || c.tipo === filterTipo
    return matchStatus && matchTipo
  })

  async function handleSave() {
    if (!form.titulo.trim()) { toast.error("Título é obrigatório"); return }
    setSaving(true)
    try {
      const res = await fetch(`/api/clients/${clientId}/creatives`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success("Criativo salvo!")
      setForm(EMPTY_FORM)
      setShowForm(false)
      setShowAI(false)
      fetchCreatives()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar")
    } finally {
      setSaving(false)
    }
  }

  async function handleGenerate() {
    if (!aiInstrucao.trim()) { toast.error("Descreva o briefing"); return }
    setGenerating(true)
    try {
      const res = await fetch(`/api/clients/${clientId}/creatives/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instrucao: aiInstrucao,
          tipo: form.tipo,
          plataforma: form.plataforma,
          titulo: form.titulo,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const data = await res.json()
      setForm(prev => ({ ...prev, conteudo: data.content }))
      setShowAI(false)
      toast.success("Conteúdo gerado! Revise e salve.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao gerar")
    } finally {
      setGenerating(false)
    }
  }

  async function handleUpdateStatus(id: string, status: string) {
    await fetch(`/api/clients/${clientId}/creatives/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    setCreatives(prev => prev.map(c => c.id === id ? { ...c, status: status as Creative["status"] } : c))
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, status: status as Creative["status"] } : prev)
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover este criativo?")) return
    setDeleting(id)
    await fetch(`/api/clients/${clientId}/creatives/${id}`, { method: "DELETE" })
    setCreatives(prev => prev.filter(c => c.id !== id))
    setSelected(null)
    toast.success("Criativo removido")
    setDeleting(null)
  }

  async function handleEdit() {
    if (!selected || !editForm.titulo?.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/clients/${clientId}/creatives/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      })
      if (!res.ok) throw new Error()
      const updated = { ...selected, ...editForm, updated_at: new Date().toISOString() } as Creative
      setCreatives(prev => prev.map(c => c.id === selected.id ? updated : c))
      setSelected(updated)
      setEditing(false)
      toast.success("Atualizado!")
    } catch {
      toast.error("Erro ao atualizar")
    } finally {
      setSaving(false)
    }
  }

  async function copyContent(text: string) {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success("Copiado!")
    setTimeout(() => setCopied(false), 1500)
  }

  async function handleDocxUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    setUploading(true)
    try {
      const formData = new FormData()
      files.forEach(f => formData.append('files', f))

      const res = await fetch(`/api/clients/${clientId}/creatives/upload-docx`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) throw new Error((await res.json()).error)
      const data = await res.json()

      if (data.success > 0) {
        toast.success(`${data.success} criativo(s) importado(s)!`)
        fetchCreatives()
      }

      const errors = data.results?.filter((r: {error?: string}) => r.error) || []
      if (errors.length > 0) {
        toast.error(`${errors.length} arquivo(s) com erro`)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao importar')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-pink-500/10 rounded-xl flex items-center justify-center">
            <Film className="h-5 w-5 text-pink-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold">Criativos</h3>
            <p className="text-sm text-muted-foreground">
              {creatives.length > 0 ? `${creatives.length} criativo(s)` : "Nenhum criativo"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="rounded-xl h-9 text-sm gap-1.5"
            onClick={() => { setShowForm(true); setShowAI(true) }}
          >
            <Sparkles className="h-4 w-4 text-violet-500" /> Gerar com IA
          </Button>
          <Button
            className="rounded-xl h-9 text-sm"
            onClick={() => { setShowForm(true); setShowAI(false) }}
          >
            <Plus className="h-4 w-4 mr-1.5" /> Novo Criativo
          </Button>
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".docx"
              multiple
              className="hidden"
              onChange={handleDocxUpload}
            />
            <Button
              variant="outline"
              className="rounded-xl h-9 text-sm gap-1.5"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading ? 'Importando...' : 'Importar DOCX'}
            </Button>
          </>
        </div>
      </div>
      {/* Naming convention hint */}
      <p className="text-[11px] text-muted-foreground">
        Padrão aceito: <code className="bg-muted px-1 rounded text-[10px]">AD 01DH - [VD] Nome.docx</code> · VD=vídeo · FT=foto · CR=carrossel
      </p>

      {/* Filters */}
      {creatives.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <Select value={filterStatus} onValueChange={v => setFilterStatus(v || "all")}>
            <SelectTrigger className="w-36 rounded-xl h-9 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {STATUS_LIST.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterTipo} onValueChange={v => setFilterTipo(v || "all")}>
            <SelectTrigger className="w-40 rounded-xl h-9 text-sm"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="py-12 text-center">
          <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
        </div>
      )}

      {/* Empty */}
      {!loading && creatives.length === 0 && !showForm && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-pink-500/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Film className="h-8 w-8 text-pink-500" />
          </div>
          <h3 className="text-lg font-semibold mb-1">Nenhum criativo</h3>
          <p className="text-muted-foreground text-sm mb-4">Crie roteiros, copies e briefings para este cliente</p>
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" className="rounded-xl gap-2" onClick={() => { setShowForm(true); setShowAI(true) }}>
              <Sparkles className="h-4 w-4 text-violet-500" /> Gerar com IA
            </Button>
            <Button className="rounded-xl gap-2" onClick={() => { setShowForm(true); setShowAI(false) }}>
              <Plus className="h-4 w-4" /> Criar manualmente
            </Button>
            <Button variant="outline" className="rounded-xl gap-2" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading ? 'Importando...' : 'Importar DOCX'}
            </Button>
          </div>
        </div>
      )}

      {/* Creatives grid */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(creative => {
            const Icon = tipoIcon[creative.tipo] || FileText
            const sc = statusConfig[creative.status]
            return (
              <div
                key={creative.id}
                onClick={() => { setSelected(creative); setEditing(false); setEditForm({}) }}
                className="bg-card border rounded-xl p-5 hover:shadow-md hover:border-primary/20 transition-all duration-200 cursor-pointer group"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 bg-pink-100 rounded-lg flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 text-pink-600" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-sm truncate">{creative.titulo}</h4>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-[11px] text-muted-foreground">{creative.tipo}</span>
                        {creative.plataforma && (
                          <>
                            <span className="text-muted-foreground/40">·</span>
                            <span className="text-[11px] text-muted-foreground">{creative.plataforma}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <Badge className={`text-[10px] rounded-full border-0 shrink-0 ${sc.class}`}>
                    {sc.label}
                  </Badge>
                </div>

                {creative.conteudo && (
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 mb-3">
                    {creative.conteudo}
                  </p>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-border/50">
                  <span className="text-[11px] text-muted-foreground">
                    {format(new Date(creative.created_at), "dd MMM yyyy", { locale: ptBR })}
                  </span>
                  {creative.link_criativo && (
                    <a
                      href={creative.link_criativo}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="text-[11px] text-primary flex items-center gap-1 hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" /> Ver criativo
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* New Creative Form */}
      {showForm && (
        <div className="bg-muted/30 border border-border/50 rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Novo Criativo</h4>
            <Button variant="ghost" size="sm" className="rounded-xl" onClick={() => { setShowForm(false); setShowAI(false); setForm(EMPTY_FORM) }}>
              Cancelar
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-3 space-y-1.5">
              <Label className="text-xs font-medium">Título *</Label>
              <Input placeholder="Ex: Reels semana 1 — lançamento" value={form.titulo} onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))} className="rounded-xl h-10" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Tipo</Label>
              <Select value={form.tipo} onValueChange={v => setForm(p => ({ ...p, tipo: v || "Roteiro" }))}>
                <SelectTrigger className="rounded-xl h-10"><SelectValue /></SelectTrigger>
                <SelectContent>{TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Plataforma</Label>
              <Select value={form.plataforma} onValueChange={v => setForm(p => ({ ...p, plataforma: v || "" }))}>
                <SelectTrigger className="rounded-xl h-10"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{PLATAFORMAS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Status</Label>
              <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: (v || "Rascunho") as Creative["status"] }))}>
                <SelectTrigger className="rounded-xl h-10"><SelectValue /></SelectTrigger>
                <SelectContent>{STATUS_LIST.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          {/* AI section */}
          {showAI && (
            <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-600" />
                <span className="text-sm font-semibold text-violet-800">Gerar com IA</span>
              </div>
              <textarea
                className="w-full bg-white border border-violet-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-300 placeholder:text-muted-foreground"
                rows={3}
                placeholder={`Descreva o briefing... Ex: "Reels de 60s apresentando o novo produto X, tom descontraído, CTA para o link na bio"`}
                value={aiInstrucao}
                onChange={e => setAiInstrucao(e.target.value)}
              />
              <Button
                onClick={handleGenerate}
                disabled={generating || !aiInstrucao.trim()}
                className="rounded-xl bg-violet-600 hover:bg-violet-700 gap-2"
              >
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {generating ? "Gerando..." : "Gerar conteúdo"}
              </Button>
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Conteúdo</Label>
              {!showAI && (
                <button
                  onClick={() => setShowAI(true)}
                  className="text-[11px] text-violet-600 hover:text-violet-700 flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="h-3 w-3" /> Gerar com IA
                </button>
              )}
            </div>
            <textarea
              className="w-full bg-white border border-border rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring/30 placeholder:text-muted-foreground"
              rows={8}
              placeholder="Cole ou escreva o roteiro, copy ou briefing aqui..."
              value={form.conteudo}
              onChange={e => setForm(p => ({ ...p, conteudo: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Link do criativo finalizado</Label>
            <Input placeholder="https://..." value={form.link_criativo} onChange={e => setForm(p => ({ ...p, link_criativo: e.target.value }))} className="rounded-xl h-10" />
          </div>

          <Button onClick={handleSave} disabled={saving || !form.titulo.trim()} className="rounded-xl h-10 gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Salvar Criativo
          </Button>
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <Dialog open={!!selected} onOpenChange={() => { setSelected(null); setEditing(false) }}>
          <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 pr-8">
                {(() => {
                  const Icon = tipoIcon[selected.tipo] || FileText
                  return (
                    <>
                      <div className="w-8 h-8 bg-pink-100 rounded-lg flex items-center justify-center shrink-0">
                        <Icon className="h-4 w-4 text-pink-600" />
                      </div>
                      <span className="truncate">{selected.titulo}</span>
                    </>
                  )
                })()}
              </DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto space-y-4 mt-1">
              {/* Meta info */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={`text-xs rounded-full border-0 ${statusConfig[selected.status].class}`}>
                  {selected.status}
                </Badge>
                <span className="text-xs text-muted-foreground">{selected.tipo}</span>
                {selected.plataforma && (
                  <span className="text-xs text-muted-foreground">· {selected.plataforma}</span>
                )}
                <span className="text-xs text-muted-foreground ml-auto">
                  {format(new Date(selected.created_at), "dd MMM yyyy", { locale: ptBR })}
                </span>
              </div>

              {editing ? (
                /* Edit mode */
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-3 space-y-1.5">
                      <Label className="text-xs font-medium">Título</Label>
                      <Input value={editForm.titulo ?? selected.titulo} onChange={e => setEditForm(p => ({ ...p, titulo: e.target.value }))} className="rounded-xl h-9" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Tipo</Label>
                      <Select value={editForm.tipo ?? selected.tipo} onValueChange={v => setEditForm(p => ({ ...p, tipo: v || selected.tipo }))}>
                        <SelectTrigger className="rounded-xl h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>{TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Plataforma</Label>
                      <Select value={editForm.plataforma ?? selected.plataforma ?? ""} onValueChange={v => setEditForm(p => ({ ...p, plataforma: v }))}>
                        <SelectTrigger className="rounded-xl h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>{PLATAFORMAS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Status</Label>
                      <Select value={editForm.status ?? selected.status} onValueChange={v => setEditForm(p => ({ ...p, status: v as Creative["status"] }))}>
                        <SelectTrigger className="rounded-xl h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>{STATUS_LIST.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Conteúdo</Label>
                    <textarea
                      className="w-full bg-muted/30 border border-border rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring/30"
                      rows={10}
                      value={editForm.conteudo ?? selected.conteudo ?? ""}
                      onChange={e => setEditForm(p => ({ ...p, conteudo: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Link do criativo</Label>
                    <Input value={editForm.link_criativo ?? selected.link_criativo ?? ""} onChange={e => setEditForm(p => ({ ...p, link_criativo: e.target.value }))} className="rounded-xl h-9" placeholder="https://..." />
                  </div>
                </div>
              ) : (
                /* View mode */
                <>
                  {selected.conteudo ? (
                    <div className="bg-muted/30 rounded-xl p-4 relative group/content">
                      <pre className="text-sm leading-relaxed whitespace-pre-wrap font-sans">{selected.conteudo}</pre>
                      <button
                        onClick={() => copyContent(selected.conteudo!)}
                        className="absolute top-3 right-3 p-1.5 rounded-lg opacity-0 group-hover/content:opacity-100 hover:bg-muted transition-all cursor-pointer"
                      >
                        {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
                      </button>
                    </div>
                  ) : (
                    <div className="bg-muted/20 rounded-xl p-6 text-center text-sm text-muted-foreground">
                      Nenhum conteúdo — clique em Editar para adicionar.
                    </div>
                  )}
                  {selected.link_criativo && (
                    <a href={selected.link_criativo} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline">
                      <ExternalLink className="h-4 w-4" /> Ver criativo finalizado
                    </a>
                  )}
                </>
              )}
            </div>

            {/* Footer actions */}
            <div className="flex items-center justify-between gap-2 pt-4 border-t mt-4">
              <div className="flex items-center gap-2">
                {!editing && STATUS_LIST.filter(s => s !== selected.status).slice(0, 2).map(s => (
                  <Button key={s} variant="outline" size="sm" className="rounded-xl h-8 text-xs"
                    onClick={() => handleUpdateStatus(selected.id, s)}>
                    → {s}
                  </Button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                {editing ? (
                  <>
                    <Button variant="ghost" size="sm" className="rounded-xl" onClick={() => setEditing(false)}>Cancelar</Button>
                    <Button size="sm" className="rounded-xl" onClick={handleEdit} disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" size="sm" className="rounded-xl h-8 gap-1.5"
                      onClick={() => { setEditing(true); setEditForm({}) }}>
                      <Edit className="h-3.5 w-3.5" /> Editar
                    </Button>
                    <Button variant="outline" size="sm"
                      className="rounded-xl h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-red-50 hover:border-red-200"
                      onClick={() => handleDelete(selected.id)}
                      disabled={deleting === selected.id}
                    >
                      {deleting === selected.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
