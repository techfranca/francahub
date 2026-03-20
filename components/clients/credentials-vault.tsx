"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Shield, Key, Globe, Eye, EyeOff, Copy, Check, Plus, Trash2, Loader2 } from "lucide-react"
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
  const [showAddForm, setShowAddForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  // New credential form state
  const [newPlatform, setNewPlatform] = useState("")
  const [newLogin, setNewLogin] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [newNotes, setNewNotes] = useState("")
  const [newType, setNewType] = useState<"standard" | "custom">("standard")

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`${type} copiado!`)
    } catch {
      toast.error("Erro ao copiar")
    }
  }

  // Platform suggestions based on segment
  const suggestions = [
    ...defaultPlatforms,
    ...(platformSuggestions[clientSegment] || []),
  ]

  async function handleAdd() {
    if (!newPlatform.trim()) {
      toast.error("Nome da plataforma é obrigatório")
      return
    }

    setSaving(true)
    try {
      // Send all existing + new credential
      const allCredentials = [
        ...credentials.map(c => ({
          credential_type: c.credential_type,
          platform_name: c.platform_name,
          login: c.login,
          password: c.password,
          notes: c.notes,
        })),
        {
          credential_type: newType,
          platform_name: newPlatform.trim(),
          login: newLogin.trim() || null,
          password: newPassword.trim() || null,
          notes: newNotes.trim() || null,
        },
      ]

      const res = await fetch(`/api/clients/${clientId}/credentials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(allCredentials),
      })

      if (!res.ok) throw new Error("Erro ao salvar")

      toast.success("Acesso adicionado!")
      setNewPlatform("")
      setNewLogin("")
      setNewPassword("")
      setNewNotes("")
      setNewType("standard")
      setShowAddForm(false)
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
        .filter(c => c.id !== credentialId)
        .map(c => ({
          credential_type: c.credential_type,
          platform_name: c.platform_name,
          login: c.login,
          password: c.password,
          notes: c.notes,
        }))

      const res = await fetch(`/api/clients/${clientId}/credentials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(remaining),
      })

      if (!res.ok) throw new Error("Erro ao remover")

      toast.success("Acesso removido")
      onUpdate()
    } catch {
      toast.error("Erro ao remover acesso")
    } finally {
      setDeleting(null)
    }
  }

  const standardCredentials = credentials.filter(c => c.credential_type === "standard")
  const customCredentials = credentials.filter(c => c.credential_type === "custom")

  return (
    <div className="space-y-6">
      {/* Header with Add button */}
      <div className="flex items-center justify-between pb-4 border-b">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
            <Shield className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold">Cofre de Acessos</h3>
            <p className="text-sm text-muted-foreground">
              {credentials.length > 0 ? `${credentials.length} credencial(is) salva(s)` : "Nenhum acesso cadastrado"}
            </p>
          </div>
        </div>
        <Button
          onClick={() => setShowAddForm(!showAddForm)}
          variant={showAddForm ? "ghost" : "default"}
          className="rounded-xl h-9 text-sm"
        >
          {showAddForm ? "Cancelar" : (
            <>
              <Plus className="h-4 w-4 mr-1.5" />
              Adicionar Acesso
            </>
          )}
        </Button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-muted/30 border border-border/50 rounded-xl p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Plataforma *</Label>
              <div className="space-y-2">
                <Input
                  placeholder="Nome da plataforma"
                  value={newPlatform}
                  onChange={(e) => setNewPlatform(e.target.value)}
                  className="rounded-xl h-10"
                />
                {/* Quick suggestions */}
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.slice(0, 8).map(s => (
                    <button
                      key={s}
                      onClick={() => setNewPlatform(s)}
                      className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                        newPlatform === s
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-white border-border/50 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Tipo</Label>
              <Select value={newType} onValueChange={(v) => setNewType(v as "standard" | "custom")}>
                <SelectTrigger className="rounded-xl h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Padrao</SelectItem>
                  <SelectItem value="custom">Especifico do segmento</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Login</Label>
              <Input
                placeholder="E-mail, usuario ou telefone"
                value={newLogin}
                onChange={(e) => setNewLogin(e.target.value)}
                className="rounded-xl h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Senha</Label>
              <Input
                placeholder="Senha de acesso"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                type="password"
                className="rounded-xl h-10"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Observacoes</Label>
            <Input
              placeholder="Alguma informacao extra sobre este acesso..."
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              className="rounded-xl h-10"
            />
          </div>
          <Button onClick={handleAdd} disabled={saving || !newPlatform.trim()} className="rounded-xl h-10">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            Salvar Acesso
          </Button>
        </div>
      )}

      {/* Empty state */}
      {credentials.length === 0 && !showAddForm && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Shield className="h-8 w-8 text-emerald-600" />
          </div>
          <h3 className="text-lg font-semibold mb-1">Nenhum acesso cadastrado</h3>
          <p className="text-muted-foreground text-sm mb-4">Adicione credenciais de acesso para este cliente</p>
          <Button onClick={() => setShowAddForm(true)} className="rounded-xl">
            <Plus className="h-4 w-4 mr-2" /> Adicionar Acesso
          </Button>
        </div>
      )}

      {/* Standard Credentials */}
      {standardCredentials.length > 0 && (
        <div>
          <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
            <Key className="h-3.5 w-3.5" /> Acessos Padrao
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {standardCredentials.map((cred) => (
              <CredentialCard
                key={cred.id}
                credential={cred}
                isVisible={visiblePasswords[cred.id] || false}
                isDeleting={deleting === cred.id}
                onToggleVisibility={() => togglePasswordVisibility(cred.id)}
                onCopy={copyToClipboard}
                onDelete={() => handleDelete(cred.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Custom Credentials */}
      {customCredentials.length > 0 && (
        <div>
          <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
            <Globe className="h-3.5 w-3.5" /> Acessos Especificos {clientSegment && `(${clientSegment})`}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {customCredentials.map((cred) => (
              <CredentialCard
                key={cred.id}
                credential={cred}
                isVisible={visiblePasswords[cred.id] || false}
                isDeleting={deleting === cred.id}
                onToggleVisibility={() => togglePasswordVisibility(cred.id)}
                onCopy={copyToClipboard}
                onDelete={() => handleDelete(cred.id)}
              />
            ))}
          </div>
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

  const handleCopy = (text: string, type: string) => {
    onCopy(text, type)
    setCopiedField(type)
    setTimeout(() => setCopiedField(null), 1500)
  }

  return (
    <div className="bg-card border rounded-xl p-5 hover:shadow-md hover:border-primary/20 transition-all duration-200 group/card relative">
      {/* Delete button */}
      <button
        onClick={onDelete}
        disabled={isDeleting}
        className="absolute top-3 right-3 p-1.5 rounded-lg opacity-0 group-hover/card:opacity-100 hover:bg-red-50 text-muted-foreground hover:text-destructive transition-all cursor-pointer"
      >
        {isDeleting ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Trash2 className="h-3.5 w-3.5" />
        )}
      </button>

      <div className="flex items-center gap-3 mb-4">
        <div className={`w-9 h-9 ${bgColor} rounded-lg flex items-center justify-center`}>
          <PlatformIcon className="h-4 w-4 text-white" />
        </div>
        <div>
          <h5 className="font-semibold text-sm">{credential.platform_name}</h5>
          <p className="text-[11px] text-muted-foreground">
            {credential.credential_type === "standard" ? "Padrao" : "Especifico"}
          </p>
        </div>
      </div>

      <div className="mb-3">
        <label className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1.5 block">Login</label>
        <div className="flex items-center gap-1.5">
          <div className="flex-1 bg-muted/50 rounded-lg px-3 py-2 text-sm font-mono truncate border border-border/50">
            {credential.login || "-"}
          </div>
          {credential.login && (
            <button
              onClick={() => handleCopy(credential.login!, "Login")}
              className="p-2 hover:bg-muted rounded-lg transition-colors shrink-0 cursor-pointer"
            >
              {copiedField === "Login" ? (
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </button>
          )}
        </div>
      </div>

      <div className="mb-3">
        <label className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1.5 block">Senha</label>
        <div className="flex items-center gap-1.5">
          <div className="flex-1 bg-muted/50 rounded-lg px-3 py-2 text-sm font-mono truncate border border-border/50">
            {credential.password ? (isVisible ? credential.password : "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022") : "-"}
          </div>
          {credential.password && (
            <>
              <button onClick={onToggleVisibility} className="p-2 hover:bg-muted rounded-lg transition-colors shrink-0 cursor-pointer">
                {isVisible ? <EyeOff className="h-3.5 w-3.5 text-muted-foreground" /> : <Eye className="h-3.5 w-3.5 text-muted-foreground" />}
              </button>
              <button
                onClick={() => handleCopy(credential.password!, "Senha")}
                className="p-2 hover:bg-muted rounded-lg transition-colors shrink-0 cursor-pointer"
              >
                {copiedField === "Senha" ? (
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {credential.notes && (
        <div className="mt-3 pt-3 border-t border-border/50">
          <label className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1 block">Observacoes</label>
          <p className="text-sm text-muted-foreground leading-relaxed">{credential.notes}</p>
        </div>
      )}
    </div>
  )
}
