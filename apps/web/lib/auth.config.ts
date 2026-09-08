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

      if (isApiAuth) return true
      if (isAuthRoute) {
        if (isLoggedIn) return Response.redirect(new URL("/dashboard", nextUrl))
        return true
      }
      if (!isLoggedIn) return false
      return true
    },
  },
}
