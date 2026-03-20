"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Smartphone, Plus, Trash2, Loader2, Copy, Check, RefreshCw } from "lucide-react"
import { toast } from "sonner"
interface TwoFACode {
  id: string
  platform_name: string
  secret: string
  notes: string | null
  created_at: string
}

interface TwoFactorVaultProps {
  clientId: string
}

// TOTP implementation using Web Crypto API (works in browser + Node)
function base32Decode(encoded: string): Uint8Array {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  const clean = encoded.replace(/=+$/, '').toUpperCase()
  let bits = 0, value = 0
  const output: number[] = []
  for (const char of clean) {
    const idx = alphabet.indexOf(char)
    if (idx === -1) continue
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255)
      bits -= 8
    }
  }
  return new Uint8Array(output)
}

async function generateTOTP(secret: string): Promise<string> {
  try {
    const key = base32Decode(secret)
    const counter = Math.floor(Date.now() / 1000 / 30)
    const buffer = new ArrayBuffer(8)
    const view = new DataView(buffer)
    view.setUint32(4, counter, false)
    const cryptoKey = await crypto.subtle.importKey(
      'raw', key.buffer.slice(key.byteOffset, key.byteOffset + key.byteLength) as ArrayBuffer,
      { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
    )
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, buffer)
    const bytes = new Uint8Array(signature)
    const offset = bytes[19] & 0xf
    const code = (
      ((bytes[offset] & 0x7f) << 24) |
      ((bytes[offset + 1] & 0xff) << 16) |
      ((bytes[offset + 2] & 0xff) << 8) |
      (bytes[offset + 3] & 0xff)
    ) % 1000000
    return code.toString().padStart(6, '0')
  } catch {
    return '------'
  }
}

function getTimeRemaining(): number {
  return 30 - (Math.floor(Date.now() / 1000) % 30)
}

function TOTPCard({ code, onDelete }: { code: TwoFACode; onDelete: () => void }) {
  const [currentCode, setCurrentCode] = useState("------")
  const [timeLeft, setTimeLeft] = useState(getTimeRemaining)
  const [copied, setCopied] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    generateTOTP(code.secret).then(setCurrentCode)
    const interval = setInterval(async () => {
      const remaining = getTimeRemaining()
      setTimeLeft(remaining)
      if (remaining === 30) {
        const fresh = await generateTOTP(code.secret)
        setCurrentCode(fresh)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [code.secret])

  async function handleCopy() {
    await navigator.clipboard.writeText(currentCode)
    setCopied(true)
    toast.success("Código copiado!")
    setTimeout(() => setCopied(false), 1500)
  }

  async function handleDelete() {
    if (!confirm(`Remover 2FA de ${code.platform_name}?`)) return
    setDeleting(true)
    onDelete()
  }

  const isExpiring = timeLeft <= 7
  const progress = (timeLeft / 30) * 100

  // Format code with space in middle: "123 456"
  const formattedCode = currentCode.length === 6
    ? `${currentCode.slice(0, 3)} ${currentCode.slice(3)}`
    : currentCode

  return (
    <div className="bg-card border rounded-xl p-5 hover:shadow-md hover:border-primary/20 transition-all duration-200 group/card relative">
      {/* Delete */}
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="absolute top-3 right-3 p-1.5 rounded-lg opacity-0 group-hover/card:opacity-100 hover:bg-red-50 text-muted-foreground hover:text-destructive transition-all cursor-pointer"
      >
        {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
      </button>

      {/* Platform */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 bg-violet-100 rounded-lg flex items-center justify-center">
          <Smartphone className="h-4 w-4 text-violet-600" />
        </div>
        <div>
          <h5 className="font-semibold text-sm">{code.platform_name}</h5>
          {code.notes && <p className="text-[11px] text-muted-foreground">{code.notes}</p>}
        </div>
      </div>

      {/* Code display */}
      <div className="flex items-center gap-2 mb-3">
        <div className={`flex-1 rounded-xl px-4 py-3 text-center font-mono text-2xl font-bold tracking-[0.2em] border transition-colors ${
          isExpiring
            ? "bg-red-50 border-red-200 text-red-600"
            : "bg-muted/50 border-border/50 text-foreground"
        }`}>
          {formattedCode}
        </div>
        <button
          onClick={handleCopy}
          className="p-2.5 hover:bg-muted rounded-xl transition-colors shrink-0 cursor-pointer border border-border/50"
        >
          {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
        </button>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${isExpiring ? "bg-red-500" : "bg-emerald-500"}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className={`text-[11px] font-medium ${isExpiring ? "text-red-500" : "text-muted-foreground"}`}>
            {isExpiring ? "⚠ Expirando..." : "Atualiza em"}
          </span>
          <span className={`text-[11px] font-bold tabular-nums ${isExpiring ? "text-red-500" : "text-muted-foreground"}`}>
            {timeLeft}s
          </span>
        </div>
      </div>
    </div>
  )
}

export function TwoFactorVault({ clientId }: TwoFactorVaultProps) {
  const [codes, setCodes] = useState<TwoFACode[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [platform, setPlatform] = useState("")
  const [secret, setSecret] = useState("")
  const [notes, setNotes] = useState("")

  const fetch2FA = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/clients/${clientId}/2fa`)
    if (res.ok) setCodes(await res.json())
    setLoading(false)
  }, [clientId])

  useEffect(() => { fetch2FA() }, [fetch2FA])

  async function handleAdd() {
    if (!platform.trim() || !secret.trim()) {
      toast.error("Plataforma e código secreto são obrigatórios")
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/clients/${clientId}/2fa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform_name: platform, secret, notes }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success("2FA adicionado!")
      setPlatform("")
      setSecret("")
      setNotes("")
      setShowForm(false)
      fetch2FA()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao adicionar")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/clients/${clientId}/2fa`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    if (res.ok) {
      toast.success("2FA removido")
      fetch2FA()
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-violet-500/10 rounded-xl flex items-center justify-center">
            <Smartphone className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold">Códigos 2FA</h3>
            <p className="text-sm text-muted-foreground">
              {codes.length > 0 ? `${codes.length} código(s) cadastrado(s)` : "Nenhum código 2FA"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={fetch2FA} title="Atualizar">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => setShowForm(!showForm)}
            variant={showForm ? "ghost" : "default"}
            className="rounded-xl h-9 text-sm"
          >
            {showForm ? "Cancelar" : <><Plus className="h-4 w-4 mr-1.5" /> Adicionar 2FA</>}
          </Button>
        </div>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="bg-muted/30 border border-border/50 rounded-xl p-5 space-y-4">
          <p className="text-sm text-muted-foreground">
            O código secreto é a chave que aparece ao configurar 2FA no app (ex: <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">JBSWY3DPEHPK3PXP</code>). Geralmente aparece como texto alternativo ao QR Code.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Plataforma *</Label>
              <Input
                placeholder="Ex: Google, Meta, Shopify..."
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="rounded-xl h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Código Secreto *</Label>
              <Input
                placeholder="Ex: JBSWY3DPEHPK3PXP"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                className="rounded-xl h-10 font-mono"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Observações</Label>
            <Input
              placeholder="Ex: Conta principal, e-mail vinculado..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="rounded-xl h-10"
            />
          </div>
          <Button onClick={handleAdd} disabled={saving || !platform.trim() || !secret.trim()} className="rounded-xl h-10">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            Salvar 2FA
          </Button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="py-12 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
        </div>
      )}

      {/* Empty */}
      {!loading && codes.length === 0 && !showForm && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-violet-500/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Smartphone className="h-8 w-8 text-violet-600" />
          </div>
          <h3 className="text-lg font-semibold mb-1">Nenhum código 2FA</h3>
          <p className="text-muted-foreground text-sm mb-4">Adicione códigos de autenticação de dois fatores dos clientes</p>
          <Button onClick={() => setShowForm(true)} className="rounded-xl">
            <Plus className="h-4 w-4 mr-2" /> Adicionar 2FA
          </Button>
        </div>
      )}

      {/* Codes grid */}
      {!loading && codes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {codes.map(code => (
            <TOTPCard key={code.id} code={code} onDelete={() => handleDelete(code.id)} />
          ))}
        </div>
      )}
    </div>
  )
}
