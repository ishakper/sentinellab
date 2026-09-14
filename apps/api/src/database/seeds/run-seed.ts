import 'reflect-metadata';
import * as path from 'path';
import * as fs from 'fs';
import { DataSource } from 'typeorm';
import * as argon2 from 'argon2';
import { UserRole } from '@sentinel/shared-types';

import { ENTITIES, User, Organization, Role, Permission } from '../entities';

// Optional: attempt loading .env files if dotenv is present
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const dotenv = require('dotenv');
  const envPaths = [
    path.resolve(process.cwd(), '.env.local'),
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '../../.env'),
  ];
  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
    }
  }
} catch {
  // dotenv not available, rely on process.env
}

const DEFAULT_SUPER_ADMIN_EMAIL = 'admin@sentinellab.local';
const DEFAULT_SUPER_ADMIN_PASSWORD = 'SentinelLab@2026!Secure';
const DEFAULT_ORG_SLUG = 'sentinel-global';
const DEFAULT_ORG_NAME = 'SentinelLab Global Admin Org';

async function runSeed() {
  console.log('---------------------------------------------------------');
  console.log('[SentinelLab Seed] Starting database initialization...');
  console.log('---------------------------------------------------------');

  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USER || 'sentinel',
    password: process.env.DATABASE_PASSWORD || 'sentinel_secure_password_change_me',
    database: process.env.DATABASE_NAME || 'sentinel_lab',
    entities: ENTITIES,
    synchronize: true, // ensure tables and schemas exist
    logging: ['error', 'warn'],
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  try {
    await dataSource.initialize();
    console.log('[SentinelLab Seed] Database connection established successfully.');

    const roleRepo = dataSource.getRepository(Role);
    const permRepo = dataSource.getRepository(Permission);
    const orgRepo = dataSource.getRepository(Organization);
    const userRepo = dataSource.getRepository(User);

    // 1. Seed Permissions
    console.log('\n[1/4] Seeding default permissions...');
    const permissionDefinitions = [
      { action: 'manage', resource: 'all', description: 'Unrestricted administration access' },
      { action: 'read', resource: 'users', description: 'Read user profiles and lists' },
      { action: 'create', resource: 'users', description: 'Create and invite users' },
      { action: 'update', resource: 'users', description: 'Update user profiles and roles' },
      { action: 'delete', resource: 'users', description: 'Deactivate and delete users' },
      { action: 'read', resource: 'organizations', description: 'Read organization details' },
      { action: 'manage', resource: 'organizations', description: 'Manage organization settings and quotas' },
      { action: 'read', resource: 'devices', description: 'View paired devices and health' },
      { action: 'manage', resource: 'devices', description: 'Pair, unpair, and configure devices' },
      { action: 'execute', resource: 'commands', description: 'Issue diagnostics and commands to devices' },
      { action: 'start', resource: 'support_sessions', description: 'Initiate remote support session' },
      { action: 'read', resource: 'vulnerabilities', description: 'View vulnerability findings' },
      { action: 'manage', resource: 'vulnerabilities', description: 'Triage and remediate vulnerabilities' },
      { action: 'generate', resource: 'reports', description: 'Generate security and compliance reports' },
      { action: 'read', resource: 'audit_logs', description: 'Inspect audit trail and security events' },
    ];

    const permissionMap = new Map<string, Permission>();
    for (const permDef of permissionDefinitions) {
      let perm = await permRepo.findOne({
        where: { action: permDef.action, resource: permDef.resource },
      });
      if (!perm) {
        perm = permRepo.create(permDef);
        await permRepo.save(perm);
      }
      permissionMap.set(`${permDef.action}:${permDef.resource}`, perm);
    }
    console.log(`  + Seeded ${permissionDefinitions.length} permissions.`);

    // 2. Seed Default Roles
    console.log('\n[2/4] Seeding default roles...');
    const allPerms = Array.from(permissionMap.values());
    const adminPerms = allPerms.filter((p) => p.action !== 'manage' || p.resource !== 'all');
    const supportPerms = allPerms.filter(
      (p) =>
        p.resource === 'devices' ||
        p.resource === 'commands' ||
        p.resource === 'support_sessions' ||
        (p.action === 'read' && (p.resource === 'reports' || p.resource === 'vulnerabilities')),
    );
    const viewerPerms = allPerms.filter(
      (p) =>
        p.action === 'read' &&
        ['devices', 'reports', 'vulnerabilities', 'audit_logs'].includes(p.resource),
    );

    const defaultRoles: { name: UserRole; description: string; permissions: Permission[] }[] = [
      {
        name: UserRole.SUPER_ADMIN,
        description: 'System-wide super administrator with unrestricted access to all tenants and resources.',
        permissions: allPerms,
      },
      {
        name: UserRole.ADMIN,
        description: 'Organization administrator managing users, devices, policies, and viewing compliance.',
        permissions: adminPerms,
      },
      {
        name: UserRole.SUPPORT_AGENT,
        description: 'Remote support technician with consent-gated device control and diagnostics.',
        permissions: supportPerms,
      },
      {
        name: UserRole.VIEWER,
        description: 'Read-only stakeholder or compliance auditor with view permissions.',
        permissions: viewerPerms,
      },
    ];

    for (const roleDef of defaultRoles) {
      let role = await roleRepo.findOne({
        where: { name: roleDef.name },
        relations: ['permissions'],
      });
      if (!role) {
        role = roleRepo.create({
          name: roleDef.name,
          description: roleDef.description,
          permissions: roleDef.permissions,
        });
        await roleRepo.save(role);
        console.log(`  + Created role: ${roleDef.name}`);
      } else {
        role.description = roleDef.description;
        role.permissions = roleDef.permissions;
        await roleRepo.save(role);
        console.log(`  = Role exists (updated): ${roleDef.name}`);
      }
    }

    // 3. Seed Default Organization
    console.log('\n[3/4] Seeding default organization...');
    let defaultOrg = await orgRepo.findOne({ where: { slug: DEFAULT_ORG_SLUG } });
    if (!defaultOrg) {
      defaultOrg = orgRepo.create({
        name: DEFAULT_ORG_NAME,
        slug: DEFAULT_ORG_SLUG,
        isActive: true,
        maxDevices: 1000,
        maxUsers: 100,
        settings: {
          isSystemOrg: true,
          description: 'SentinelLab Root Administrative & Platform Operations Organization',
          complianceFrameworks: ['SOC2', 'ISO27001', 'HIPAA'],
          requireMfaForAdmins: false,
          sessionTimeoutMinutes: 60,
          allowedDeviceTypes: ['ANDROID_EMULATOR', 'PHYSICAL_DEVICE'],
        },
      });
      await orgRepo.save(defaultOrg);
      console.log(`  + Created default organization: "${DEFAULT_ORG_NAME}" (ID: ${defaultOrg.id}, slug: ${DEFAULT_ORG_SLUG})`);
    } else {
      defaultOrg.name = DEFAULT_ORG_NAME;
      defaultOrg.isActive = true;
      await orgRepo.save(defaultOrg);
      console.log(`  = Default organization exists: "${defaultOrg.name}" (ID: ${defaultOrg.id})`);
    }

    // 4. Seed Super Admin User
    console.log('\n[4/4] Seeding super admin user...');
    let superAdmin = await userRepo.findOne({ where: { email: DEFAULT_SUPER_ADMIN_EMAIL } });

    // Hash password using Argon2id with recommended OWASP parameters
    const hashedPassword = await argon2.hash(DEFAULT_SUPER_ADMIN_PASSWORD, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    if (!superAdmin) {
      superAdmin = userRepo.create({
        email: DEFAULT_SUPER_ADMIN_EMAIL,
        passwordHash: hashedPassword,
        firstName: 'System',
        lastName: 'SuperAdmin',
        role: UserRole.SUPER_ADMIN,
        organizationId: defaultOrg.id,
        isActive: true,
        mfaEnabled: false,
        mfaSecret: null,
      });
      await userRepo.save(superAdmin);
      console.log(`  + Created Super Admin: ${DEFAULT_SUPER_ADMIN_EMAIL} (role: ${UserRole.SUPER_ADMIN})`);
    } else {
      superAdmin.passwordHash = hashedPassword;
      superAdmin.role = UserRole.SUPER_ADMIN;
      superAdmin.organizationId = defaultOrg.id;
      superAdmin.isActive = true;
      await userRepo.save(superAdmin);
      console.log(`  = Super Admin user updated: ${DEFAULT_SUPER_ADMIN_EMAIL} (role: ${UserRole.SUPER_ADMIN})`);
    }

    console.log('\n---------------------------------------------------------');
    console.log('[SentinelLab Seed] Database seeding completed successfully!');
    console.log(`  Organization: ${defaultOrg.name} (${defaultOrg.slug})`);
    console.log(`  Super Admin:  ${DEFAULT_SUPER_ADMIN_EMAIL}`);
    console.log('  Default Pass: SentinelLab@2026!Secure');
    console.log('---------------------------------------------------------\n');
  } catch (error) {
    console.error('[SentinelLab Seed] Fatal error during seeding:', error);
    process.exit(1);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

// Execute seed
runSeed().catch((err) => {
  console.error('[SentinelLab Seed] Unhandled error:', err);
  process.exit(1);
});
