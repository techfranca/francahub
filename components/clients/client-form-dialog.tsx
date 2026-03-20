"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Plus, Trash2, User, MapPin, DollarSign, Shield, ChevronLeft, ChevronRight, Check } from "lucide-react"
import { SEGMENTOS, CANAIS_VENDA, SERVICOS_DISPONIVEIS, MODELOS_PAGAMENTO, emptyClient, defaultPlatforms, platformSuggestions } from "@/lib/constants"
import type { HubClient } from "@/types/database"
import { toast } from "sonner"

interface ClientFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  editClient?: HubClient | null
}

interface CredentialForm {
  id: string
  credential_type: "standard" | "custom"
  platform_name: string
  login: string
  password: string
  notes: string
}

const STEPS = [
  { key: "dados", label: "Dados", icon: User },
  { key: "endereco", label: "Endereço", icon: MapPin },
  { key: "financeiro", label: "Financeiro", icon: DollarSign },
  { key: "acessos", label: "Acessos", icon: Shield },
] as const

export function ClientFormDialog({ open, onOpenChange, onSuccess, editClient }: ClientFormDialogProps) {
  const isEdit = !!editClient
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<Record<string, string>>(() =>
    isEdit ? { ...editClient } as unknown as Record<string, string> : { ...emptyClient }
  )
  const [credentials, setCredentials] = useState<CredentialForm[]>([])

  function updateField(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))

    if (field === "segmento" && value && !isEdit) {
      const standardCreds: CredentialForm[] = defaultPlatforms.map(p => ({
        id: crypto.randomUUID(),
        credential_type: "standard",
        platform_name: p,
        login: "",
        password: "",
        notes: "",
      }))
      setCredentials(standardCreds)
    }
  }

  function addCustomCredential() {
    setCredentials(prev => [...prev, {
      id: crypto.randomUUID(),
      credential_type: "custom",
      platform_name: "",
      login: "",
      password: "",
      notes: "",
    }])
  }

  function removeCredential(id: string) {
    setCredentials(prev => prev.filter(c => c.id !== id))
  }

  function updateCredential(id: string, field: string, value: string) {
    setCredentials(prev => prev.map(c =>
      c.id === id ? { ...c, [field]: value } : c
    ))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nome_cliente) {
      toast.error("Nome do cliente é obrigatório")
      setStep(0)
      return
    }

    setLoading(true)

    try {
      const url = isEdit ? `/api/clients/${editClient!.id}` : "/api/clients"
      const method = isEdit ? "PATCH" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          valor_servico: form.valor_servico ? parseFloat(form.valor_servico) : null,
          dia_pagamento: form.dia_pagamento ? parseInt(form.dia_pagamento) : null,
          faturamento_medio: form.faturamento_medio ? parseFloat(form.faturamento_medio) : null,
          credentials: credentials.filter(c => c.platform_name),
        }),
      })

      if (!res.ok) throw new Error("Erro ao salvar")

      if (isEdit && credentials.length) {
        await fetch(`/api/clients/${editClient!.id}/credentials`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(credentials),
        })
      }

      toast.success(isEdit ? "Cliente atualizado!" : "Cliente criado!")
      onOpenChange(false)
      onSuccess()
    } catch {
      toast.error("Erro ao salvar cliente")
    } finally {
      setLoading(false)
    }
  }

  const segmentoSuggestions = platformSuggestions[form.segmento] || []
  const currentStep = STEPS[step]
  const isLastStep = step === STEPS.length - 1
  const isFirstStep = step === 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-8 pt-7 pb-5 border-b bg-muted/30">
          <DialogTitle className="text-lg font-bold">{isEdit ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>

          {/* Step indicator — horizontal progress bar */}
          <div className="flex items-center gap-3 mt-4">
            {STEPS.map((s, i) => {
              const Icon = s.icon
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setStep(i)}
                  className="flex items-center gap-3 flex-1 group"
                >
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all w-full ${
                    i === step
                      ? "bg-white shadow-sm text-foreground border border-border/60"
                      : i < step
                      ? "text-emerald-600 hover:bg-white/60"
                      : "text-muted-foreground hover:bg-white/60"
                  }`}>
                    <div className={`flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold shrink-0 ${
                      i === step
                        ? "bg-primary text-primary-foreground"
                        : i < step
                        ? "bg-emerald-100 text-emerald-600"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {i < step ? <Check className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
                    </div>
                    <span>{s.label}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden flex-1 min-h-0">
          {/* Scrollable content area */}
          <div className="overflow-y-auto px-8 py-6 flex-1 min-h-0 max-h-[calc(90vh-220px)]">

            {/* ── DADOS ── */}
            {step === 0 && (
              <div className="space-y-6">
                <Section title="Identificação">
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Nome do Cliente *">
                      <Input value={form.nome_cliente} onChange={(e) => updateField("nome_cliente", e.target.value)} placeholder="Nome completo" required className="rounded-xl h-11" />
                    </Field>
                    <Field label="Nome da Empresa">
                      <Input value={form.nome_empresa} onChange={(e) => updateField("nome_empresa", e.target.value)} placeholder="Razão social ou fantasia" className="rounded-xl h-11" />
                    </Field>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <Field label="Segmento">
                      <Select value={form.segmento} onValueChange={(v) => updateField("segmento", v || "")}>
                        <SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {SEGMENTOS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Nicho">
                      <Input value={form.nicho} onChange={(e) => updateField("nicho", e.target.value)} placeholder="Ex: Moda feminina" className="rounded-xl h-11" />
                    </Field>
                    <Field label="Status">
                      <Select value={form.status} onValueChange={(v) => updateField("status", v || "Ativo")}>
                        <SelectTrigger className="rounded-xl h-11"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Ativo">Ativo</SelectItem>
                          <SelectItem value="Inativo">Inativo</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                </Section>

                <Section title="Contato">
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="E-mail">
                      <Input type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} placeholder="email@exemplo.com" className="rounded-xl h-11" />
                    </Field>
                    <Field label="Telefone">
                      <Input value={form.telefone} onChange={(e) => updateField("telefone", e.target.value)} placeholder="(00) 00000-0000" className="rounded-xl h-11" />
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="CNPJ/CPF">
                      <Input value={form.cnpj_cpf} onChange={(e) => updateField("cnpj_cpf", e.target.value)} placeholder="00.000.000/0000-00" className="rounded-xl h-11" />
                    </Field>
                    <Field label="Canal de Venda">
                      <Select value={form.canal_venda} onValueChange={(v) => updateField("canal_venda", v || "")}>
                        <SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {CANAIS_VENDA.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                </Section>

                <Section title="Serviços & Datas">
                  <Field label="Serviços Contratados">
                    <div className="flex flex-wrap gap-2">
                      {SERVICOS_DISPONIVEIS.map(s => {
                        const selected = form.servicos_contratados?.includes(s)
                        return (
                          <Button
                            key={s}
                            type="button"
                            variant={selected ? "default" : "outline"}
                            size="sm"
                            className={`h-9 text-xs rounded-full px-4 ${selected ? "" : "border-dashed"}`}
                            onClick={() => {
                              const current = form.servicos_contratados ? form.servicos_contratados.split(", ") : []
                              const next = selected ? current.filter(x => x !== s) : [...current, s]
                              updateField("servicos_contratados", next.join(", "))
                            }}
                          >
                            {selected && <Check className="h-3 w-3 mr-1" />}
                            {s}
                          </Button>
                        )
                      })}
                    </div>
                  </Field>
                  <div className="grid grid-cols-3 gap-4">
                    <Field label="Tag">
                      <Input value={form.tag} onChange={(e) => updateField("tag", e.target.value)} placeholder="Identificação rápida" className="rounded-xl h-11" />
                    </Field>
                    <Field label="Data Início">
                      <Input type="date" value={form.data_inicio} onChange={(e) => updateField("data_inicio", e.target.value)} className="rounded-xl h-11" />
                    </Field>
                    <Field label="Data Encerramento">
                      <Input type="date" value={form.data_encerramento} onChange={(e) => updateField("data_encerramento", e.target.value)} className="rounded-xl h-11" />
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Link do Google Drive">
                      <Input value={form.pasta_drive} onChange={(e) => updateField("pasta_drive", e.target.value)} placeholder="https://drive.google.com/drive/folders/..." className="rounded-xl h-11" />
                    </Field>
                    <Field label="Site">
                      <Input value={form.website_url || ""} onChange={(e) => updateField("website_url", e.target.value)} placeholder="https://exemplo.com.br" className="rounded-xl h-11" />
                    </Field>
                  </div>
                </Section>
              </div>
            )}

            {/* ── ENDEREÇO ── */}
            {step === 1 && (
              <div className="space-y-6">
                <Section title="Localização">
                  <div className="grid grid-cols-4 gap-4">
                    <div className="col-span-3">
                      <Field label="Logradouro">
                        <Input value={form.endereco} onChange={(e) => updateField("endereco", e.target.value)} placeholder="Rua, Avenida, Quadra..." className="rounded-xl h-11" />
                      </Field>
                    </div>
                    <Field label="Número">
                      <Input value={form.numero_endereco} onChange={(e) => updateField("numero_endereco", e.target.value)} placeholder="123" className="rounded-xl h-11" />
                    </Field>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <Field label="CEP">
                      <Input value={form.cep} onChange={(e) => updateField("cep", e.target.value)} placeholder="00000-000" className="rounded-xl h-11" />
                    </Field>
                    <Field label="Cidade">
                      <Input value={form.cidade} onChange={(e) => updateField("cidade", e.target.value)} placeholder="Cidade" className="rounded-xl h-11" />
                    </Field>
                    <Field label="Estado">
                      <Input value={form.estado} onChange={(e) => updateField("estado", e.target.value)} placeholder="UF" className="rounded-xl h-11" />
                    </Field>
                  </div>
                </Section>

                <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">Endereço opcional</p>
                    <p className="text-xs text-blue-600 mt-0.5">O endereço é utilizado apenas para referência interna e não é obrigatório.</p>
                  </div>
                </div>
              </div>
            )}

            {/* ── FINANCEIRO ── */}
            {step === 2 && (
              <div className="space-y-6">
                <Section title="Dados Financeiros">
                  <div className="grid grid-cols-3 gap-4">
                    <Field label="Valor do Serviço (R$)">
                      <Input type="number" step="0.01" value={form.valor_servico} onChange={(e) => updateField("valor_servico", e.target.value)} placeholder="0,00" className="rounded-xl h-11" />
                    </Field>
                    <Field label="Dia de Pagamento">
                      <Input type="number" min="1" max="31" value={form.dia_pagamento} onChange={(e) => updateField("dia_pagamento", e.target.value)} placeholder="1-31" className="rounded-xl h-11" />
                    </Field>
                    <Field label="Modelo de Pagamento">
                      <Select value={form.modelo_pagamento} onValueChange={(v) => updateField("modelo_pagamento", v || "Fixo")}>
                        <SelectTrigger className="rounded-xl h-11"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {MODELOS_PAGAMENTO.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                  <Field label="Faturamento Médio (R$)">
                    <Input type="number" step="0.01" value={form.faturamento_medio} onChange={(e) => updateField("faturamento_medio", e.target.value)} placeholder="0,00" className="rounded-xl h-11" />
                  </Field>
                </Section>

                <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 flex items-start gap-3">
                  <DollarSign className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-emerald-900">Gestão financeira</p>
                    <p className="text-xs text-emerald-600 mt-0.5">Esses dados ajudam no controle de receita e nos relatórios financeiros da agência.</p>
                  </div>
                </div>
              </div>
            )}

            {/* ── ACESSOS ── */}
            {step === 3 && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Credenciais de acesso</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Plataformas e logins do cliente</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addCustomCredential} className="rounded-xl h-9">
                    <Plus className="h-4 w-4 mr-1.5" /> Adicionar
                  </Button>
                </div>

                {segmentoSuggestions.length > 0 && credentials.every(c => c.credential_type === "standard") && (
                  <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/40 rounded-xl">
                    <span className="text-xs text-muted-foreground font-medium">Sugestões ({form.segmento}):</span>
                    {segmentoSuggestions.map(p => (
                      <Button
                        key={p}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs rounded-full"
                        onClick={() => {
                          if (!credentials.some(c => c.platform_name === p)) {
                            setCredentials(prev => [...prev, {
                              id: crypto.randomUUID(),
                              credential_type: "custom",
                              platform_name: p,
                              login: "",
                              password: "",
                              notes: "",
                            }])
                          }
                        }}
                      >
                        + {p}
                      </Button>
                    ))}
                  </div>
                )}

                {credentials.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-2xl">
                    <Shield className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-medium">Nenhum acesso cadastrado</p>
                    <p className="text-xs mt-1 opacity-70">Selecione um segmento na etapa 1 para gerar acessos automaticamente,<br/>ou clique em &quot;Adicionar&quot; para incluir manualmente.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {credentials.map((cred) => (
                      <div key={cred.id} className="bg-muted/30 border border-border/50 rounded-xl p-4 space-y-3 relative group">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute top-2 right-2 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"
                          onClick={() => removeCredential(cred.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                        </Button>
                        <div>
                          {cred.credential_type === "standard" ? (
                            <p className="font-semibold text-sm">{cred.platform_name}</p>
                          ) : (
                            <Input
                              value={cred.platform_name}
                              onChange={(e) => updateCredential(cred.id, "platform_name", e.target.value)}
                              placeholder="Nome da plataforma"
                              className="h-9 rounded-lg text-sm font-medium"
                            />
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            value={cred.login}
                            onChange={(e) => updateCredential(cred.id, "login", e.target.value)}
                            placeholder="Login / E-mail"
                            className="h-9 rounded-lg text-sm"
                          />
                          <Input
                            type="password"
                            value={cred.password}
                            onChange={(e) => updateCredential(cred.id, "password", e.target.value)}
                            placeholder="Senha"
                            className="h-9 rounded-lg text-sm"
                          />
                        </div>
                        <Input
                          value={cred.notes}
                          onChange={(e) => updateCredential(cred.id, "notes", e.target.value)}
                          placeholder="Observações (opcional)"
                          className="h-9 rounded-lg text-sm"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer with navigation */}
          <div className="flex items-center justify-between px-8 py-5 border-t bg-muted/20">
            <Button
              type="button"
              variant="ghost"
              onClick={() => isFirstStep ? onOpenChange(false) : setStep(step - 1)}
              className="rounded-xl h-10"
            >
              {isFirstStep ? (
                "Cancelar"
              ) : (
                <><ChevronLeft className="h-4 w-4 mr-1" /> Voltar</>
              )}
            </Button>

            <div className="flex items-center gap-2">
              {/* Step dots */}
              <div className="flex gap-1.5 mr-3">
                {STEPS.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all ${
                      i === step ? "w-6 bg-primary" : i < step ? "w-1.5 bg-emerald-400" : "w-1.5 bg-muted-foreground/20"
                    }`}
                  />
                ))}
              </div>

              {!isLastStep && (
                <Button type="button" onClick={() => setStep(step + 1)} variant="outline" className="rounded-xl h-10 min-w-[120px]">
                  Próximo <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
              <Button type="submit" disabled={loading} className="font-semibold min-w-[140px] rounded-xl h-10">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {isEdit ? "Salvar" : "Criar Cliente"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
        <div className="h-px flex-1 bg-border/60" />
        {title}
        <div className="h-px flex-1 bg-border/60" />
      </h3>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium text-foreground/70">{label}</Label>
      {children}
    </div>
  )
}
