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

      if (isApiAuth || isSdrPublicRoute || isSaleiaWebhook) return true
      if (isAuthRoute) {
        if (isLoggedIn) return Response.redirect(new URL("/meu-dia", nextUrl))
        return true
      }
      if (!isLoggedIn) return false
      return true
    },
  },
}
