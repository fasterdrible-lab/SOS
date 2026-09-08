import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { TooltipProvider } from "@/components/ui/tooltip"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

export const metadata: Metadata = {
  title: "SalesOS — The Operating System for Revenue Growth",
  description: "Plataforma operacional de crescimento comercial. CRM + IA + Consultoria em uma única plataforma.",
  icons: { icon: "/favicon.ico" },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} dark h-full`}>
      <body className="min-h-full bg-background text-foreground antialiased">
        <TooltipProvider>
          {children}
        </TooltipProvider>
      </body>
    </html>
  )
}
