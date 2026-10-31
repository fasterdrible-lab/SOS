export function diagnosticOpportunityId(diagnosticId: string): string {
  return `opportunity-diagnostico-${diagnosticId}`
}

export function diagnosticOpportunityMarker(diagnosticId: string): string {
  return `[diagnostico:${diagnosticId}]`
}
