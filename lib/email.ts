export function isHydrillaEmail(email: string | null | undefined): boolean {
  return Boolean(email?.trim().toLowerCase().endsWith("@hydrilla.ai"));
}
