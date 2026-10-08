/**
 * Database Seed Script
 * 
 * Creates realistic development data for the ZTAP portal.
 * 
 * Demo Accounts:
 * - employee@example.com (Employee)
 * - securityadmin@example.com (Security Administrator)
 * - owner@example.com (Resource Owner)
 * - auditor@example.com (Auditor)
 * 
 * All demo passwords: "P@ssw0rd!2024" (Argon2id hashed)
 * These are DEVELOPMENT ONLY credentials.
 */

import { PrismaClient, RoleName, DeviceStatus, SensitivityLevel, RiskLevel } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });
}

async function main() {
  console.log('🌱 Seeding ZTAP database...\n');

  // ─── 1. Create Roles ───────────────────────────────────────────
  console.log('Creating roles...');
  const roles = await Promise.all([
    prisma.role.upsert({
      where: { name: 'EMPLOYEE' },
      update: {},
      create: { name: 'EMPLOYEE', description: 'Standard employee with basic access request capabilities', level: 1 },
    }),
    prisma.role.upsert({
      where: { name: 'RESOURCE_OWNER' },
      update: {},
      create: { name: 'RESOURCE_OWNER', description: 'Owner of internal applications who can approve/reject access requests', level: 2 },
    }),
    prisma.role.upsert({
      where: { name: 'SECURITY_ADMIN' },
      update: {},
      create: { name: 'SECURITY_ADMIN', description: 'Security administrator who manages users, roles, policies, and security configuration', level: 3 },
    }),
    prisma.role.upsert({
      where: { name: 'AUDITOR' },
      update: {},
      create: { name: 'AUDITOR', description: 'Read-only auditor who reviews security events and audit logs', level: 2 },
    }),
    prisma.role.upsert({
      where: { name: 'SYSTEM_ADMIN' },
      update: {},
      create: { name: 'SYSTEM_ADMIN', description: 'System administrator with full platform access', level: 4 },
    }),
  ]);

  const roleMap = Object.fromEntries(roles.map(r => [r.name, r]));
  console.log(`  ✅ ${roles.length} roles created\n`);

  // ─── 2. Create Permissions ─────────────────────────────────────
  console.log('Creating permissions...');
  const permissionsData = [
    // Employee permissions
    { action: 'access:request', resource: 'AccessRequest', description: 'Submit access requests', roleId: roleMap.EMPLOYEE.id },
    { action: 'access:read:own', resource: 'AccessRequest', description: 'View own access requests', roleId: roleMap.EMPLOYEE.id },
    { action: 'device:create', resource: 'Device', description: 'Register devices', roleId: roleMap.EMPLOYEE.id },
    { action: 'resource:read', resource: 'Resource', description: 'View available resources', roleId: roleMap.EMPLOYEE.id },
    // Resource Owner permissions
    { action: 'resource:manage:own', resource: 'Resource', description: 'Manage owned resources', roleId: roleMap.RESOURCE_OWNER.id },
    { action: 'approval:approve', resource: 'Approval', description: 'Approve access requests', roleId: roleMap.RESOURCE_OWNER.id },
    { action: 'approval:reject', resource: 'Approval', description: 'Reject access requests', roleId: roleMap.RESOURCE_OWNER.id },
    // Security Admin permissions
    { action: 'user:create', resource: 'User', description: 'Create user accounts', roleId: roleMap.SECURITY_ADMIN.id },
    { action: 'user:disable', resource: 'User', description: 'Disable user accounts', roleId: roleMap.SECURITY_ADMIN.id },
    { action: 'role:assign', resource: 'Role', description: 'Assign roles to users', roleId: roleMap.SECURITY_ADMIN.id },
    { action: 'role:revoke', resource: 'Role', description: 'Revoke roles from users', roleId: roleMap.SECURITY_ADMIN.id },
    { action: 'policy:create', resource: 'Policy', description: 'Create access policies', roleId: roleMap.SECURITY_ADMIN.id },
    { action: 'policy:update', resource: 'Policy', description: 'Update access policies', roleId: roleMap.SECURITY_ADMIN.id },
    // Auditor permissions
    { action: 'audit:read', resource: 'AuditLog', description: 'View audit logs', roleId: roleMap.AUDITOR.id },
    { action: 'audit:export', resource: 'AuditLog', description: 'Export audit logs', roleId: roleMap.AUDITOR.id },
  ];

  for (const perm of permissionsData) {
    await prisma.permission.upsert({
      where: { action_resource_roleId: { action: perm.action, resource: perm.resource, roleId: perm.roleId } },
      update: {},
      create: perm,
    });
  }
  console.log(`  ✅ ${permissionsData.length} permissions created\n`);

  // ─── 3. Create Users ───────────────────────────────────────────
  console.log('Creating users...');
  const demoPassword = await hashPassword('P@ssw0rd!2024');

  const users = {
    employee: await prisma.user.upsert({
      where: { email: 'employee@example.com' },
      update: {},
      create: {
        email: 'employee@example.com',
        passwordHash: demoPassword,
        firstName: 'John',
        lastName: 'Employee',
        status: 'ACTIVE',
      },
    }),
    securityAdmin: await prisma.user.upsert({
      where: { email: 'securityadmin@example.com' },
      update: {},
      create: {
        email: 'securityadmin@example.com',
        passwordHash: demoPassword,
        firstName: 'Sarah',
        lastName: 'SecurityAdmin',
        status: 'ACTIVE',
      },
    }),
    owner: await prisma.user.upsert({
      where: { email: 'owner@example.com' },
      update: {},
      create: {
        email: 'owner@example.com',
        passwordHash: demoPassword,
        firstName: 'Mike',
        lastName: 'ResourceOwner',
        status: 'ACTIVE',
      },
    }),
    auditor: await prisma.user.upsert({
      where: { email: 'auditor@example.com' },
      update: {},
      create: {
        email: 'auditor@example.com',
        passwordHash: demoPassword,
        firstName: 'Lisa',
        lastName: 'Auditor',
        status: 'ACTIVE',
      },
    }),
    inactiveUser: await prisma.user.upsert({
      where: { email: 'inactive@example.com' },
      update: {},
      create: {
        email: 'inactive@example.com',
        passwordHash: demoPassword,
        firstName: 'Alex',
        lastName: 'InactiveUser',
        status: 'INACTIVE',
      },
    }),
  };
  console.log(`  ✅ ${Object.keys(users).length} users created\n`);

  // ─── 4. Assign Roles ───────────────────────────────────────────
  console.log('Assigning roles...');
  const roleAssignments = [
    { userId: users.employee.id, roleId: roleMap.EMPLOYEE.id },
    { userId: users.securityAdmin.id, roleId: roleMap.SECURITY_ADMIN.id },
    { userId: users.securityAdmin.id, roleId: roleMap.EMPLOYEE.id },
    { userId: users.owner.id, roleId: roleMap.RESOURCE_OWNER.id },
    { userId: users.owner.id, roleId: roleMap.EMPLOYEE.id },
    { userId: users.auditor.id, roleId: roleMap.AUDITOR.id },
    { userId: users.inactiveUser.id, roleId: roleMap.EMPLOYEE.id },
  ];

  for (const assignment of roleAssignments) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: assignment.userId, roleId: assignment.roleId } },
      update: {},
      create: { ...assignment, assignedBy: users.securityAdmin.id },
    });
  }
  console.log(`  ✅ ${roleAssignments.length} role assignments created\n`);

  // ─── 5. Create Devices ─────────────────────────────────────────
  console.log('Creating devices...');
  const devices = {
    trustedLaptop: await prisma.device.upsert({
      where: { id: '00000000-0000-0000-0000-000000000001' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000001',
        userId: users.employee.id,
        name: 'John\'s Work Laptop',
        os: 'Windows 11 Enterprise',
        browser: 'Chrome 120',
        status: 'TRUSTED',
        isManaged: true,
        trustScore: 95,
        lastSecurityCheck: new Date(),
        complianceStatus: true,
      },
    }),
    untrustedPhone: await prisma.device.upsert({
      where: { id: '00000000-0000-0000-0000-000000000002' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000002',
        userId: users.employee.id,
        name: 'John\'s Personal Phone',
        os: 'Android 14',
        browser: 'Chrome Mobile',
        status: 'UNTRUSTED',
        isManaged: false,
        trustScore: 30,
        complianceStatus: false,
      },
    }),
    compromisedDevice: await prisma.device.upsert({
      where: { id: '00000000-0000-0000-0000-000000000003' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000003',
        userId: users.employee.id,
        name: 'Compromised Workstation',
        os: 'Windows 10',
        browser: 'Firefox',
        status: 'COMPROMISED',
        isManaged: true,
        trustScore: 0,
        complianceStatus: false,
      },
    }),
    adminDevice: await prisma.device.upsert({
      where: { id: '00000000-0000-0000-0000-000000000004' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000004',
        userId: users.securityAdmin.id,
        name: 'Sarah\'s Admin Workstation',
        os: 'macOS Sonoma',
        browser: 'Safari 17',
        status: 'TRUSTED',
        isManaged: true,
        trustScore: 98,
        lastSecurityCheck: new Date(),
        complianceStatus: true,
      },
    }),
    ownerDevice: await prisma.device.upsert({
      where: { id: '00000000-0000-0000-0000-000000000005' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000005',
        userId: users.owner.id,
        name: 'Mike\'s Work Laptop',
        os: 'Windows 11 Pro',
        browser: 'Edge 120',
        status: 'COMPLIANT',
        isManaged: true,
        trustScore: 85,
        lastSecurityCheck: new Date(),
        complianceStatus: true,
      },
    }),
  };
  console.log(`  ✅ ${Object.keys(devices).length} devices created\n`);

  // ─── 6. Create Resources ───────────────────────────────────────
  console.log('Creating resources...');
  const resources = {
    hrPortal: await prisma.resource.upsert({
      where: { name: 'HR Portal' },
      update: {},
      create: {
        name: 'HR Portal',
        description: 'Human resources management system for employee records, benefits, and leave management',
        sensitivity: 'CONFIDENTIAL',
        ownerId: users.owner.id,
        requiredRole: 'EMPLOYEE',
        riskLevel: 'MEDIUM',
        requiresApproval: false,
      },
    }),
    financeSystem: await prisma.resource.upsert({
      where: { name: 'Finance System' },
      update: {},
      create: {
        name: 'Finance System',
        description: 'Financial management system containing budgets, transactions, and financial reports',
        sensitivity: 'RESTRICTED',
        ownerId: users.owner.id,
        requiredRole: 'EMPLOYEE',
        riskLevel: 'HIGH',
        requiresApproval: true,
      },
    }),
    securityDashboard: await prisma.resource.upsert({
      where: { name: 'Security Dashboard' },
      update: {},
      create: {
        name: 'Security Dashboard',
        description: 'Security monitoring and incident response dashboard',
        sensitivity: 'CRITICAL',
        ownerId: users.securityAdmin.id,
        requiredRole: 'SECURITY_ADMIN',
        riskLevel: 'CRITICAL',
        requiresApproval: true,
      },
    }),
    devRepository: await prisma.resource.upsert({
      where: { name: 'Developer Repository' },
      update: {},
      create: {
        name: 'Developer Repository',
        description: 'Source code repository for internal development projects',
        sensitivity: 'INTERNAL',
        ownerId: users.owner.id,
        requiredRole: 'EMPLOYEE',
        riskLevel: 'LOW',
        requiresApproval: false,
      },
    }),
    internalDocs: await prisma.resource.upsert({
      where: { name: 'Internal Documents' },
      update: {},
      create: {
        name: 'Internal Documents',
        description: 'Company-wide internal documentation and knowledge base',
        sensitivity: 'INTERNAL',
        ownerId: users.owner.id,
        requiredRole: 'EMPLOYEE',
        riskLevel: 'LOW',
        requiresApproval: false,
      },
    }),
    prodMonitoring: await prisma.resource.upsert({
      where: { name: 'Production Monitoring' },
      update: {},
      create: {
        name: 'Production Monitoring',
        description: 'Production infrastructure monitoring and alerting system',
        sensitivity: 'RESTRICTED',
        ownerId: users.securityAdmin.id,
        requiredRole: 'SECURITY_ADMIN',
        riskLevel: 'HIGH',
        requiresApproval: true,
      },
    }),
    dbAdminPortal: await prisma.resource.upsert({
      where: { name: 'Database Administration Portal' },
      update: {},
      create: {
        name: 'Database Administration Portal',
        description: 'Direct database administration interface for production databases',
        sensitivity: 'CRITICAL',
        ownerId: users.securityAdmin.id,
        requiredRole: 'SYSTEM_ADMIN',
        riskLevel: 'CRITICAL',
        requiresApproval: true,
      },
    }),
  };
  console.log(`  ✅ ${Object.keys(resources).length} resources created\n`);

  // ─── 7. Create Resource Policies ───────────────────────────────
  console.log('Creating resource policies...');
  const policies = [
    {
      resourceId: resources.hrPortal.id,
      maxRiskLevel: 60,
      allowedTimeStart: '08:00',
      allowedTimeEnd: '20:00',
      allowedDays: 'MON,TUE,WED,THU,FRI',
      requiresManagedDevice: false,
    },
    {
      resourceId: resources.financeSystem.id,
      maxRiskLevel: 40,
      allowedTimeStart: '09:00',
      allowedTimeEnd: '18:00',
      allowedDays: 'MON,TUE,WED,THU,FRI',
      requiresManagedDevice: true,
    },
    {
      resourceId: resources.securityDashboard.id,
      requiredRole: 'SECURITY_ADMIN' as RoleName,
      maxRiskLevel: 30,
      allowedTimeStart: '00:00',
      allowedTimeEnd: '23:59',
      allowedDays: 'MON,TUE,WED,THU,FRI,SAT,SUN',
      requiresManagedDevice: true,
    },
    {
      resourceId: resources.devRepository.id,
      maxRiskLevel: 70,
      allowedTimeStart: '06:00',
      allowedTimeEnd: '23:00',
      allowedDays: 'MON,TUE,WED,THU,FRI,SAT',
      requiresManagedDevice: false,
    },
    {
      resourceId: resources.dbAdminPortal.id,
      requiredRole: 'SYSTEM_ADMIN' as RoleName,
      maxRiskLevel: 20,
      allowedTimeStart: '09:00',
      allowedTimeEnd: '17:00',
      allowedDays: 'MON,TUE,WED,THU,FRI',
      requiresManagedDevice: true,
    },
  ];

  for (const policy of policies) {
    await prisma.resourcePolicy.create({ data: policy });
  }
  console.log(`  ✅ ${policies.length} policies created\n`);

  // ─── 8. Create Sample Audit Logs ───────────────────────────────
  console.log('Creating sample audit logs...');
  const auditEntries = [
    {
      actorId: users.securityAdmin.id,
      actorEmail: 'securityadmin@example.com',
      action: 'USER_CREATED',
      resource: 'User',
      resourceId: users.employee.id,
      result: 'SUCCESS',
      severity: 'INFO' as const,
      metadata: { newUserEmail: 'employee@example.com' },
    },
    {
      actorId: users.employee.id,
      actorEmail: 'employee@example.com',
      action: 'LOGIN_SUCCESS',
      resource: 'Session',
      result: 'SUCCESS',
      severity: 'INFO' as const,
      ipAddress: '192.168.1.100',
    },
    {
      actorId: users.employee.id,
      actorEmail: 'employee@example.com',
      action: 'ACCESS_REQUESTED',
      resource: 'Resource',
      resourceId: resources.hrPortal.id,
      result: 'ALLOW',
      severity: 'INFO' as const,
      metadata: { riskScore: 25, riskLevel: 'LOW' },
    },
    {
      actorId: users.employee.id,
      actorEmail: 'employee@example.com',
      action: 'ACCESS_DENIED',
      resource: 'Resource',
      resourceId: resources.securityDashboard.id,
      result: 'DENY',
      severity: 'WARNING' as const,
      metadata: { riskScore: 85, riskLevel: 'CRITICAL', reason: 'Insufficient role' },
    },
    {
      actorEmail: 'unknown@attacker.com',
      action: 'LOGIN_FAILURE',
      resource: 'Session',
      result: 'FAILURE',
      severity: 'WARNING' as const,
      ipAddress: '10.0.0.99',
      metadata: { reason: 'Invalid credentials' },
    },
  ];

  for (const entry of auditEntries) {
    await prisma.auditLog.create({ data: entry as any });
  }
  console.log(`  ✅ ${auditEntries.length} audit entries created\n`);

  // ─── Summary ───────────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════════');
  console.log('  🎉 ZTAP Database Seeded Successfully!');
  console.log('═══════════════════════════════════════════════════');
  console.log('');
  console.log('  Demo Accounts (password: P@ssw0rd!2024):');
  console.log('  ├── employee@example.com       (Employee)');
  console.log('  ├── securityadmin@example.com   (Security Admin)');
  console.log('  ├── owner@example.com           (Resource Owner)');
  console.log('  ├── auditor@example.com         (Auditor)');
  console.log('  └── inactive@example.com        (Inactive User)');
  console.log('');
  console.log('  Resources: HR Portal, Finance System, Security Dashboard,');
  console.log('  Developer Repository, Internal Documents, Production');
  console.log('  Monitoring, Database Administration Portal');
  console.log('');
  console.log('  Devices: Trusted Laptop, Untrusted Phone, Compromised');
  console.log('  Workstation, Admin Workstation, Owner Laptop');
  console.log('═══════════════════════════════════════════════════');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
