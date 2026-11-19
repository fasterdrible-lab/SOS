import Image from "next/image"

import { cn } from "@/lib/utils"

/**
 * Identidade visual do SaleOS. O simbolo (hexagono com "S/S") e o logo
 * completo ficam em public/brand; o icone da aba vem de app/icon.png e
 * app/favicon.ico. Fundo escuro embutido nas imagens: valem nos dois temas.
 */
export function BrandMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <Image
      src="/brand/saleos-mark.png"
      alt="SaleOS"
      width={size}
      height={size}
      unoptimized
      className={cn("shrink-0 rounded-lg", className)}
    />
  )
}

export function BrandLogo({ size = 160, className }: { size?: number; className?: string }) {
  return (
    <Image
      src="/brand/saleos-logo.png"
      alt="SaleOS - Operating System"
      width={size}
      height={size}
      unoptimized
      priority
      className={cn("rounded-2xl", className)}
    />
  )
}
