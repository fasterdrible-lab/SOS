"use client"

import { FormEvent, useState } from "react"
import Link from "next/link"
import { BrainCircuit, Loader2, Send } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"

type ChatMessage = {
  id: string
  role: "USER" | "ASSISTANT"
  content: string
}

export function ConsultantChat({
  initialMessages,
  hasIntegration,
}: {
  initialMessages: ChatMessage[]
  hasIntegration: boolean
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [input, setInput] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState("")

  if (!hasIntegration) {
    return (
      <Card className="flex flex-1 flex-col items-center justify-center border-white/5 bg-card">
        <CardContent className="flex flex-col items-center py-12 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#D4A64F]/10">
            <BrainCircuit className="h-6 w-6 text-[#D4A64F]" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-white">
            Configure uma chave de IA para comecar
          </h3>
          <p className="max-w-sm text-sm text-muted-foreground">
            O Consultor Digital usa a integracao Anthropic da sua organizacao.
          </p>
          <Link
            href="/configuracoes"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#D4A64F] px-4 py-2 text-sm font-semibold text-[#1E1B3A] transition-colors hover:bg-[#E0B85A]"
          >
            Ir para Configuracoes
          </Link>
        </CardContent>
      </Card>
    )
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const content = input.trim()
    if (!content || isSending) return

    setError("")
    setIsSending(true)

    const optimisticMessage: ChatMessage = {
      id: `local-${Date.now()}`,
      role: "USER",
      content,
    }
    setMessages((current) => [...current, optimisticMessage])
    setInput("")

    const response = await fetch("/api/consultor/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    })

    setIsSending(false)

    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      setError(payload?.error ?? "Nao foi possivel enviar a mensagem.")
      return
    }

    setMessages((current) => [
      ...current,
      { id: payload.message.id, role: "ASSISTANT", content: payload.message.content },
    ])
  }

  return (
    <Card className="flex flex-1 flex-col overflow-hidden border-white/5 bg-card">
      <CardContent className="flex flex-1 flex-col gap-3 overflow-hidden p-4">
        <ScrollArea className="flex-1 pr-2">
          <div className="flex flex-col gap-3">
            {messages.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Pergunte algo sobre sua operacao comercial para comecar.
              </p>
            )}
            {messages.map((message) => (
              <div
                key={message.id}
                className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${
                  message.role === "USER"
                    ? "ml-auto bg-[#D4A64F] text-[#1E1B3A]"
                    : "bg-white/[0.04] text-white"
                }`}
              >
                {message.content}
              </div>
            ))}
          </div>
        </ScrollArea>

        {error && (
          <div className="rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <Input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Pergunte ao consultor digital..."
            disabled={isSending}
          />
          <Button
            type="submit"
            disabled={isSending || !input.trim()}
            className="bg-[#D4A64F] text-[#1E1B3A] hover:bg-[#E0B85A]"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
