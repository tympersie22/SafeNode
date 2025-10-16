export interface PasskeyRecord {
  id: string;
  rawId?: string;
  transports?: string[];
  signCount?: number;
  friendlyName?: string;
  createdAt: number;
}

