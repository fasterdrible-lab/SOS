import Link from "next/link"

import { cn } from "@/lib/utils"

const TABS = [
  { key: "integracoes", label: "Integrações", href: "/configuracoes" },
  { key: "usuarios", label: "Usuários", href: "/configuracoes/usuarios" },
  { key: "comercial", label: "Comercial", href: "/configuracoes/comercial" },
  { key: "auditoria", label: "Auditoria", href: "/configuracoes/auditoria" },
] as const

/** Abas de Configuracoes; todas exigem administrador. */
export function SettingsNav({ active }: { active: (typeof TABS)[number]["key"] }) {
  return (
    <nav className="flex gap-1 overflow-x-auto rounded-xl border border-foreground/5 bg-card p-1" aria-label="Configurações">
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          aria-current={tab.key === active ? "page" : undefined}
          className={cn(
            "whitespace-nowrap rounded-md px-2.5 py-1 text-sm transition-colors",
            tab.key === active ? "bg-[#D4A64F]/15 text-gold-fg" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  )
}
