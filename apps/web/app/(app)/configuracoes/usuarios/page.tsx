import { AccessDenied } from "@/components/access-denied"
import { auth } from "@/lib/auth"
import { hasPermission } from "@/lib/authz/permissions"
import { INVITE_TTL_DAYS, PASSWORD_RESET_TTL_HOURS } from "@/lib/members/rules"
import { listMembers } from "@/lib/members/service"
import { listTeams } from "@/lib/teams/service"

import { SettingsNav } from "../settings-nav"
import { InvitePanel } from "./invite-panel"
import { MemberList } from "./member-list"
import { TeamPanel } from "./team-panel"

export default async function UsuariosPage() {
  const session = await auth()
  const organizationId = session?.user?.organizationId
  const userId = session?.user?.id

  if (!organizationId || !userId) {
    return (
      <main className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
        Acesse um cliente para gerenciar os usuários.
      </main>
    )
  }
  if (!hasPermission(session.user.role, "members:manage")) return <AccessDenied />

  const [{ members, invites }, teams] = await Promise.all([listMembers(organizationId), listTeams(organizationId)])

  return (
    <main className="min-w-0 flex-1 p-4 sm:p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <SettingsNav active="usuarios" />
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Usuários</h1>
          <p className="text-sm text-muted-foreground">
            Quem acessa esta organização e com qual papel. Administrador configura tudo; gestor vê a equipe inteira e
            define metas e funis; vendedor vê só as próprias negociações e atividades.
          </p>
        </div>

        <InvitePanel invites={invites} ttlDays={INVITE_TTL_DAYS} />
        <TeamPanel teams={teams} />
        <MemberList members={members} teams={teams} currentUserId={userId} resetHours={PASSWORD_RESET_TTL_HOURS} />
      </div>
    </main>
  )
}
