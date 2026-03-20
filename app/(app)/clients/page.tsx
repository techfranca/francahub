"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Plus, Search, Users, UserCheck, UserX, ExternalLink, ArrowUpRight,
  LayoutGrid, List, FolderOpen, DollarSign, ChevronRight, UserMinus
} from "lucide-react"
import { SEGMENTOS, getSegmentColor } from "@/lib/constants"
import type { HubClient } from "@/types/database"
import Link from "next/link"
import { ClientFormDialog } from "@/components/clients/client-form-dialog"
import { useRealtimeTable } from "@/lib/supabase/realtime"
import { toast } from "sonner"

type ViewMode = "grid" | "table"
type ClientTab = "ativos" | "inativos"

export default function ClientsPage() {
  const [allClients, setAllClients] = useState<HubClient[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [segmentoFilter, setSegmentoFilter] = useState<string>("all")
  const [showForm, setShowForm] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>("table")
  const [tab, setTab] = useState<ClientTab>("ativos")

  const fetchClients = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    let query = supabase
      .from("hub_clients")
      .select("*")
      .order("nome_empresa", { ascending: true, nullsFirst: false })
      .order("nome_cliente", { ascending: true })

    if (segmentoFilter !== "all") query = query.eq("segmento", segmentoFilter)
    if (search) {
      query = query.or(`nome_cliente.ilike.%${search}%,nome_empresa.ilike.%${search}%,tag.ilike.%${search}%`)
    }

    const { data } = await query
    setAllClients(data || [])
    setLoading(false)
  }, [search, segmentoFilter])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  useRealtimeTable("hub_clients", fetchClients)

  const activeClients = allClients.filter(c => c.status === "Ativo")
  const inactiveClients = allClients.filter(c => c.status === "Inativo")
  const clients = tab === "ativos" ? activeClients : inactiveClients

  async function handleToggleStatus(clientId: string, newStatus: string) {
    const supabase = createClient()
    const { error } = await supabase
      .from("hub_clients")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", clientId)

    if (error) {
      toast.error("Erro ao atualizar status")
    } else {
      toast.success(newStatus === "Inativo" ? "Cliente inativado" : "Cliente reativado")
      fetchClients()
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground mt-1">Gerencie todos os clientes da agência</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="font-semibold rounded-xl h-10 px-5">
          <Plus className="h-4 w-4 mr-2" />
          Novo Cliente
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-card border-transparent">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
              <Users className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-3xl font-bold tracking-tight tabular-nums">{allClients.length}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card border-transparent">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <UserCheck className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-3xl font-bold tracking-tight tabular-nums">{activeClients.length}</p>
              <p className="text-sm text-muted-foreground">Ativos</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card border-transparent">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
              <UserX className="h-6 w-6 text-slate-500" />
            </div>
            <div>
              <p className="text-3xl font-bold tracking-tight tabular-nums">{inactiveClients.length}</p>
              <p className="text-sm text-muted-foreground">Inativos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs: Ativos / Inativos */}
      <div className="flex items-center gap-1 bg-white rounded-xl border border-border p-1 w-fit">
        <button
          onClick={() => setTab("ativos")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === "ativos"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <UserCheck className="h-4 w-4" />
          Ativos
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${
            tab === "ativos" ? "bg-white/20" : "bg-muted"
          }`}>
            {activeClients.length}
          </span>
        </button>
        <button
          onClick={() => setTab("inativos")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === "inativos"
              ? "bg-slate-700 text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <UserX className="h-4 w-4" />
          Inativos
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${
            tab === "inativos" ? "bg-white/20" : "bg-muted"
          }`}>
            {inactiveClients.length}
          </span>
        </button>
      </div>

      {/* Filters + View Toggle */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, empresa ou tag..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 rounded-xl bg-white border-border"
          />
        </div>
        <Select value={segmentoFilter} onValueChange={(v) => setSegmentoFilter(v || "all")}>
          <SelectTrigger className="w-full sm:w-[160px] h-10 rounded-xl bg-white">
            <SelectValue placeholder="Segmento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {SEGMENTOS.map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* View Toggle */}
        <div className="flex bg-white rounded-xl border border-border h-10 p-1">
          <button
            onClick={() => setViewMode("grid")}
            className={`flex items-center justify-center w-9 rounded-lg transition-all ${
              viewMode === "grid"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`flex items-center justify-center w-9 rounded-lg transition-all ${
              viewMode === "table"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Segment Legend */}
      {(() => {
        const activeSegments = Array.from(new Set(clients.map(c => c.segmento).filter(Boolean))).sort()
        if (activeSegments.length === 0) return null
        return (
          <div className="bg-white rounded-xl px-5 py-3 shadow-card flex items-center gap-6 flex-wrap">
            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Segmentos:</span>
            {activeSegments.map(seg => {
              const colors = getSegmentColor(seg!)
              return (
                <div key={seg} className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
                  <span className="text-sm text-foreground">{seg}</span>
                </div>
              )
            })}
          </div>
        )
      })()}

      {/* Client List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="shadow-card border-transparent">
              <CardContent className="p-5">
                <div className="h-4 bg-muted rounded-lg w-3/4 mb-3 animate-pulse" />
                <div className="h-3.5 bg-muted rounded-lg w-1/2 mb-4 animate-pulse" />
                <div className="flex gap-2">
                  <div className="h-6 bg-muted rounded-full w-16 animate-pulse" />
                  <div className="h-6 bg-muted rounded-full w-12 animate-pulse" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : clients.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
            {tab === "ativos" ? <Users className="h-8 w-8 text-muted-foreground" /> : <UserX className="h-8 w-8 text-muted-foreground" />}
          </div>
          <h3 className="text-lg font-semibold">
            {tab === "ativos" ? "Nenhum cliente ativo encontrado" : "Nenhum cliente inativo"}
          </h3>
          <p className="text-muted-foreground mt-1">
            {tab === "ativos"
              ? "Adicione seu primeiro cliente para começar"
              : "Clientes inativados aparecerão aqui"
            }
          </p>
          {tab === "ativos" && (
            <Button onClick={() => setShowForm(true)} className="mt-5 rounded-xl">
              <Plus className="h-4 w-4 mr-2" /> Novo Cliente
            </Button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        /* ═══════ GRID VIEW ═══════ */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {clients.map((client) => {
            const colors = getSegmentColor(client.segmento || "")
            return (
              <Card key={client.id} className="group cursor-pointer shadow-card hover:shadow-card-hover transition-all duration-200 border-transparent hover:border-primary/20 h-full overflow-hidden relative">
                {/* Colored segment top bar */}
                <div className={`h-1 ${colors.bg}`} />
                <CardContent className="p-5">
                  <Link href={`/clients/${client.id}`} className="block">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {client.avatar_url ? (
                          <img src={client.avatar_url} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" />
                        ) : (
                          <div className={`w-9 h-9 ${colors.light} rounded-lg flex items-center justify-center shrink-0`}>
                            <span className={`text-xs font-bold ${colors.text}`}>
                              {(client.nome_empresa || client.nome_cliente || "").split(" ").map(w => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-[15px] truncate">
                              {client.nome_empresa || client.nome_cliente}
                            </h3>
                            <ArrowUpRight className="h-3.5 w-3.5 text-transparent group-hover:text-primary transition-colors shrink-0" />
                          </div>
                          {client.nome_empresa && (
                            <p className="text-sm text-muted-foreground truncate mt-0.5">{client.nome_cliente}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {client.segmento && (
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 ${colors.light} ${colors.text} rounded-lg text-xs font-medium`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                          {client.segmento}
                        </span>
                      )}
                      {client.tag && (
                        <Badge variant="outline" className="text-[11px] font-medium px-2 h-6 rounded-full">{client.tag}</Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border/50">
                      {client.servicos_contratados ? (
                        <span className="truncate">{client.servicos_contratados}</span>
                      ) : (
                        <span />
                      )}
                      {client.pasta_drive && (
                        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-primary/40" />
                      )}
                    </div>
                  </Link>

                  {/* Inactivate/Reactivate button on hover */}
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleToggleStatus(client.id, client.status === "Ativo" ? "Inativo" : "Ativo")
                    }}
                    className={`absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg ${
                      client.status === "Ativo"
                        ? "hover:bg-red-50 text-muted-foreground hover:text-red-500"
                        : "hover:bg-emerald-50 text-muted-foreground hover:text-emerald-600"
                    }`}
                    title={client.status === "Ativo" ? "Inativar cliente" : "Reativar cliente"}
                  >
                    {client.status === "Ativo" ? (
                      <UserMinus className="h-4 w-4" />
                    ) : (
                      <UserCheck className="h-4 w-4" />
                    )}
                  </button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        /* ═══════ TABLE VIEW ═══════ */
        <Card className="shadow-card border-transparent overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3.5">
                    Cliente
                  </th>
                  <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3.5">
                    Segmento
                  </th>
                  <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3.5 hidden lg:table-cell">
                    Serviços
                  </th>
                  <th className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3.5 hidden md:table-cell">
                    Valor
                  </th>
                  <th className="text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3.5 hidden sm:table-cell">
                    Drive
                  </th>
                  <th className="text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3.5 w-[100px]">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => {
                  const colors = getSegmentColor(client.segmento || "")
                  return (
                    <tr
                      key={client.id}
                      className="border-b border-border/30 last:border-b-0 hover:bg-muted/30 transition-colors group"
                    >
                      {/* Client Name */}
                      <td className="px-5 py-4">
                        <Link href={`/clients/${client.id}`} className="block">
                          <div className="flex items-center gap-3">
                            {client.avatar_url ? (
                              <img src={client.avatar_url} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" />
                            ) : (
                              <div className={`w-9 h-9 ${colors.light} rounded-lg flex items-center justify-center shrink-0`}>
                                <span className={`text-xs font-bold ${colors.text}`}>
                                  {(client.nome_empresa || client.nome_cliente || "")
                                    .split(" ")
                                    .map(w => w[0])
                                    .filter(Boolean)
                                    .slice(0, 2)
                                    .join("")
                                    .toUpperCase()}
                                </span>
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-semibold truncate">
                                {client.nome_empresa || client.nome_cliente}
                              </p>
                              {client.nome_empresa && (
                                <p className="text-xs text-muted-foreground truncate">{client.nome_cliente}</p>
                              )}
                            </div>
                          </div>
                        </Link>
                      </td>

                      {/* Segment */}
                      <td className="px-4 py-4">
                        {client.segmento ? (
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 ${colors.light} ${colors.text} rounded-lg text-xs font-medium`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                            {client.segmento}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>

                      {/* Services */}
                      <td className="px-4 py-4 hidden lg:table-cell">
                        {client.servicos_contratados ? (
                          <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                            {client.servicos_contratados}
                          </p>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>

                      {/* Value */}
                      <td className="px-4 py-4 text-right hidden md:table-cell">
                        {client.valor_servico ? (
                          <span className="text-sm font-semibold tabular-nums">
                            R$ {Number(client.valor_servico).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>

                      {/* Drive */}
                      <td className="px-4 py-4 text-center hidden sm:table-cell">
                        {client.pasta_drive ? (
                          <a
                            href={client.pasta_drive}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                          >
                            <FolderOpen className="h-4 w-4" />
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleToggleStatus(client.id, client.status === "Ativo" ? "Inativo" : "Ativo")}
                            className={`p-1.5 rounded-lg transition-colors ${
                              client.status === "Ativo"
                                ? "text-muted-foreground/50 hover:text-red-500 hover:bg-red-50"
                                : "text-muted-foreground/50 hover:text-emerald-600 hover:bg-emerald-50"
                            }`}
                            title={client.status === "Ativo" ? "Inativar" : "Reativar"}
                          >
                            {client.status === "Ativo" ? (
                              <UserMinus className="h-4 w-4" />
                            ) : (
                              <UserCheck className="h-4 w-4" />
                            )}
                          </button>
                          <Link href={`/clients/${client.id}`}>
                            <div className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-primary hover:bg-primary/5 transition-colors">
                              <ChevronRight className="h-4 w-4" />
                            </div>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <ClientFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        onSuccess={fetchClients}
      />
    </div>
  )
}
