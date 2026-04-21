import { PrismaClient, DeviceStatus, UserRole } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Hash passwords
  const adminHash = await bcrypt.hash('admin123', 10);
  const auditHash = await bcrypt.hash('audit123', 10);
  const marketHash = await bcrypt.hash('market123', 10);
  const tdrHash = await bcrypt.hash('tdr123', 10);
  const tlHash = await bcrypt.hash('tl123', 10);
  const agtHash = await bcrypt.hash('agt123', 10);

  // Create users
  const admin = await prisma.user.upsert({
    where: { staffId: 'ADMIN001' },
    update: {},
    create: {
      staffId: 'ADMIN001',
      name: 'John Nkhoma',
      role: UserRole.ADMIN,
      passwordHash: adminHash,
      province: 'Lusaka',
    },
  });

  const auditor = await prisma.user.upsert({
    where: { staffId: 'AUD001' },
    update: {},
    create: {
      staffId: 'AUD001',
      name: 'Bwalya Auditor',
      role: UserRole.TRADE_AUDITOR,
      passwordHash: auditHash,
      province: 'Copperbelt',
    },
  });

  const market = await prisma.user.upsert({
    where: { staffId: 'MKT001' },
    update: {},
    create: {
      staffId: 'MKT001',
      name: 'Charity Mwale',
      role: UserRole.MARKET_MANAGEMENT,
      passwordHash: marketHash,
      province: 'Lusaka',
    },
  });

  const tdr1 = await prisma.user.upsert({
    where: { staffId: 'TDR001' },
    update: {},
    create: {
      staffId: 'TDR001',
      name: 'Graham Phiri',
      role: UserRole.TDR,
      passwordHash: tdrHash,
      province: 'Copperbelt',
      zone: 'Zone A',
    },
  });

  const tdr2 = await prisma.user.upsert({
    where: { staffId: 'TDR002' },
    update: {},
    create: {
      staffId: 'TDR002',
      name: 'Jeremiah Bwalya',
      role: UserRole.TDR,
      passwordHash: tdrHash,
      province: 'Lusaka',
      zone: 'Zone B',
    },
  });

  const teamLead = await prisma.user.upsert({
    where: { staffId: 'TL001' },
    update: {},
    create: {
      staffId: 'TL001',
      name: 'Moses Tembo',
      role: UserRole.TEAM_LEAD,
      passwordHash: tlHash,
      province: 'Copperbelt',
      zone: 'Zone A',
    },
  });

  const agent = await prisma.user.upsert({
    where: { staffId: 'AGT001' },
    update: {},
    create: {
      staffId: 'AGT001',
      name: 'Rose Mutale',
      role: UserRole.AGENT,
      passwordHash: agtHash,
      province: 'Copperbelt',
      zone: 'Zone A',
    },
  });

  console.log('Users created:', { admin: admin.id, auditor: auditor.id, agent: agent.id });

  // Create batch
  const batch = await prisma.batch.upsert({
    where: { id: 'batch-001' },
    update: {},
    create: {
      id: 'batch-001',
      name: 'Batch Q1-2026',
      description: 'Q1 2026 device deployment batch',
      totalDevices: 10,
      importedBy: admin.id,
    },
  });

  // Create 10 devices
  const devices = [];

  // 3 ACTIVE devices
  const dev1 = await prisma.device.upsert({
    where: { imei: '351756051523999' },
    update: {},
    create: {
      imei: '351756051523999',
      serialNo: 'SN-001-2026',
      assetTag: 'ZMT-001',
      model: 'Tecno Spark 10',
      msisdn: '0977000001',
      internalSim: 'SIM-A1',
      batchId: batch.id,
      status: DeviceStatus.ACTIVE,
      currentCustodianId: agent.id,
      province: 'Copperbelt',
      district: 'Kitwe',
      zone: 'Zone A',
      route: 'Route 1',
      outlet: 'Kitwe Central Market',
      riskScore: 10,
      lastActivityAt: new Date(),
    },
  });

  const dev2 = await prisma.device.upsert({
    where: { imei: '351756051524000' },
    update: {},
    create: {
      imei: '351756051524000',
      serialNo: 'SN-002-2026',
      assetTag: 'ZMT-002',
      model: 'Tecno Spark 10',
      msisdn: '0977000002',
      internalSim: 'SIM-A2',
      batchId: batch.id,
      status: DeviceStatus.ACTIVE,
      currentCustodianId: tdr1.id,
      province: 'Copperbelt',
      district: 'Ndola',
      zone: 'Zone A',
      route: 'Route 2',
      outlet: 'Ndola Market',
      riskScore: 5,
      lastActivityAt: new Date(),
    },
  });

  const dev3 = await prisma.device.upsert({
    where: { imei: '351756051524001' },
    update: {},
    create: {
      imei: '351756051524001',
      serialNo: 'SN-003-2026',
      assetTag: 'ZMT-003',
      model: 'Samsung A05',
      msisdn: '0977000003',
      internalSim: 'SIM-B1',
      batchId: batch.id,
      status: DeviceStatus.ACTIVE,
      currentCustodianId: tdr2.id,
      province: 'Lusaka',
      district: 'Lusaka',
      zone: 'Zone B',
      route: 'Route 3',
      outlet: 'Lusaka City Market',
      riskScore: 15,
      lastActivityAt: new Date(),
    },
  });

  // 2 INACTIVE devices
  const dev4 = await prisma.device.upsert({
    where: { imei: '351756051524002' },
    update: {},
    create: {
      imei: '351756051524002',
      serialNo: 'SN-004-2026',
      assetTag: 'ZMT-004',
      model: 'Itel A70',
      msisdn: '0977000004',
      batchId: batch.id,
      status: DeviceStatus.INACTIVE,
      currentCustodianId: agent.id,
      province: 'Copperbelt',
      district: 'Luanshya',
      zone: 'Zone A',
      riskScore: 30,
      riskFlags: ['INACTIVITY'],
      lastActivityAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    },
  });

  const dev5 = await prisma.device.upsert({
    where: { imei: '351756051524003' },
    update: {},
    create: {
      imei: '351756051524003',
      serialNo: 'SN-005-2026',
      assetTag: 'ZMT-005',
      model: 'Itel A70',
      msisdn: '0977000005',
      batchId: batch.id,
      status: DeviceStatus.INACTIVE,
      currentCustodianId: tdr1.id,
      province: 'Copperbelt',
      district: 'Mufulira',
      zone: 'Zone A',
      riskScore: 30,
      riskFlags: ['INACTIVITY'],
      lastActivityAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
  });

  // 2 ASSIGNED devices
  const dev6 = await prisma.device.upsert({
    where: { imei: '351756051524004' },
    update: {},
    create: {
      imei: '351756051524004',
      serialNo: 'SN-006-2026',
      assetTag: 'ZMT-006',
      model: 'Tecno Spark 10',
      batchId: batch.id,
      status: DeviceStatus.ASSIGNED,
      currentCustodianId: tdr2.id,
      province: 'Lusaka',
      zone: 'Zone B',
      riskScore: 0,
    },
  });

  const dev7 = await prisma.device.upsert({
    where: { imei: '351756051524005' },
    update: {},
    create: {
      imei: '351756051524005',
      serialNo: 'SN-007-2026',
      assetTag: 'ZMT-007',
      model: 'Samsung A05',
      batchId: batch.id,
      status: DeviceStatus.ASSIGNED,
      currentCustodianId: teamLead.id,
      province: 'Copperbelt',
      zone: 'Zone A',
      riskScore: 0,
    },
  });

  // 1 LOST device
  const dev8 = await prisma.device.upsert({
    where: { imei: '351756051524006' },
    update: {},
    create: {
      imei: '351756051524006',
      serialNo: 'SN-008-2026',
      assetTag: 'ZMT-008',
      model: 'Tecno Spark 10',
      msisdn: '0977000008',
      batchId: batch.id,
      status: DeviceStatus.LOST,
      province: 'Eastern',
      district: 'Chipata',
      riskScore: 80,
      riskFlags: ['LOST', 'INACTIVITY', 'OFF_HOURS'],
      lastActivityAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    },
  });

  // 1 HIGH_RISK device (ACTIVE but high risk)
  const dev9 = await prisma.device.upsert({
    where: { imei: '351756051524007' },
    update: {},
    create: {
      imei: '351756051524007',
      serialNo: 'SN-009-2026',
      assetTag: 'ZMT-009',
      model: 'Itel P55',
      msisdn: '0977000009',
      batchId: batch.id,
      status: DeviceStatus.ACTIVE,
      currentCustodianId: agent.id,
      province: 'Copperbelt',
      district: 'Chingola',
      zone: 'Zone A',
      riskScore: 85,
      riskFlags: ['OFF_HOURS', 'SIM_SWAP', 'SUSPICIOUS_ACTIVITY'],
      lastActivityAt: new Date(),
    },
  });

  // 1 IN_STOCK device
  const dev10 = await prisma.device.upsert({
    where: { imei: '351756051524008' },
    update: {},
    create: {
      imei: '351756051524008',
      serialNo: 'SN-010-2026',
      assetTag: 'ZMT-010',
      model: 'Samsung A05',
      batchId: batch.id,
      status: DeviceStatus.IN_STOCK,
      province: 'Lusaka',
      riskScore: 0,
    },
  });

  devices.push(dev1, dev2, dev3, dev4, dev5, dev6, dev7, dev8, dev9, dev10);
  console.log(`Created ${devices.length} devices`);

  // Create activity logs for active devices (last 14 days)
  const activeDevices = [dev1, dev2, dev3];
  for (const device of activeDevices) {
    for (let i = 0; i < 14; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const regs = Math.floor(Math.random() * 13) + 8; // 8-20

      await prisma.activityLog.upsert({
        where: {
          id: `act-${device.id}-${i}`,
        },
        update: {},
        create: {
          id: `act-${device.id}-${i}`,
          deviceId: device.id,
          date,
          totalRegistrations: regs,
          offHoursCount: Math.floor(Math.random() * 3),
          suspiciousFlags: [],
        },
      });
    }
  }

  // Activity for high risk device (with off hours)
  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    
    await prisma.activityLog.upsert({
      where: { id: `act-${dev9.id}-${i}` },
      update: {},
      create: {
        id: `act-${dev9.id}-${i}`,
        deviceId: dev9.id,
        date,
        totalRegistrations: Math.floor(Math.random() * 20) + 5,
        offHoursCount: 15,
        suspiciousFlags: ['OFF_HOURS_ACTIVITY'],
      },
    });
  }

  console.log('Activity logs created');

  // Create transfer logs
  await prisma.transferLog.upsert({
    where: { id: 'transfer-001' },
    update: {},
    create: {
      id: 'transfer-001',
      deviceId: dev1.id,
      fromUserId: admin.id,
      toUserId: agent.id,
      status: 'ACKNOWLEDGED',
      acknowledgedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      notes: 'Initial deployment',
    },
  });

  await prisma.transferLog.upsert({
    where: { id: 'transfer-002' },
    update: {},
    create: {
      id: 'transfer-002',
      deviceId: dev6.id,
      fromUserId: admin.id,
      toUserId: tdr2.id,
      status: 'PENDING',
      notes: 'New deployment',
    },
  });

  // Create audit cases
  await prisma.auditCase.upsert({
    where: { id: 'case-001' },
    update: {},
    create: {
      id: 'case-001',
      deviceId: dev8.id,
      auditorId: auditor.id,
      status: 'OPEN',
      priority: 'CRITICAL',
      reason: 'Device reported LOST by last custodian',
      fieldNotes: 'Device was last seen in Chipata. TDR reported it missing after field visit.',
    },
  });

  await prisma.auditCase.upsert({
    where: { id: 'case-002' },
    update: {},
    create: {
      id: 'case-002',
      deviceId: dev9.id,
      auditorId: auditor.id,
      status: 'OPEN',
      priority: 'HIGH',
      reason: 'High risk score: Off-hours activity and SIM swap detected',
      fieldNotes: 'Multiple off-hours registrations detected. Possible unauthorized use.',
    },
  });

  await prisma.auditCase.upsert({
    where: { id: 'case-003' },
    update: {},
    create: {
      id: 'case-003',
      deviceId: dev4.id,
      auditorId: auditor.id,
      status: 'IN_PROGRESS',
      priority: 'MEDIUM',
      reason: 'Device inactive for 4+ days',
      fieldNotes: 'Agent contacted. Claims device has network issues.',
    },
  });

  console.log('Audit cases created');
  console.log('✅ Seed complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
