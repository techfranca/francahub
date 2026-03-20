import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { KeyRound } from "lucide-react"

export default function CodigosPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Codigos de Verificacao</h1>
        <p className="text-muted-foreground mt-1">Codigos 2FA/OTP recebidos via e-mail</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" /> Em Desenvolvimento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            O modulo de codigos de verificacao sera migrado do francaverso na Fase 5.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
