export const API_VERSION = 'v1';
export const API_PREFIX = `/api/${API_VERSION}`;

export const ApiRoutes = {
  // Health
  HEALTH: '/health',
  READY: '/ready',

  // Auth
  AUTH_REGISTER: '/auth/register',
  AUTH_LOGIN: '/auth/login',
  AUTH_REFRESH: '/auth/refresh',
  AUTH_LOGOUT: '/auth/logout',
  AUTH_MFA_SETUP: '/auth/mfa/setup',
  AUTH_MFA_VERIFY: '/auth/mfa/verify',
  AUTH_MFA_DISABLE: '/auth/mfa/disable',

  // Users
  USERS: '/users',
  USER_BY_ID: '/users/:id',
  USER_PROFILE: '/users/profile',

  // Organizations
  ORGANIZATIONS: '/organizations',
  ORGANIZATION_BY_ID: '/organizations/:id',
  ORGANIZATION_MEMBERS: '/organizations/:id/members',

  // Devices
  DEVICES: '/devices',
  DEVICE_BY_ID: '/devices/:id',
  DEVICE_PAIR: '/devices/pair',
  DEVICE_REGISTER: '/devices/register',
  DEVICE_UNPAIR: '/devices/:id/unpair',
  DEVICE_COMMANDS: '/devices/:id/commands',

  // Support
  SUPPORT_SESSIONS: '/support/sessions',
  SUPPORT_SESSION_BY_ID: '/support/sessions/:id',
  SUPPORT_REQUEST: '/support/request',

  // Vulnerabilities
  VULNERABILITIES: '/vulnerabilities',
  VULNERABILITY_BY_ID: '/vulnerabilities/:id',

  // Reports
  REPORTS: '/reports',
  REPORT_BY_ID: '/reports/:id',
  REPORT_GENERATE: '/reports/generate',

  // Scans
  SCANS: '/scans',
  SCAN_DEVICE: '/scans/device/:id',
  SCAN_APK: '/scans/apk',
  SCAN_NETWORK: '/scans/network',
  SCAN_API: '/scans/api',

  // Files
  FILES: '/files',
  FILE_UPLOAD: '/files/upload',
  FILE_BY_ID: '/files/:id',

  // Audit
  AUDIT_LOGS: '/audit/logs',
  SECURITY_EVENTS: '/security/events',

  // Lab
  LAB_TARGETS: '/lab/targets',
  LAB_TARGET_BY_ID: '/lab/targets/:id',
  LAB_SIMULATE: '/lab/simulate',
} as const;
