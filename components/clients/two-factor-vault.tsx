"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Check, Copy, Loader2, Plus, RefreshCw, Smartphone, Trash2 } from "lucide-react"
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

function base32Decode(encoded: string): Uint8Array {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
  const clean = encoded.replace(/=+$/, "").toUpperCase()
  let bits = 0
  let value = 0
  const output: number[] = []

  for (const char of clean) {
    const index = alphabet.indexOf(char)
    if (index === -1) continue

    value = (value << 5) | index
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
      "raw",
      key.buffer.slice(key.byteOffset, key.byteOffset + key.byteLength) as ArrayBuffer,
      { name: "HMAC", hash: "SHA-1" },
      false,
      ["sign"]
    )

    const signature = await crypto.subtle.sign("HMAC", cryptoKey, buffer)
    const bytes = new Uint8Array(signature)
    const offset = bytes[19] & 0xf
    const code = (
      ((bytes[offset] & 0x7f) << 24) |
      ((bytes[offset + 1] & 0xff) << 16) |
      ((bytes[offset + 2] & 0xff) << 8) |
      (bytes[offset + 3] & 0xff)
    ) % 1000000

    return code.toString().padStart(6, "0")
  } catch {
    return "------"
  }
}

function getTimeRemaining() {
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
        const freshCode = await generateTOTP(code.secret)
        setCurrentCode(freshCode)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [code.secret])

  async function handleCopy() {
    await navigator.clipboard.writeText(currentCode)
    setCopied(true)
    toast.success("Codigo copiado!")
    setTimeout(() => setCopied(false), 1500)
  }

  async function handleDelete() {
    if (!confirm(`Remover 2FA de ${code.platform_name}?`)) return
    setDeleting(true)
    onDelete()
  }

  const isExpiring = timeLeft <= 7
  const progress = (timeLeft / 30) * 100
  const formattedCode = currentCode.length === 6 ? `${currentCode.slice(0, 3)} ${currentCode.slice(3)}` : currentCode

  return (
    <div className="group/card relative rounded-[22px] border border-border/60 bg-white p-4 shadow-sm shadow-slate-950/5 transition-all duration-200 hover:border-border hover:shadow-md">
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className="absolute right-3 top-3 rounded-lg p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-red-50 hover:text-destructive group-hover/card:opacity-100"
      >
        {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
      </button>

      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10">
          <Smartphone className="h-4 w-4 text-violet-600" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{code.platform_name}</p>
          <p className="text-[11px] text-muted-foreground">{code.notes || "Sem observacoes"}</p>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-2">
        <div
          className={`flex-1 rounded-2xl border px-3 py-3 text-center font-mono text-2xl font-bold tracking-[0.24em] transition-colors ${
            isExpiring
              ? "border-red-200 bg-red-50 text-red-600"
              : "border-border/60 bg-muted/40 text-foreground"
          }`}
        >
          {formattedCode}
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="rounded-xl border border-border/60 p-3 transition-colors hover:bg-muted"
        >
          {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
        </button>
      </div>

      <div className="space-y-2">
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${isExpiring ? "bg-red-500" : "bg-emerald-500"}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className={isExpiring ? "font-medium text-red-500" : "text-muted-foreground"}>
            {isExpiring ? "Expirando..." : "Atualiza em"}
          </span>
          <span className={`font-semibold tabular-nums ${isExpiring ? "text-red-500" : "text-muted-foreground"}`}>
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
  const [saving, setSaving] = useState(false)
  const [platform, setPlatform] = useState("")
  const [secret, setSecret] = useState("")
  const [notes, setNotes] = useState("")

  const fetch2FA = useCallback(async () => {
    setLoading(true)
    const response = await fetch(`/api/clients/${clientId}/2fa`)
    if (response.ok) setCodes(await response.json())
    setLoading(false)
  }, [clientId])

  useEffect(() => {
    fetch2FA()
  }, [fetch2FA])

  async function handleAdd() {
    if (!platform.trim() || !secret.trim()) {
      toast.error("Plataforma e codigo secreto sao obrigatorios")
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/clients/${clientId}/2fa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform_name: platform, secret, notes }),
      })

      if (!response.ok) throw new Error((await response.json()).error)

      toast.success("2FA adicionado!")
      setPlatform("")
      setSecret("")
      setNotes("")
      fetch2FA()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao adicionar")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    const response = await fetch(`/api/clients/${clientId}/2fa`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })

    if (response.ok) {
      toast.success("2FA removido")
      fetch2FA()
    }
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[24px] border border-violet-200/70 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.16),transparent_50%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,243,255,0.94))] p-5 lg:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-500/10">
                <Smartphone className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold tracking-tight">Codigos 2FA</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Cadastre o segredo uma vez e acompanhe os codigos em cards largos, sem depender de um painel fixo lateral.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row xl:items-start">
            <MetricCard label="Ativos" value={String(codes.length)} tone="violet" />
            <MetricCard label="Com nota" value={String(codes.filter((code) => code.notes).length)} tone="slate" />
            <Button variant="outline" className="h-11 rounded-2xl bg-white" onClick={fetch2FA}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar
            </Button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-12">
          <div className="space-y-1.5 xl:col-span-3">
            <Label className="text-xs font-medium">Plataforma *</Label>
            <Input
              placeholder="Ex: Google, Meta, Shopify"
              value={platform}
              onChange={(event) => setPlatform(event.target.value)}
              className="h-11 rounded-2xl bg-white"
            />
          </div>

          <div className="space-y-1.5 xl:col-span-5">
            <Label className="text-xs font-medium">Codigo secreto *</Label>
            <Input
              placeholder="Ex: JBSWY3DPEHPK3PXP"
              value={secret}
              onChange={(event) => setSecret(event.target.value)}
              className="h-11 rounded-2xl bg-white font-mono text-xs"
            />
            <p className="text-[11px] text-muted-foreground">
              Chave base32 que aparece abaixo do QR Code no servico.
            </p>
          </div>

          <div className="space-y-1.5 xl:col-span-2">
            <Label className="text-xs font-medium">Observacoes</Label>
            <Input
              placeholder="Conta principal"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="h-11 rounded-2xl bg-white"
            />
          </div>

          <div className="flex items-end md:col-span-2 xl:col-span-2">
            <Button
              onClick={handleAdd}
              disabled={saving || !platform.trim() || !secret.trim()}
              className="h-11 w-full rounded-2xl"
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Salvar 2FA
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : codes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[24px] border border-dashed border-border/60 bg-muted/20 px-6 py-16 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10">
            <Smartphone className="h-6 w-6 text-violet-600/70" />
          </div>
          <p className="text-base font-medium text-foreground">Nenhum codigo 2FA salvo</p>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            O formulario acima ja deixa o cadastro ao alcance, sem jogar a acao importante para um canto apertado da tela.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {codes.map((code) => (
            <TOTPCard key={code.id} code={code} onDelete={() => handleDelete(code.id)} />
          ))}
        </div>
      )}
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
  tone: "violet" | "slate"
}) {
  const toneClass = tone === "slate" ? "bg-slate-500/10 text-slate-700" : "bg-violet-500/10 text-violet-700"

  return (
    <div className="rounded-2xl border border-white/70 bg-white/85 px-4 py-3 shadow-sm shadow-violet-950/5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-sm font-semibold ${toneClass}`}>{value}</p>
    </div>
  )
}
