import {
  UserRole,
  DeviceStatus,
  CommandType,
  CommandStatus,
  VulnerabilitySeverity,
  VulnerabilityStatus,
  PairingStatus,
  SupportSessionStatus,
  SecurityEventType,
  AuditAction,
} from './enums';

// ─── Auth DTOs ───────────────────────────────────────────
export interface RegisterDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organizationName?: string;
}

export interface LoginDto {
  email: string;
  password: string;
  mfaCode?: string;
}

export interface TokenPairDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface RefreshTokenDto {
  refreshToken: string;
}

export interface MfaSetupDto {
  secret: string;
  otpauthUrl: string;
  qrCodeDataUrl: string;
}

export interface MfaVerifyDto {
  code: string;
}

// ─── User DTOs ───────────────────────────────────────────
export interface UserDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  organizationId: string;
  mfaEnabled: boolean;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

// ─── Organization DTOs ───────────────────────────────────
export interface OrganizationDto {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  maxDevices: number;
  maxUsers: number;
  createdAt: string;
}

// ─── Device DTOs ─────────────────────────────────────────
export interface DeviceDto {
  id: string;
  deviceName: string;
  androidVersion: string;
  securityPatchLevel: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  status: DeviceStatus;
  isRooted: boolean;
  isEncrypted: boolean;
  adbEnabled: boolean;
  organizationId: string;
  lastSeenAt: string | null;
  createdAt: string;
}

export interface DevicePairingDto {
  pairingToken: string;
  qrCodeDataUrl: string;
  expiresAt: string;
  status: PairingStatus;
}

export interface DeviceRegistrationDto {
  pairingToken: string;
  publicKey: string;
  deviceInfo: {
    deviceName: string;
    manufacturer: string;
    model: string;
    androidVersion: string;
    securityPatchLevel: string;
    serialNumber: string;
  };
}

// ─── Command DTOs ────────────────────────────────────────
export interface CommandDto {
  id: string;
  deviceId: string;
  type: CommandType;
  status: CommandStatus;
  payload: Record<string, unknown> | null;
  result: Record<string, unknown> | null;
  issuedBy: string;
  issuedAt: string;
  completedAt: string | null;
}

// ─── Vulnerability DTOs ──────────────────────────────────
export interface VulnerabilityDto {
  id: string;
  title: string;
  description: string;
  severity: VulnerabilitySeverity;
  cvssScore: number;
  cweId: string | null;
  cveId: string | null;
  affectedAsset: string;
  stepsToReproduce: string;
  evidence: string | null;
  remediation: string;
  status: VulnerabilityStatus;
  organizationId: string;
  discoveredBy: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Support Session DTOs ────────────────────────────────
export interface SupportSessionDto {
  id: string;
  deviceId: string;
  agentId: string;
  status: SupportSessionStatus;
  consentGrantedAt: string | null;
  startedAt: string;
  endedAt: string | null;
}

// ─── Audit & Security DTOs ───────────────────────────────
export interface AuditLogDto {
  id: string;
  actorId: string;
  actorEmail: string;
  action: AuditAction;
  resourceType: string;
  resourceId: string | null;
  ipAddress: string;
  userAgent: string;
  payload: Record<string, unknown> | null;
  organizationId: string;
  createdAt: string;
}

export interface SecurityEventDto {
  id: string;
  eventType: SecurityEventType;
  severity: VulnerabilitySeverity;
  sourceIp: string;
  targetResource: string | null;
  description: string;
  metadata: Record<string, unknown> | null;
  acknowledged: boolean;
  organizationId: string;
  createdAt: string;
}

// ─── Report DTOs ─────────────────────────────────────────
export interface SecurityReportDto {
  id: string;
  title: string;
  reportType: 'EXECUTIVE_SUMMARY' | 'TECHNICAL_DETAIL';
  generatedBy: string;
  organizationId: string;
  vulnerabilitySummary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    informational: number;
  };
  overallRiskScore: number;
  createdAt: string;
}

// ─── Pagination & API Response ───────────────────────────
export interface PaginationMeta {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: PaginationMeta;
  timestamp: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
  timestamp: string;
}
