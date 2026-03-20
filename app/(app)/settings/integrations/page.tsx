"use client"

import { useEffect, useState, useCallback, Suspense } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Trash2, RefreshCw, BarChart3, CheckCircle, AlertCircle, Link2, Calendar, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import { useSearchParams } from "next/navigation"

interface AdAccount {
  id: string
  meta_account_id: string
  account_name: string | null
  status: string
  last_sync_at: string | null
  created_at: string
}

interface CalendarIntegration {
  connected: boolean
  integration: {
    account_email: string | null
    status: string
    updated_at: string
  } | null
}

function IntegrationsContent() {
  const searchParams = useSearchParams()

  const [accounts, setAccounts] = useState<AdAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [showManual, setShowManual] = useState(false)
  const [manualToken, setManualToken] = useState("")
  const [manualAccountId, setManualAccountId] = useState("")
  const [manualName, setManualName] = useState("")
  const [saving, setSaving] = useState(false)

  const [calendar, setCalendar] = useState<CalendarIntegration | null>(null)
  const [calendarLoading, setCalendarLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState(false)

  const fetchAccounts = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/ads/accounts")
    if (res.ok) setAccounts(await res.json())
    setLoading(false)
  }, [])

  const fetchCalendar = useCallback(async () => {
    setCalendarLoading(true)
    const res = await fetch("/api/integrations/google-calendar")
    if (res.ok) setCalendar(await res.json())
    setCalendarLoading(false)
  }, [])

  useEffect(() => {
    fetchAccounts()
    fetchCalendar()

    const success = searchParams.get("success")
    const error = searchParams.get("error")
    if (success === "calendar_connected") toast.success("Google Calendar conectado com sucesso!")
    if (error === "calendar_denied") toast.error("Autorização negada pelo Google")
    if (error === "calendar_failed") toast.error("Erro ao conectar com Google Calendar")
  }, [fetchAccounts, fetchCalendar, searchParams])

  async function connectManual() {
    if (!manualToken || !manualAccountId) {
      toast.error("Token e ID da conta são obrigatórios")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/ads/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_token: manualToken,
          meta_account_id: manualAccountId,
          account_name: manualName || null,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success("Conta conectada com sucesso!")
      setManualToken("")
      setManualAccountId("")
      setManualName("")
      setShowManual(false)
      fetchAccounts()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao conectar")
    } finally {
      setSaving(false)
    }
  }

  async function syncAccount(accountId: string) {
    setSyncing(accountId)
    try {
      const res = await fetch("/api/ads/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account_id: accountId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`Sincronizado: ${data.campaigns_synced} campanhas, ${data.metrics_synced} métricas`)
      fetchAccounts()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao sincronizar")
    } finally {
      setSyncing(null)
    }
  }

  async function deleteAccount(accountId: string) {
    if (!confirm("Desconectar esta conta? As campanhas e métricas vinculadas serão removidas.")) return
    const res = await fetch(`/api/ads/accounts/${accountId}`, { method: "DELETE" })
    if (res.ok) {
      toast.success("Conta desconectada")
      fetchAccounts()
    }
  }

  async function disconnectCalendar() {
    if (!confirm("Desconectar o Google Calendar? Reuniões futuras não serão sincronizadas.")) return
    setDisconnecting(true)
    const res = await fetch("/api/integrations/google-calendar", { method: "DELETE" })
    if (res.ok) {
      toast.success("Google Calendar desconectado")
      fetchCalendar()
    }
    setDisconnecting(false)
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Integrações</h1>
        <p className="text-muted-foreground mt-1">Conecte serviços externos ao Franca Hub</p>
      </div>

      {/* Google Calendar */}
      <Card className="shadow-card border-transparent">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              Google Calendar
            </CardTitle>
            {!calendarLoading && (
              calendar?.connected ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl text-red-600 hover:bg-red-50 hover:border-red-200"
                  onClick={disconnectCalendar}
                  disabled={disconnecting}
                >
                  {disconnecting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Trash2 className="h-4 w-4 mr-1.5" />}
                  Desconectar
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="rounded-xl"
                  onClick={() => window.location.href = "/api/integrations/google-calendar/auth"}
                >
                  <Link2 className="h-4 w-4 mr-1.5" /> Conectar
                </Button>
              )
            )}
          </div>
        </CardHeader>
        <CardContent>
          {calendarLoading ? (
            <div className="py-8 text-center">
              <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : calendar?.connected ? (
            <div className="flex items-center gap-4 p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-emerald-800">Conectado</p>
                <p className="text-xs text-emerald-700 mt-0.5">
                  {calendar.integration?.account_email || "Conta Google vinculada"}
                  {calendar.integration?.updated_at && ` · Conectado em ${new Date(calendar.integration.updated_at).toLocaleDateString("pt-BR")}`}
                </p>
              </div>
              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 rounded-full text-xs">Ativo</Badge>
            </div>
          ) : (
            <div className="py-8 text-center">
              <div className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Calendar className="h-7 w-7 text-muted-foreground/50" />
              </div>
              <p className="font-medium">Não conectado</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                Conecte para criar eventos no Google Calendar automaticamente ao agendar reuniões, com link do Meet gerado.
              </p>
              <Button
                className="mt-4 rounded-xl"
                onClick={() => window.location.href = "/api/integrations/google-calendar/auth"}
              >
                <ExternalLink className="h-4 w-4 mr-1.5" /> Conectar com Google
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Meta Ads */}
      <Card className="shadow-card border-transparent">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-blue-600" />
              </div>
              Meta Ads
            </CardTitle>
            <Button
              variant={showManual ? "ghost" : "default"}
              size="sm"
              className="rounded-xl"
              onClick={() => setShowManual(!showManual)}
            >
              {showManual ? "Cancelar" : (
                <><Link2 className="h-4 w-4 mr-1.5" /> Conectar Conta</>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {showManual && (
            <div className="bg-muted/30 border border-border/50 rounded-xl p-5 space-y-4">
              <p className="text-sm text-muted-foreground">
                Obtenha um token de acesso em{" "}
                <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">
                  developers.facebook.com
                </a>
                {" "}→ Tools → Graph API Explorer
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">ID da Conta de Anúncios *</Label>
                  <Input
                    placeholder="Ex: 123456789"
                    value={manualAccountId}
                    onChange={(e) => setManualAccountId(e.target.value)}
                    className="rounded-xl h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Nome da Conta</Label>
                  <Input
                    placeholder="Nome para identificação"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    className="rounded-xl h-10"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Token de Acesso *</Label>
                <Input
                  placeholder="EAA..."
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  type="password"
                  className="rounded-xl h-10"
                />
              </div>
              <Button onClick={connectManual} disabled={saving} className="rounded-xl">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Conectar Conta
              </Button>
            </div>
          )}

          {loading ? (
            <div className="py-10 text-center">
              <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground mt-2">Carregando contas...</p>
            </div>
          ) : accounts.length === 0 ? (
            <div className="py-10 text-center">
              <div className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-3">
                <BarChart3 className="h-7 w-7 text-muted-foreground/50" />
              </div>
              <p className="font-medium">Nenhuma conta conectada</p>
              <p className="text-sm text-muted-foreground mt-1">Conecte sua conta Meta Ads para sincronizar campanhas</p>
            </div>
          ) : (
            <div className="space-y-3">
              {accounts.map((acc) => (
                <div key={acc.id} className="flex items-center justify-between p-4 bg-muted/30 border border-border/50 rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${acc.status === "active" ? "bg-emerald-100" : "bg-red-100"}`}>
                      {acc.status === "active" ? (
                        <CheckCircle className="h-5 w-5 text-emerald-600" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{acc.account_name || acc.meta_account_id}</p>
                      <p className="text-xs text-muted-foreground">
                        ID: {acc.meta_account_id}
                        {acc.last_sync_at && ` · Última sincronização: ${new Date(acc.last_sync_at).toLocaleDateString("pt-BR")}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`text-xs rounded-full border-0 ${acc.status === "active" ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : "bg-red-100 text-red-700 hover:bg-red-100"}`}>
                      {acc.status === "active" ? "Ativa" : "Erro"}
                    </Badge>
                    <Button
                      variant="ghost" size="icon" className="h-9 w-9 rounded-xl"
                      onClick={() => syncAccount(acc.id)} disabled={syncing === acc.id} title="Sincronizar"
                    >
                      {syncing === acc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost" size="icon"
                      className="h-9 w-9 rounded-xl text-muted-foreground hover:text-destructive hover:bg-red-50"
                      onClick={() => deleteAccount(acc.id)} title="Desconectar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function IntegrationsPage() {
  return (
    <Suspense fallback={null}>
      <IntegrationsContent />
    </Suspense>
  )
}
