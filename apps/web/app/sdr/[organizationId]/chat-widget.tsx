"use client"

import { FormEvent, useState } from "react"
import { Loader2, MessageCircle, Send } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"

type ChatMessage = {
  id: string
  role: "LEAD" | "ASSISTANT"
  content: string
}

type Classification = "COLD" | "WARM" | "HOT"

const CLASSIFICATION_LABEL: Record<Classification, string> = {
  COLD: "Frio",
  WARM: "Morno",
  HOT: "Quente",
}

export function SdrChatWidget({
  organizationId,
  organizationName,
}: {
  organizationId: string
  organizationName: string
}) {
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [classification, setClassification] = useState<Classification | null>(
    null
  )
  const [input, setInput] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState("")
  const [unavailable, setUnavailable] = useState(false)

  async function ensureConversation(): Promise<string | null> {
    if (conversationId) return conversationId

    const response = await fetch(
      `/api/sdr/${organizationId}/conversations`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }
    )

    if (response.status === 422) {
      setUnavailable(true)
      return null
    }

    if (!response.ok) {
      setError("Nao foi possivel iniciar a conversa. Tente novamente.")
      return null
    }

    const payload = await response.json()
    setConversationId(payload.conversation.id)
    return payload.conversation.id as string
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const content = input.trim()
    if (!content || isSending) return

    setError("")
    setIsSending(true)

    const activeConversationId = await ensureConversation()

    if (!activeConversationId) {
      setIsSending(false)
      return
    }

    const optimisticMessage: ChatMessage = {
      id: `local-${Date.now()}`,
      role: "LEAD",
      content,
    }
    setMessages((current) => [...current, optimisticMessage])
    setInput("")

    const response = await fetch(
      `/api/sdr/${organizationId}/conversations/${activeConversationId}/messages`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      }
    )

    setIsSending(false)

    if (response.status === 422) {
      setUnavailable(true)
      return
    }

    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      setError(payload?.error ?? "Nao foi possivel enviar a mensagem.")
      return
    }

    setMessages((current) => [
      ...current,
      { id: payload.message.id, role: "ASSISTANT", content: payload.message.content },
    ])
    setClassification(payload.classification as Classification)
  }

  if (unavailable) {
    return (
      <Card className="w-full max-w-md border-white/5 bg-card">
        <CardContent className="flex flex-col items-center py-12 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#D4A64F]/10">
            <MessageCircle className="h-6 w-6 text-[#D4A64F]" />
          </div>
          <h1 className="text-lg font-semibold text-white">
            Atendimento indisponivel
          </h1>
          <p className="mt-2 max-w-xs text-sm text-muted-foreground">
            Este atendimento nao esta disponivel no momento. Tente novamente
            mais tarde.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="flex h-[600px] w-full max-w-md flex-col border-white/5 bg-card">
      <CardHeader className="flex-row items-center justify-between space-y-0 border-b border-white/5 pb-4">
        <div>
          <CardTitle className="text-base text-white">
            {organizationName}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Assistente comercial
          </p>
        </div>
        {classification && (
          <Badge className="bg-[#D4A64F]/10 text-[#D4A64F]">
            {CLASSIFICATION_LABEL[classification]}
          </Badge>
        )}
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-3 overflow-hidden p-4">
        <ScrollArea className="flex-1 pr-2">
          <div className="flex flex-col gap-3">
            {messages.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Envie uma mensagem para comecar a conversa.
              </p>
            )}
            {messages.map((message) => (
              <div
                key={message.id}
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  message.role === "LEAD"
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
            placeholder="Digite sua mensagem..."
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
