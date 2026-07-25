let vaultSessionSecret: string | null = null

export function setVaultSessionSecret(secret: string | null): void {
  vaultSessionSecret = secret
}

export function getVaultSessionSecret(): string | null {
  return vaultSessionSecret
}

export function hasVaultSessionSecret(): boolean {
  return Boolean(vaultSessionSecret)
}

export function clearVaultSessionSecret(): void {
  vaultSessionSecret = null
}
