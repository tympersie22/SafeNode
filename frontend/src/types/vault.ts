export interface VaultAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  data: string; // base64 encoded
  createdAt: number;
}

export interface VaultEntry {
  id: string;
  name: string;
  username: string;
  password: string;
  url?: string;
  notes?: string;
  tags?: string[];
  category?: string;
  totpSecret?: string; // base32
  attachments?: VaultAttachment[];
  breachCount?: number | null;
  lastBreachCheck?: number | null;
  passwordUpdatedAt?: number | null;
}

