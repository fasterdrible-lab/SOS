// Acoes auditadas e seus rotulos na tela de auditoria (regra pura).

export const AUDIT_ACTION_LABELS = {
  "integration.saved": "Chave de IA salva",
  "integration.removed": "Chave de IA removida",
  "organization.created": "Cliente criado",
  "session.organization-switched": "Troca de cliente ativo",
  "goal.saved": "Meta salva",
  "goal.removed": "Meta removida",
  "opportunity.updated": "Negociacao editada",
  "company.updated": "Empresa editada",
  "contact.updated": "Contato editado",
  "pipeline.created": "Funil criado",
  "pipeline.updated": "Funil editado",
  "pipeline.archived": "Funil removido",
  "saleia.connected": "SALEIA conectado",
  "saleia.secret-rotated": "Novo segredo do SALEIA",
  "saleia.disconnected": "SALEIA desconectado",
  "saleia.insight-accepted": "Sugestao da SALEIA aceita",
  "saleia.insight-dismissed": "Sugestao da SALEIA descartada",
  "saleia.insight-reopened": "Descarte da SALEIA desfeito",
  "saleia.diagnosis-confirmed": "So diagnostico confirmado",
  "saleia.diagnosis-contested": "So diagnostico contestado",
  "saleia.diagnosis-reopened": "So diagnostico desfeito",
  "daily-report.closed": "Dia fechado",
  "member.invited": "Convite criado",
  "member.invite-revoked": "Convite revogado",
  "member.joined": "Convite aceito",
  "member.role-changed": "Papel alterado",
  "member.removed": "Pessoa removida",
  "member.password-reset-created": "Link de nova senha gerado",
  "member.password-reset": "Senha redefinida",
} as const

export type AuditAction = keyof typeof AUDIT_ACTION_LABELS

export const AUDIT_ACTIONS = Object.keys(AUDIT_ACTION_LABELS) as AuditAction[]

export function isAuditAction(value: string | null | undefined): value is AuditAction {
  return typeof value === "string" && Object.hasOwn(AUDIT_ACTION_LABELS, value)
}

export function auditActionLabel(action: string): string {
  return isAuditAction(action) ? AUDIT_ACTION_LABELS[action] : action
}

/** Detalhes da entrada em uma linha: chave: valor, sem aninhar. */
export function describeAuditMetadata(metadata: unknown): string {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return ""
  return Object.entries(metadata as Record<string, unknown>)
    .map(([key, value]) => {
      const text = Array.isArray(value)
        ? value.join(", ")
        : value !== null && typeof value === "object"
          ? JSON.stringify(value)
          : String(value)
      return `${key}: ${text}`
    })
    .join(" · ")
    .slice(0, 300)
}
