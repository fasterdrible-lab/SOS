"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Search } from "lucide-react"

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import type { SearchGroup, SearchResult } from "@/lib/search/global-search"
import { SEARCH_MIN_LENGTH, normalizeSearchTerm } from "@/lib/search/query"

const DEBOUNCE_MS = 250

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; groups: SearchGroup[] }
  | { status: "error"; message: string }

function isTyping(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  )
}

export function GlobalSearch() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [state, setState] = useState<State>({ status: "idle" })
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // Ctrl+K (ou Cmd+K) de qualquer tela; "/" fora de campos de texto.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const shortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k"
      if (shortcut || (event.key === "/" && !isTyping(event.target))) {
        event.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  const term = normalizeSearchTerm(query)

  useEffect(() => {
    if (!term) return
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setState({ status: "loading" })
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(term)}`, {
          signal: controller.signal,
        })
        const body = await response.json()
        if (!response.ok) {
          setState({ status: "error", message: body.error ?? "Não foi possível buscar." })
          return
        }
        setState({ status: "done", groups: body.groups })
        setActive(0)
      } catch {
        if (!controller.signal.aborted) {
          setState({ status: "error", message: "Não foi possível buscar." })
        }
      }
    }, DEBOUNCE_MS)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [term])

  const groups = term && state.status === "done" ? state.groups : []
  const results: SearchResult[] = groups.flatMap((group) => group.results)
  // Posicao do primeiro resultado de cada grupo na lista navegavel pelo teclado.
  const offsets = groups.map((_, index) =>
    groups.slice(0, index).reduce((total, group) => total + group.results.length, 0)
  )

  function changeOpen(next: boolean) {
    setOpen(next)
    if (!next) {
      setQuery("")
      setState({ status: "idle" })
    }
  }

  function go(result: SearchResult) {
    changeOpen(false)
    router.push(result.href)
  }

  function onInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (results.length === 0) return
    if (event.key === "ArrowDown") {
      event.preventDefault()
      setActive((index) => (index + 1) % results.length)
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      setActive((index) => (index - 1 + results.length) % results.length)
    } else if (event.key === "Enter") {
      event.preventDefault()
      go(results[Math.min(active, results.length - 1)])
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Buscar"
        className="flex h-8 items-center gap-2 rounded-lg border border-foreground/10 px-2 text-xs text-muted-foreground outline-none transition-colors hover:border-[#D4A64F]/40 hover:text-foreground focus-visible:ring-2 focus-visible:ring-[#D4A64F] sm:w-56 sm:px-3"
      >
        <Search className="h-3.5 w-3.5 shrink-0" />
        <span className="hidden sm:inline">Buscar...</span>
        <kbd className="ml-auto hidden rounded border border-foreground/10 px-1.5 font-sans text-[10px] sm:inline">
          Ctrl K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={changeOpen}>
        <DialogContent
          showCloseButton={false}
          initialFocus={inputRef}
          className="top-[15%] translate-y-0 gap-0 p-0 sm:max-w-lg"
        >
          <DialogTitle className="sr-only">Busca global</DialogTitle>
          <div className="flex items-center gap-2 border-b border-foreground/10 px-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={onInputKeyDown}
              placeholder="Negociações, empresas, contatos, planos..."
              aria-label="Termo da busca"
              className="h-11 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
            {term && state.status === "loading" && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>

          <div className="max-h-[60vh] overflow-y-auto p-2" role="listbox" aria-label="Resultados">
            {!term && (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                Digite ao menos {SEARCH_MIN_LENGTH} caracteres.
              </p>
            )}
            {term && state.status === "error" && (
              <p className="px-2 py-6 text-center text-sm text-red-700 dark:text-red-300">{state.message}</p>
            )}
            {term && state.status === "done" && groups.length === 0 && (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                Nada encontrado para “{term}”.
              </p>
            )}
            {groups.map((group, groupIndex) => (
                <div key={group.key} className="mb-1">
                  <p className="px-2 pt-2 pb-1 text-xs font-medium text-muted-foreground">{group.label}</p>
                  {group.results.map((result, resultIndex) => {
                    const index = offsets[groupIndex] + resultIndex
                    return (
                      <button
                        key={result.id}
                        type="button"
                        role="option"
                        aria-selected={index === active}
                        onMouseEnter={() => setActive(index)}
                        onClick={() => go(result)}
                        className={`flex w-full flex-col rounded-md px-2 py-1.5 text-left ${
                          index === active ? "bg-foreground/5" : ""
                        }`}
                      >
                        <span className="truncate text-sm text-foreground">{result.title}</span>
                        {result.subtitle && (
                          <span className="truncate text-xs text-muted-foreground">{result.subtitle}</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
