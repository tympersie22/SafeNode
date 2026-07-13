export interface PasskeyRecord {
  id: string;
  rawId?: string;
  transports?: string[];
  signCount?: number;
  friendlyName?: string;
  prfReady?: boolean;
  createdAt: number;
}

export interface PasskeyVaultUnlockRecord {
  credentialId: string;
  friendlyName?: string;
  prfReady: boolean;
  prfSalt?: string | null;
  prfWrappedVaultKey?: string | null;
  prfWrappedVaultKeyIV?: string | null;
  createdAt: number;
}
