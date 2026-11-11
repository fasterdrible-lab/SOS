"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const inputClass =
  "bg-foreground/5 border-foreground/10 text-foreground placeholder:text-foreground/30 focus-visible:ring-[#D4A64F]"

const MIN_PASSWORD = 12

export function ResetForm({ token, email }: { token: string; email: string }) {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError("")
    if (password !== confirm) {
      setError("As senhas não conferem.")
      return
    }

    setLoading(true)
    const response = await fetch(`/api/password-resets/${token}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    }).catch(() => null)
    const payload = (await response?.json().catch(() => null)) as { error?: string } | null

    if (!response?.ok) {
      setLoading(false)
      setError(payload?.error ?? "Não foi possível gravar a senha.")
      return
    }

    const result = await signIn("credentials", { email, password, redirect: false })
    setLoading(false)
    router.push(result?.error ? "/login" : "/meu-dia")
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="reset-password">Nova senha</Label>
        <Input
          id="reset-password"
          type="password"
          required
          minLength={MIN_PASSWORD}
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={inputClass}
        />
        <p className="text-xs text-muted-foreground">Pelo menos {MIN_PASSWORD} caracteres.</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="reset-confirm">Repita a senha</Label>
        <Input
          id="reset-confirm"
          type="password"
          required
          autoComplete="new-password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          className={inputClass}
        />
      </div>

      {error && (
        <p role="alert" className="rounded-md bg-red-400/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-[#D4A64F] font-semibold text-[#1E1B3A] hover:bg-[#E0B85A]"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Gravar nova senha"}
      </Button>
    </form>
  )
}
