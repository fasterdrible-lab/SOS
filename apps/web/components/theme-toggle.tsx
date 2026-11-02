"use client"

import { useState } from "react"
import { Moon, Sun } from "lucide-react"

import { THEME_COOKIE, THEME_COOKIE_MAX_AGE, type Theme } from "@/lib/theme"

export function ThemeToggle({ initialTheme }: { initialTheme: Theme }) {
  const [theme, setTheme] = useState(initialTheme)
  const next: Theme = theme === "dark" ? "light" : "dark"

  function toggle() {
    document.documentElement.classList.toggle("dark", next === "dark")
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=${THEME_COOKIE_MAX_AGE}; samesite=lax`
    setTheme(next)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={next === "light" ? "Usar tema claro" : "Usar tema escuro"}
      aria-label={next === "light" ? "Usar tema claro" : "Usar tema escuro"}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:ring-2 focus-visible:ring-[#D4A64F]"
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  )
}
