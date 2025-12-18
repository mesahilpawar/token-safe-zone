export interface Certificate {
  id: string;
  name: string;
  domain: string;
  issuer: string;
  status: 'active' | 'expired' | 'expiring';
  expiryDate: string;
  createdAt: string;
  algorithm: string;
  serialNumber: string;
}

export interface SSHKey {
  id: string;
  owner: string;
  fingerprint: string;
  lastUsed: string;
  trustLevel: 'high' | 'medium' | 'low';
  keyType: string;
  servers: string[];
}

export interface CodeSigningKey {
  id: string;
  alias: string;
  algorithm: string;
  protectionLevel: 'hsm' | 'software';
  createdAt: string;
  lastUsed: string;
  usageCount: number;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actor: string;
  actionType: string;
  targetResource: string;
  metadata: Record<string, unknown>;
}

export type ViewMode = 'table' | 'grid';
