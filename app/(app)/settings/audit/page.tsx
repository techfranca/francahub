"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollText, ChevronLeft, ChevronRight, Plus, Pencil, Trash2, Eye, Download } from "lucide-react"

interface AuditEntry {
  id: string
  user_id: string
  action: string
  entity_type: string
  entity_id: string | null
  changes: Record<string, unknown>
  created_at: string
}

const actionConfig: Record<string, { label: string; icon: typeof Plus; color: string }> = {
  create: { label: "Criou", icon: Plus, color: "text-emerald-600 bg-emerald-500/10" },
  update: { label: "Editou", icon: Pencil, color: "text-blue-600 bg-blue-500/10" },
  delete: { label: "Excluiu", icon: Trash2, color: "text-red-600 bg-red-500/10" },
  view: { label: "Visualizou", icon: Eye, color: "text-slate-600 bg-slate-500/10" },
  export: { label: "Exportou", icon: Download, color: "text-violet-600 bg-violet-500/10" },
}

const entityLabels: Record<string, string> = {
  client: "Cliente",
  meeting: "Reuniao",
  campaign: "Campanha",
  insight: "Insight",
  credential: "Credencial",
  tag: "Tag",
}

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [entityFilter, setEntityFilter] = useState("all")
  const [actionFilter, setActionFilter] = useState("all")
  const [page, setPage] = useState(0)
  const pageSize = 50

  const fetchAudit = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    params.set("limit", String(pageSize))
    params.set("offset", String(page * pageSize))
    if (entityFilter !== "all") params.set("entity_type", entityFilter)
    if (actionFilter !== "all") params.set("action", actionFilter)

    const res = await fetch(`/api/audit?${params}`)
    if (res.ok) {
      const data = await res.json()
      setEntries(data.data || [])
      setTotal(data.total || 0)
    }
    setLoading(false)
  }, [page, entityFilter, actionFilter])

  useEffect(() => { fetchAudit() }, [fetchAudit])

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Historico de Atividades</h1>
        <p className="text-muted-foreground mt-1">Registro de todas as acoes realizadas no sistema</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Select value={entityFilter} onValueChange={(v) => { setEntityFilter(v || "all"); setPage(0) }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="client">Clientes</SelectItem>
            <SelectItem value="meeting">Reunioes</SelectItem>
            <SelectItem value="campaign">Campanhas</SelectItem>
            <SelectItem value="insight">Insights</SelectItem>
            <SelectItem value="credential">Credenciais</SelectItem>
            <SelectItem value="tag">Tags</SelectItem>
          </SelectContent>
        </Select>
        <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v || "all"); setPage(0) }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as acoes</SelectItem>
            <SelectItem value="create">Criacao</SelectItem>
            <SelectItem value="update">Edicao</SelectItem>
            <SelectItem value="delete">Exclusao</SelectItem>
            <SelectItem value="export">Exportacao</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto text-sm text-muted-foreground flex items-center">
          {total} registro{total !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Entries */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ScrollText className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">Nenhum registro encontrado</h3>
          <p className="text-muted-foreground mt-1">Atividades serao registradas conforme o sistema for utilizado</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {entries.map((entry) => {
            const config = actionConfig[entry.action] || actionConfig.view
            const Icon = config.icon
            const entityLabel = entityLabels[entry.entity_type] || entry.entity_type
            const date = new Date(entry.created_at)

            return (
              <Card key={entry.id} className="border-border/50">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${config.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{config.label}</span>{" "}
                      <Badge variant="outline" className="text-[10px] mx-1">{entityLabel}</Badge>
                      {entry.entity_id && (
                        <span className="text-muted-foreground text-xs">#{entry.entity_id.slice(0, 8)}</span>
                      )}
                    </p>
                    {Object.keys(entry.changes).length > 0 && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {Object.keys(entry.changes).join(", ")}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground">
                      {date.toLocaleDateString("pt-BR")}
                    </p>
                    <p className="text-[11px] text-muted-foreground/60">
                      {date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            {page + 1} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages - 1}
            onClick={() => setPage(p => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
