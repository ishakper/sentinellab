export * from './organization.entity';
export * from './user.entity';
export * from './role.entity';
export * from './permission.entity';
export * from './user-role.entity';
export * from './organization-member.entity';
export * from './device.entity';
export * from './device-key.entity';
export * from './device-pairing.entity';
export * from './device-session.entity';
export * from './device-group.entity';
export * from './device-group-member.entity';
export * from './support-request.entity';
export * from './support-session.entity';
export * from './command.entity';
export * from './command-result.entity';
export * from './vulnerability.entity';
export * from './vulnerability-evidence.entity';
export * from './security-report.entity';
export * from './file-record.entity';
export * from './file-operation.entity';
export * from './audit-log.entity';
export * from './security-event.entity';
export * from './refresh-token.entity';
export * from './mfa-method.entity';
export * from './research-project.entity';

import { Organization } from './organization.entity';
import { User } from './user.entity';
import { Role } from './role.entity';
import { Permission } from './permission.entity';
import { UserRoleEntity } from './user-role.entity';
import { OrganizationMember } from './organization-member.entity';
import { Device } from './device.entity';
import { DeviceKey } from './device-key.entity';
import { DevicePairing } from './device-pairing.entity';
import { DeviceSession } from './device-session.entity';
import { DeviceGroup } from './device-group.entity';
import { DeviceGroupMember } from './device-group-member.entity';
import { SupportRequest } from './support-request.entity';
import { SupportSession } from './support-session.entity';
import { Command } from './command.entity';
import { CommandResult } from './command-result.entity';
import { Vulnerability } from './vulnerability.entity';
import { VulnerabilityEvidence } from './vulnerability-evidence.entity';
import { SecurityReport } from './security-report.entity';
import { FileRecord } from './file-record.entity';
import { FileOperation } from './file-operation.entity';
import { AuditLog } from './audit-log.entity';
import { SecurityEvent } from './security-event.entity';
import { RefreshToken } from './refresh-token.entity';
import { MfaMethod } from './mfa-method.entity';
import { ResearchProject } from './research-project.entity';

export const ENTITIES = [
  Organization,
  User,
  Role,
  Permission,
  UserRoleEntity,
  OrganizationMember,
  Device,
  DeviceKey,
  DevicePairing,
  DeviceSession,
  DeviceGroup,
  DeviceGroupMember,
  SupportRequest,
  SupportSession,
  Command,
  CommandResult,
  Vulnerability,
  VulnerabilityEvidence,
  SecurityReport,
  FileRecord,
  FileOperation,
  AuditLog,
  SecurityEvent,
  RefreshToken,
  MfaMethod,
  ResearchProject,
];
