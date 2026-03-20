"use client"

import { useState, useEffect, Suspense } from "react"
import { createClient } from "@/lib/supabase/client"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import Image from "next/image"

function LoginContent() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const searchParams = useSearchParams()

  useEffect(() => {
    const errorParam = searchParams.get("error")
    if (errorParam === "unauthorized") {
      setError("Este e-mail não está autorizado. Peça ao administrador para adicionar você na Equipe.")
    } else if (errorParam === "auth") {
      setError("Erro na autenticação. Tente novamente.")
    }
  }, [searchParams])

  async function handleGoogleLogin() {
    setLoading(true)
    setError("")

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    })

    if (error) {
      setError("Erro ao conectar com Google")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left side - Brand */}
      <div className="hidden lg:flex lg:w-[50%] bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 relative overflow-hidden">
        <div className="absolute top-20 right-20 w-72 h-72 rounded-full bg-white/10 blur-xl" />
        <div className="absolute bottom-20 left-10 w-56 h-56 rounded-full bg-white/5 blur-xl" />
        <div className="absolute top-1/2 left-1/3 w-40 h-40 rounded-full bg-emerald-400/30 blur-2xl" />

        <div className="relative z-10 flex flex-col justify-center px-16 xl:px-20">
          <Image
            src="/logo-full.png"
            alt="Franca Assessoria"
            width={220}
            height={70}
            className="mb-10 drop-shadow-lg"
          />
          <h1 className="text-4xl xl:text-5xl font-bold text-white mb-4 leading-tight tracking-tight">
            Gestão de<br />
            Clientes<br />
            Inteligente
          </h1>
          <p className="text-emerald-100 text-lg max-w-md leading-relaxed">
            Centralize seus clientes, acessos, reuniões e performance em um único lugar.
          </p>

          <div className="mt-16 flex gap-12">
            <div>
              <p className="text-3xl font-bold text-white tabular-nums">360</p>
              <p className="text-sm text-emerald-200 mt-0.5">Visão completa</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-white">IA</p>
              <p className="text-sm text-emerald-200 mt-0.5">Insights automáticos</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-white">Ads</p>
              <p className="text-sm text-emerald-200 mt-0.5">Performance integrada</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-[400px] text-center">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-12">
            <Image
              src="/logo.png"
              alt="Franca"
              width={40}
              height={40}
              style={{ width: 'auto', height: 'auto' }}
            />
            <div className="text-left">
              <h1 className="text-lg font-bold tracking-tight">Franca Hub</h1>
              <p className="text-xs text-muted-foreground">Gestão de Clientes</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight">Bem-vindo de volta</h2>
            <p className="text-muted-foreground mt-2">Entre com sua conta Google para acessar o painel</p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm font-medium px-4 py-3 rounded-xl border border-red-100 mb-6 text-left">
              {error}
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            className="w-full h-12 text-sm font-medium rounded-xl gap-3"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            {loading ? "Conectando..." : "Entrar com Google"}
          </Button>

          <p className="text-xs text-muted-foreground/50 mt-4">
            Apenas e-mails autorizados pela equipe podem acessar
          </p>

          <p className="text-center text-xs text-muted-foreground/60 mt-16">
            Franca Assessoria &middot; Todos os direitos reservados
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  )
}
