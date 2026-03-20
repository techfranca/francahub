"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Key, RefreshCw, Search, Clock, CheckCircle, XCircle,
  Copy, Check, Zap, Shield, Mail, History
} from "lucide-react"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"

interface VerificationCode {
  id: string
  platform: string
  code: string
  subject: string | null
  body_preview: string | null
  received_at: string
  expires_at: string
  status: "active" | "used" | "expired"
}

const MONITOR_EMAIL = "contato@francaassessoria.com"

export default function VerificationCodesPage() {
  const [codes, setCodes] = useState<VerificationCode[]>([])
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [search, setSearch] = useState("")
  const [tab, setTab] = useState<"active" | "history">("active")
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchCodes = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    const res = await fetch("/api/verification-codes")
    if (res.ok) setCodes(await res.json())
    if (!silent) setLoading(false)
  }, [])

  useEffect(() => { fetchCodes() }, [fetchCodes])

  // Auto-refresh every 30s
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => fetchCodes(true), 30_000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [autoRefresh, fetchCodes])

  async function markAsUsed(id: string) {
    await fetch(`/api/verification-codes/${id}`, { method: "PATCH" })
    setCodes(prev => prev.map(c => c.id === id ? { ...c, status: "used" } : c))
    toast.success("Marcado como usado")
  }

  async function copyCode(id: string, code: string) {
    await navigator.clipboard.writeText(code)
    setCopiedId(id)
    toast.success("Código copiado!")
    setTimeout(() => setCopiedId(null), 1500)
  }

  function getTimeLeft(expiresAt: string): { label: string; urgent: boolean } {
    const diff = new Date(expiresAt).getTime() - Date.now()
    if (diff <= 0) return { label: "Expirado", urgent: true }
    const mins = Math.floor(diff / 60000)
    const secs = Math.floor((diff % 60000) / 1000)
    if (mins === 0) return { label: `${secs}s`, urgent: true }
    return { label: `${mins}m ${secs}s`, urgent: mins < 2 }
  }

  const filtered = codes.filter(c => {
    const matchSearch = !search || c.platform.toLowerCase().includes(search.toLowerCase()) ||
      c.code.includes(search) || (c.subject || "").toLowerCase().includes(search.toLowerCase())
    if (tab === "active") return matchSearch && c.status === "active"
    return matchSearch && c.status !== "active"
  })

  const activeCodes = codes.filter(c => c.status === "active")
  const usedCodes = codes.filter(c => c.status === "used")
  const expiredCodes = codes.filter(c => c.status === "expired")

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-amber-100 rounded-xl flex items-center justify-center">
            <Key className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Códigos de Verificação</h1>
            <p className="text-muted-foreground text-sm">Códigos 2FA recebidos no e-mail corporativo</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 bg-white border rounded-xl px-3 py-2 shadow-card">
            <Zap className={`h-4 w-4 ${autoRefresh ? "text-emerald-500" : "text-muted-foreground"}`} />
            <Label htmlFor="autorefresh" className="text-sm font-medium cursor-pointer">Auto-refresh</Label>
            <Switch id="autorefresh" checked={autoRefresh} onCheckedChange={setAutoRefresh} />
          </div>
          <Button onClick={() => fetchCodes()} variant="default" className="rounded-xl gap-2">
            <RefreshCw className="h-4 w-4" /> Atualizar
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total", value: codes.length, icon: Key, color: "bg-slate-100 text-slate-600" },
          { label: "Ativos", value: activeCodes.length, icon: CheckCircle, color: "bg-emerald-100 text-emerald-600" },
          { label: "Usados", value: usedCodes.length, icon: Check, color: "bg-blue-100 text-blue-600" },
          { label: "Expirados", value: expiredCodes.length, icon: XCircle, color: "bg-red-100 text-red-600", highlight: expiredCodes.length > 0 },
        ].map(stat => (
          <Card key={stat.label} className="shadow-card border-transparent">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className={`text-3xl font-bold mt-0.5 ${stat.highlight ? "text-red-500" : ""}`}>{stat.value}</p>
              </div>
              <div className={`w-10 h-10 ${stat.color} rounded-xl flex items-center justify-center`}>
                <stat.icon className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1 bg-white border rounded-xl p-1 shadow-card w-fit">
          <button
            onClick={() => setTab("active")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === "active" ? "bg-emerald-50 text-emerald-700 shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <CheckCircle className="h-4 w-4" /> Ativos
            {activeCodes.length > 0 && (
              <span className="bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {activeCodes.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("history")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === "history" ? "bg-emerald-50 text-emerald-700 shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <History className="h-4 w-4" /> Histórico
            {(usedCodes.length + expiredCodes.length) > 0 && (
              <span className="bg-muted text-muted-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {usedCodes.length + expiredCodes.length}
              </span>
            )}
          </button>
        </div>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código, plataforma ou assunto..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 rounded-xl h-11 bg-white shadow-card border-transparent"
          />
        </div>
      </div>

      {/* Codes list */}
      {loading ? (
        <Card className="shadow-card border-transparent">
          <CardContent className="py-16 text-center">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
            <p className="text-muted-foreground mt-3">Carregando códigos...</p>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="shadow-card border-transparent">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Key className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <p className="font-semibold text-lg">
              {tab === "active" ? "Nenhum código ativo" : "Nenhum histórico"}
            </p>
            <p className="text-muted-foreground text-sm mt-1">
              {tab === "active" ? "Os códigos de verificação aparecerão aqui quando chegarem" : "Nenhum código usado ou expirado ainda"}
            </p>
            <p className="text-muted-foreground/60 text-xs mt-4 flex items-center justify-center gap-1.5">
              <Mail className="h-3.5 w-3.5" /> Monitorando: {MONITOR_EMAIL}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(code => {
            const timeLeft = getTimeLeft(code.expires_at)
            const isActive = code.status === "active"
            return (
              <Card key={code.id} className={`shadow-card border-transparent transition-all ${
                isActive ? "hover:shadow-card-hover" : "opacity-70"
              }`}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      {/* Platform icon */}
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                        isActive ? "bg-amber-100" : "bg-muted"
                      }`}>
                        <Shield className={`h-5 w-5 ${isActive ? "text-amber-600" : "text-muted-foreground"}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{code.platform}</span>
                          <Badge className={`text-[10px] rounded-full border-0 font-semibold ${
                            code.status === "active" ? "bg-emerald-100 text-emerald-700" :
                            code.status === "used" ? "bg-blue-100 text-blue-700" :
                            "bg-red-100 text-red-700"
                          }`}>
                            {code.status === "active" ? "Ativo" : code.status === "used" ? "Usado" : "Expirado"}
                          </Badge>
                          {isActive && (
                            <span className={`text-xs font-medium flex items-center gap-1 ${
                              timeLeft.urgent ? "text-red-500" : "text-muted-foreground"
                            }`}>
                              <Clock className="h-3 w-3" /> {timeLeft.label}
                            </span>
                          )}
                        </div>
                        {code.subject && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{code.subject}</p>
                        )}
                        <p className="text-xs text-muted-foreground/60 mt-0.5">
                          {formatDistanceToNow(new Date(code.received_at), { addSuffix: true, locale: ptBR })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {/* Code display */}
                      <div className={`font-mono text-2xl font-bold tracking-[0.2em] px-4 py-2 rounded-xl border ${
                        isActive && timeLeft.urgent
                          ? "bg-red-50 border-red-200 text-red-600"
                          : isActive
                          ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                          : "bg-muted border-border/50 text-muted-foreground"
                      }`}>
                        {code.code.length === 6 ? `${code.code.slice(0, 3)} ${code.code.slice(3)}` : code.code}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl h-8 w-8 p-0"
                          onClick={() => copyCode(code.id, code.code)}
                          title="Copiar código"
                        >
                          {copiedId === code.id ? (
                            <Check className="h-3.5 w-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        {isActive && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-xl h-8 w-8 p-0 text-muted-foreground hover:text-blue-600 hover:border-blue-200"
                            onClick={() => markAsUsed(code.id)}
                            title="Marcar como usado"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {code.body_preview && (
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{code.body_preview}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* How it works */}
      <Card className="shadow-card border-transparent bg-muted/30">
        <CardContent className="p-5 flex items-start gap-3">
          <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center shrink-0 mt-0.5">
            <Shield className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold mb-1">Como funciona?</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              O n8n monitora o e-mail <span className="font-semibold text-foreground">{MONITOR_EMAIL}</span> e extrai automaticamente
              códigos de verificação de plataformas conhecidas. Os códigos ficam disponíveis aqui por alguns minutos até expirarem.
              Auto-refresh atualiza a cada 30 segundos quando ativado.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
