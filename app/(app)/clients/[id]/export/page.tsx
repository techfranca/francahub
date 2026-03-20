"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Printer, Loader2 } from "lucide-react"

interface ExportData {
  client: {
    nome_empresa: string | null
    nome_cliente: string
    segmento: string | null
    nicho: string | null
    status: string
    email: string | null
    telefone: string | null
    cnpj_cpf: string | null
    endereco: string | null
    cidade: string | null
    estado: string | null
    valor_servico: number | null
    dia_pagamento: number | null
    modelo_pagamento: string | null
    servicos_contratados: string | null
    data_inicio: string | null
    data_encerramento: string | null
    behavioral_profile: string | null
    personality_notes: string | null
  }
  credentials: Array<{ platform_name: string; credential_type: string; login: string | null; notes: string | null }>
  notes: Array<{ content: string; is_pinned: boolean; created_at: string }>
  meetings: Array<{ title: string; meeting_date: string; status: string; duration_minutes: number | null }>
  campaigns: Array<{ name: string; status: string; objective: string | null; product_service: string | null; daily_budget: number | null }>
  insights: Array<{ title: string; content: string; insight_type: string; created_at: string }>
  exported_at: string
  exported_by: string
}

export default function ClientExportPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = params.id as string
  const [data, setData] = useState<ExportData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchExport() {
      const res = await fetch(`/api/clients/${clientId}/export`)
      if (res.ok) setData(await res.json())
      setLoading(false)
    }
    fetchExport()
  }, [clientId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!data) return <p className="text-center py-20 text-muted-foreground">Erro ao carregar dados</p>

  const { client } = data

  return (
    <div>
      {/* Actions bar (hidden in print) */}
      <div className="flex items-center gap-3 mb-6 print:hidden">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
        <Button size="sm" onClick={() => window.print()}>
          <Printer className="h-4 w-4 mr-2" /> Exportar PDF
        </Button>
      </div>

      {/* Print-friendly content */}
      <div className="max-w-3xl mx-auto space-y-8 print:space-y-6 print:text-sm">
        {/* Header */}
        <div className="border-b pb-4">
          <h1 className="text-2xl font-bold print:text-xl">
            {client.nome_empresa || client.nome_cliente}
          </h1>
          {client.nome_empresa && <p className="text-muted-foreground">{client.nome_cliente}</p>}
          <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
            <span>Status: <strong className={client.status === "Ativo" ? "text-emerald-600" : "text-red-600"}>{client.status}</strong></span>
            {client.segmento && <span>Segmento: <strong>{client.segmento}</strong></span>}
            {client.nicho && <span>Nicho: <strong>{client.nicho}</strong></span>}
          </div>
        </div>

        {/* Dados do Cliente */}
        <Section title="Dados do Cliente">
          <InfoGrid>
            <InfoItem label="E-mail" value={client.email} />
            <InfoItem label="Telefone" value={client.telefone} />
            <InfoItem label="CNPJ/CPF" value={client.cnpj_cpf} />
            <InfoItem label="Endereco" value={[client.endereco, client.cidade, client.estado].filter(Boolean).join(", ")} />
          </InfoGrid>
        </Section>

        {/* Financeiro */}
        <Section title="Financeiro & Servicos">
          <InfoGrid>
            <InfoItem label="Valor do Servico" value={client.valor_servico ? `R$ ${Number(client.valor_servico).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : null} />
            <InfoItem label="Dia de Pagamento" value={client.dia_pagamento?.toString()} />
            <InfoItem label="Modelo de Pagamento" value={client.modelo_pagamento} />
            <InfoItem label="Servicos Contratados" value={client.servicos_contratados} />
            <InfoItem label="Data Inicio" value={client.data_inicio} />
            <InfoItem label="Data Encerramento" value={client.data_encerramento} />
          </InfoGrid>
        </Section>

        {/* Perfil Comportamental */}
        {(client.behavioral_profile || client.personality_notes) && (
          <Section title="Perfil Comportamental">
            {client.behavioral_profile && <p className="text-sm">{client.behavioral_profile}</p>}
            {client.personality_notes && <p className="text-sm text-muted-foreground mt-1">{client.personality_notes}</p>}
          </Section>
        )}

        {/* Credenciais (sem senhas!) */}
        {data.credentials.length > 0 && (
          <Section title={`Cofre de Acessos (${data.credentials.length})`}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-1.5 font-medium">Plataforma</th>
                  <th className="py-1.5 font-medium">Login</th>
                  <th className="py-1.5 font-medium">Notas</th>
                </tr>
              </thead>
              <tbody>
                {data.credentials.map((cred, i) => (
                  <tr key={i} className="border-b border-border/30">
                    <td className="py-1.5">{cred.platform_name}</td>
                    <td className="py-1.5 text-muted-foreground">{cred.login || "—"}</td>
                    <td className="py-1.5 text-muted-foreground">{cred.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        {/* Notas */}
        {data.notes.length > 0 && (
          <Section title={`Notas (${data.notes.length})`}>
            <div className="space-y-2">
              {data.notes.map((note, i) => (
                <div key={i} className={`text-sm p-2 rounded ${note.is_pinned ? "bg-primary/5 border border-primary/20" : "bg-muted/30"}`}>
                  <p>{note.content}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(note.created_at).toLocaleDateString("pt-BR")}
                    {note.is_pinned && " · Fixada"}
                  </p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Reunioes */}
        {data.meetings.length > 0 && (
          <Section title={`Reunioes (${data.meetings.length})`}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-1.5 font-medium">Data</th>
                  <th className="py-1.5 font-medium">Titulo</th>
                  <th className="py-1.5 font-medium">Status</th>
                  <th className="py-1.5 font-medium">Duracao</th>
                </tr>
              </thead>
              <tbody>
                {data.meetings.map((m, i) => (
                  <tr key={i} className="border-b border-border/30">
                    <td className="py-1.5">{new Date(m.meeting_date).toLocaleDateString("pt-BR")}</td>
                    <td className="py-1.5">{m.title}</td>
                    <td className="py-1.5 text-muted-foreground">{m.status}</td>
                    <td className="py-1.5 text-muted-foreground">{m.duration_minutes ? `${m.duration_minutes}min` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        {/* Campanhas */}
        {data.campaigns.length > 0 && (
          <Section title={`Campanhas (${data.campaigns.length})`}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-1.5 font-medium">Nome</th>
                  <th className="py-1.5 font-medium">Status</th>
                  <th className="py-1.5 font-medium">Objetivo</th>
                  <th className="py-1.5 font-medium">Budget/dia</th>
                </tr>
              </thead>
              <tbody>
                {data.campaigns.map((c, i) => (
                  <tr key={i} className="border-b border-border/30">
                    <td className="py-1.5">{c.name}</td>
                    <td className="py-1.5">{c.status}</td>
                    <td className="py-1.5 text-muted-foreground">{c.objective || "—"}</td>
                    <td className="py-1.5 text-muted-foreground">{c.daily_budget ? `R$ ${Number(c.daily_budget).toFixed(2)}` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        {/* Insights */}
        {data.insights.length > 0 && (
          <Section title={`Insights IA (${data.insights.length})`}>
            <div className="space-y-2">
              {data.insights.map((insight, i) => (
                <div key={i} className="text-sm p-2 bg-muted/30 rounded">
                  <p className="font-medium">{insight.title}</p>
                  <p className="text-muted-foreground mt-0.5">{insight.content}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Footer */}
        <div className="border-t pt-4 text-xs text-muted-foreground flex justify-between">
          <span>Franca Hub - Relatorio do Cliente</span>
          <span>
            Exportado em {new Date(data.exported_at).toLocaleDateString("pt-BR")}{" "}
            por {data.exported_by}
          </span>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="print:break-inside-avoid">
      <h2 className="text-base font-semibold mb-3 border-b pb-1">{title}</h2>
      {children}
    </div>
  )
}

function InfoGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-8 gap-y-1.5">{children}</div>
}

function InfoItem({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (!value) return null
  return (
    <div className="flex justify-between py-0.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  )
}
