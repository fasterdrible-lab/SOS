import type { NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({ credentials: {} }),
  ],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isAuthRoute =
        nextUrl.pathname.startsWith("/login") ||
        nextUrl.pathname.startsWith("/register")
      const isApiAuth = nextUrl.pathname.startsWith("/api/auth")
      const isSdrPublicRoute =
        nextUrl.pathname.startsWith("/sdr/") ||
        nextUrl.pathname.startsWith("/api/sdr")
      // Eventos do SALE-IA: autenticados pela assinatura HMAC, nao por sessao.
      const isSaleiaWebhook = nextUrl.pathname.startsWith("/api/integrations/saleia/")

      // Convite e nova senha (V2-9.1): o token do link autentica; quem ja esta logado tambem abre.
      const isInvite =
        nextUrl.pathname.startsWith("/convite/") ||
        nextUrl.pathname.startsWith("/api/invites/") ||
        nextUrl.pathname.startsWith("/redefinir-senha/") ||
        nextUrl.pathname.startsWith("/api/password-resets/")

      if (isApiAuth || isSdrPublicRoute || isSaleiaWebhook || isInvite) return true
      if (isAuthRoute) {
        if (isLoggedIn) return Response.redirect(new URL("/meu-dia", nextUrl))
        return true
      }
      if (!isLoggedIn) return false
      return true
    },
  },
}
