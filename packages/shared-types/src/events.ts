import { CommandType, CommandStatus, DeviceStatus, SecurityEventType } from './enums';

export enum WebSocketEvent {
  // Connection lifecycle
  CONNECTION_AUTHENTICATED = 'connection.authenticated',
  CONNECTION_ERROR = 'connection.error',

  // Device presence
  DEVICE_ONLINE = 'device.online',
  DEVICE_OFFLINE = 'device.offline',
  DEVICE_HEARTBEAT = 'device.heartbeat',
  DEVICE_STATUS_CHANGED = 'device.status_changed',

  // Commands
  COMMAND_ISSUED = 'command.issued',
  COMMAND_ACKNOWLEDGED = 'command.acknowledged',
  COMMAND_RESULT = 'command.result',
  COMMAND_FAILED = 'command.failed',
  COMMAND_TIMEOUT = 'command.timeout',

  // Support sessions
  SUPPORT_REQUEST = 'support.request',
  SUPPORT_CONSENT_GRANTED = 'support.consent_granted',
  SUPPORT_CONSENT_DENIED = 'support.consent_denied',
  SUPPORT_SESSION_STARTED = 'support.session_started',
  SUPPORT_SESSION_ENDED = 'support.session_ended',

  // Screen sharing
  SCREEN_SHARE_START = 'screen.share_start',
  SCREEN_SHARE_FRAME = 'screen.share_frame',
  SCREEN_SHARE_STOP = 'screen.share_stop',

  // Security alerts
  SECURITY_ALERT = 'security.alert',
}

export interface DeviceOnlinePayload {
  deviceId: string;
  organizationId: string;
  deviceName: string;
  timestamp: string;
}

export interface DeviceOfflinePayload {
  deviceId: string;
  organizationId: string;
  reason: 'DISCONNECT' | 'TIMEOUT' | 'UNPAIRED';
  timestamp: string;
}

export interface DeviceHeartbeatPayload {
  deviceId: string;
  batteryLevel: number;
  networkType: string;
  signalStrength: number;
  uptimeSeconds: number;
  timestamp: string;
}

export interface CommandIssuedPayload {
  commandId: string;
  deviceId: string;
  type: CommandType;
  payload: Record<string, unknown> | null;
  issuedBy: string;
  timestamp: string;
}

export interface CommandResultPayload {
  commandId: string;
  deviceId: string;
  type: CommandType;
  status: CommandStatus;
  result: Record<string, unknown>;
  executionTimeMs: number;
  timestamp: string;
}

export interface SecurityAlertPayload {
  eventId: string;
  eventType: SecurityEventType;
  severity: string;
  description: string;
  sourceIp: string;
  organizationId: string;
  timestamp: string;
}

export interface SupportRequestPayload {
  sessionId: string;
  deviceId: string;
  agentId: string;
  agentName: string;
  organizationName: string;
  reason: string;
  timestamp: string;
}
