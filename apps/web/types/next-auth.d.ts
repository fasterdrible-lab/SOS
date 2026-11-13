import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      organizationId: string | null
      role: string | null
      /** Equipe do usuario na organizacao ativa (V2-9.2); nulo sem equipe. */
      teamId: string | null
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    organizationId: string | null
    role: string | null
    teamId?: string | null
  }
}
