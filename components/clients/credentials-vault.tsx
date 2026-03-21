"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Check,
  Copy,
  Eye,
  EyeOff,
  Globe,
  Key,
  Loader2,
  Plus,
  Shield,
  Trash2,
} from "lucide-react"
import { getPlatformStyle, platformSuggestions, defaultPlatforms } from "@/lib/constants"
import type { HubCredential } from "@/types/database"
import { toast } from "sonner"

interface CredentialsVaultProps {
  credentials: HubCredential[]
  clientId: string
  clientSegment: string
  onUpdate: () => void
}

export function CredentialsVault({ credentials, clientId, clientSegment, onUpdate }: CredentialsVaultProps) {
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [newPlatform, setNewPlatform] = useState("")
  const [newLogin, setNewLogin] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [newNotes, setNewNotes] = useState("")
  const [newType, setNewType] = useState<"standard" | "custom">("standard")

  const suggestions = [...defaultPlatforms, ...(platformSuggestions[clientSegment] || [])]
  const standardCredentials = credentials.filter((credential) => credential.credential_type === "standard")
  const customCredentials = credentials.filter((credential) => credential.credential_type === "custom")

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`${type} copiado!`)
    } catch {
      toast.error("Erro ao copiar")
    }
  }

  async function handleAdd() {
    if (!newPlatform.trim()) {
      toast.error("Nome da plataforma e obrigatorio")
      return
    }

    setSaving(true)
    try {
      const allCredentials = [
        ...credentials.map((credential) => ({
          credential_type: credential.credential_type,
          platform_name: credential.platform_name,
          login: credential.login,
          password: credential.password,
          notes: credential.notes,
        })),
        {
          credential_type: newType,
          platform_name: newPlatform.trim(),
          login: newLogin.trim() || null,
          password: newPassword.trim() || null,
          notes: newNotes.trim() || null,
        },
      ]

      const response = await fetch(`/api/clients/${clientId}/credentials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(allCredentials),
      })

      if (!response.ok) throw new Error("Erro ao salvar")

      toast.success("Acesso adicionado!")
      setNewPlatform("")
      setNewLogin("")
      setNewPassword("")
      setNewNotes("")
      setNewType("standard")
      onUpdate()
    } catch {
      toast.error("Erro ao adicionar acesso")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(credentialId: string) {
    if (!confirm("Remover este acesso?")) return

    setDeleting(credentialId)
    try {
      const remaining = credentials
        .filter((credential) => credential.id !== credentialId)
        .map((credential) => ({
          credential_type: credential.credential_type,
          platform_name: credential.platform_name,
          login: credential.login,
          password: credential.password,
          notes: credential.notes,
        }))

      const response = await fetch(`/api/clients/${clientId}/credentials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(remaining),
      })

      if (!response.ok) throw new Error("Erro ao remover")

      toast.success("Acesso removido")
      onUpdate()
    } catch {
      toast.error("Erro ao remover acesso")
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[24px] border border-emerald-200/70 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_48%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(236,253,245,0.94))] p-5 lg:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10">
                <Shield className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold tracking-tight">Cofre de acessos</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Cadastre novos acessos no topo e use toda a largura para consultar os cards sem deixar informacao importante espremida.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[380px]">
            <MetricCard label="Total" value={String(credentials.length)} tone="emerald" />
            <MetricCard label="Padrao" value={String(standardCredentials.length)} tone="slate" />
            <MetricCard label="Especifico" value={String(customCredentials.length)} tone="violet" />
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-12">
          <div className="space-y-1.5 xl:col-span-4">
            <Label className="text-xs font-medium">Plataforma *</Label>
            <Input
              placeholder="Nome da plataforma"
              value={newPlatform}
              onChange={(event) => setNewPlatform(event.target.value)}
              className="h-11 rounded-2xl bg-white"
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {suggestions.slice(0, 8).map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setNewPlatform(suggestion)}
                  className={`cursor-pointer rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all ${
                    newPlatform === suggestion
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-border/60 bg-white text-muted-foreground hover:border-emerald-300 hover:text-foreground"
                  }`}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5 xl:col-span-2">
            <Label className="text-xs font-medium">Tipo</Label>
            <Select value={newType} onValueChange={(value) => setNewType(value as "standard" | "custom")}>
              <SelectTrigger className="h-11 rounded-2xl bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Padrao</SelectItem>
                <SelectItem value="custom">Especifico</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 xl:col-span-3">
            <Label className="text-xs font-medium">Login</Label>
            <Input
              placeholder="E-mail, usuario ou telefone"
              value={newLogin}
              onChange={(event) => setNewLogin(event.target.value)}
              className="h-11 rounded-2xl bg-white"
            />
          </div>

          <div className="space-y-1.5 xl:col-span-3">
            <Label className="text-xs font-medium">Senha</Label>
            <Input
              placeholder="Senha de acesso"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              type="password"
              className="h-11 rounded-2xl bg-white"
            />
          </div>

          <div className="space-y-1.5 md:col-span-2 xl:col-span-9">
            <Label className="text-xs font-medium">Observacoes</Label>
            <Input
              placeholder="Informacao extra sobre este acesso"
              value={newNotes}
              onChange={(event) => setNewNotes(event.target.value)}
              className="h-11 rounded-2xl bg-white"
            />
          </div>

          <div className="flex items-end md:col-span-2 xl:col-span-3">
            <Button onClick={handleAdd} disabled={saving || !newPlatform.trim()} className="h-11 w-full rounded-2xl">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Salvar acesso
            </Button>
          </div>
        </div>
      </div>

      {credentials.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[24px] border border-dashed border-border/60 bg-muted/20 px-6 py-16 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10">
            <Shield className="h-6 w-6 text-emerald-600/70" />
          </div>
          <p className="text-base font-medium text-foreground">Nenhum acesso cadastrado ainda</p>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            O formulario acima ja esta pronto para voce cadastrar a primeira credencial sem depender de um painel lateral.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {standardCredentials.length > 0 && (
            <section className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-500/10">
                    <Key className="h-4 w-4 text-slate-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold">Acessos padrao</h4>
                    <p className="text-xs text-muted-foreground">Plataformas recorrentes do cliente</p>
                  </div>
                </div>
                <span className="w-fit rounded-full bg-slate-500/10 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                  {standardCredentials.length} item(ns)
                </span>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {standardCredentials.map((credential) => (
                  <CredentialCard
                    key={credential.id}
                    credential={credential}
                    isVisible={visiblePasswords[credential.id] || false}
                    isDeleting={deleting === credential.id}
                    onToggleVisibility={() => togglePasswordVisibility(credential.id)}
                    onCopy={copyToClipboard}
                    onDelete={() => handleDelete(credential.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {customCredentials.length > 0 && (
            <section className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10">
                    <Globe className="h-4 w-4 text-violet-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold">Acessos especificos</h4>
                    <p className="text-xs text-muted-foreground">
                      {clientSegment ? `Relacionados ao segmento ${clientSegment}` : "Credenciais fora do pacote padrao"}
                    </p>
                  </div>
                </div>
                <span className="w-fit rounded-full bg-violet-500/10 px-2.5 py-1 text-[11px] font-semibold text-violet-700">
                  {customCredentials.length} item(ns)
                </span>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {customCredentials.map((credential) => (
                  <CredentialCard
                    key={credential.id}
                    credential={credential}
                    isVisible={visiblePasswords[credential.id] || false}
                    isDeleting={deleting === credential.id}
                    onToggleVisibility={() => togglePasswordVisibility(credential.id)}
                    onCopy={copyToClipboard}
                    onDelete={() => handleDelete(credential.id)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

function CredentialCard({
  credential,
  isVisible,
  isDeleting,
  onToggleVisibility,
  onCopy,
  onDelete,
}: {
  credential: HubCredential
  isVisible: boolean
  isDeleting: boolean
  onToggleVisibility: () => void
  onCopy: (text: string, type: string) => void
  onDelete: () => void
}) {
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const { icon: PlatformIcon, bgColor } = getPlatformStyle(credential.platform_name)

  async function handleCopy(value: string, field: "Login" | "Senha") {
    await onCopy(value, field)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 1500)
  }

  return (
    <div className="group/card relative rounded-[22px] border border-border/60 bg-white p-4 shadow-sm shadow-slate-950/5 transition-all duration-200 hover:border-border hover:shadow-md">
      <button
        type="button"
        onClick={onDelete}
        disabled={isDeleting}
        className="absolute right-3 top-3 rounded-lg p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-red-50 hover:text-destructive group-hover/card:opacity-100"
      >
        {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
      </button>

      <div className="mb-4 flex items-center gap-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${bgColor}`}>
          <PlatformIcon className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{credential.platform_name}</p>
          <p className="text-[11px] text-muted-foreground">
            {credential.credential_type === "custom" ? "Especifico" : "Padrao"}
          </p>
        </div>
      </div>

      <FieldRow
        label="Login"
        value={credential.login}
        copied={copiedField === "Login"}
        onCopy={credential.login ? () => handleCopy(credential.login!, "Login") : undefined}
      />

      <FieldRow
        label="Senha"
        value={credential.password ? (isVisible ? credential.password : "••••••••") : null}
        mono
        copied={copiedField === "Senha"}
        onCopy={credential.password ? () => handleCopy(credential.password!, "Senha") : undefined}
        onToggleVisibility={credential.password ? onToggleVisibility : undefined}
        visible={isVisible}
      />

      {credential.notes && (
        <div className="mt-4 border-t border-border/50 pt-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Observacoes</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{credential.notes}</p>
        </div>
      )}
    </div>
  )
}

function FieldRow({
  label,
  value,
  mono,
  copied,
  onCopy,
  onToggleVisibility,
  visible,
}: {
  label: string
  value: string | null
  mono?: boolean
  copied?: boolean
  onCopy?: () => void
  onToggleVisibility?: () => void
  visible?: boolean
}) {
  return (
    <div className="mb-3">
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
      <div className="flex items-center gap-1.5">
        <div
          className={`flex min-h-[34px] flex-1 items-center rounded-xl border border-border/60 bg-muted/40 px-3 text-xs ${
            mono ? "font-mono" : ""
          }`}
        >
          {value || <span className="text-muted-foreground/50">--</span>}
        </div>

        {onToggleVisibility && (
          <button
            type="button"
            onClick={onToggleVisibility}
            className="rounded-lg border border-border/60 p-2 transition-colors hover:bg-muted"
          >
            {visible ? <EyeOff className="h-3.5 w-3.5 text-muted-foreground" /> : <Eye className="h-3.5 w-3.5 text-muted-foreground" />}
          </button>
        )}

        {onCopy && (
          <button
            type="button"
            onClick={onCopy}
            className="rounded-lg border border-border/60 p-2 transition-colors hover:bg-muted"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
          </button>
        )}
      </div>
    </div>
  )
}

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: "emerald" | "slate" | "violet"
}) {
  const toneClass =
    tone === "slate"
      ? "bg-slate-500/10 text-slate-700"
      : tone === "violet"
        ? "bg-violet-500/10 text-violet-700"
        : "bg-emerald-500/10 text-emerald-700"

  return (
    <div className="rounded-2xl border border-white/70 bg-white/85 px-4 py-3 shadow-sm shadow-emerald-950/5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-sm font-semibold ${toneClass}`}>{value}</p>
    </div>
  )
}
