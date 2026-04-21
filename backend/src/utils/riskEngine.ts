import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function recalculateRisk(deviceId: string): Promise<number> {
  let score = 0;
  const flags: string[] = [];

  try {
    // Check last 3 days activity
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const recentActivity = await prisma.activityLog.findMany({
      where: {
        deviceId,
        date: { gte: threeDaysAgo },
      },
    });

    const totalRegs = recentActivity.reduce((sum, a) => sum + a.totalRegistrations, 0);
    if (totalRegs === 0) {
      score += 30;
      flags.push('INACTIVITY');
    }

    // Check off-hours count
    const offHoursTotal = recentActivity.reduce((sum, a) => sum + a.offHoursCount, 0);
    if (offHoursTotal > 10) {
      score += 50;
      flags.push('OFF_HOURS');
    }

    // Check SIM changes (transfers with sim change notes) in last week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const simChanges = await prisma.transferLog.count({
      where: {
        deviceId,
        timestamp: { gte: oneWeekAgo },
        notes: {
          contains: 'sim',
          mode: 'insensitive',
        },
      },
    });

    if (simChanges > 2) {
      score += 30;
      flags.push('SIM_SWAP');
    }

    // Cap at 100
    score = Math.min(score, 100);

    // Update device
    await prisma.device.update({
      where: { id: deviceId },
      data: {
        riskScore: score,
        riskFlags: flags,
      },
    });

    // Auto-create audit case if score > 80
    if (score > 80) {
      const existingCase = await prisma.auditCase.findFirst({
        where: {
          deviceId,
          status: { in: ['OPEN', 'IN_PROGRESS'] },
        },
      });

      if (!existingCase) {
        // Find a trade auditor
        const auditor = await prisma.user.findFirst({
          where: { role: 'TRADE_AUDITOR', active: true },
        });

        if (auditor) {
          await prisma.auditCase.create({
            data: {
              deviceId,
              auditorId: auditor.id,
              status: 'OPEN',
              priority: 'CRITICAL',
              reason: `Auto-generated: High risk score ${score}. Flags: ${flags.join(', ')}`,
            },
          });
        }
      }
    }

    return score;
  } catch (error) {
    console.error(`Risk engine error for device ${deviceId}:`, error);
    return 0;
  }
}

export async function runRiskEngineForAll(): Promise<void> {
  try {
    const devices = await prisma.device.findMany({
      select: { id: true },
    });

    console.log(`Running risk engine for ${devices.length} devices...`);

    for (const device of devices) {
      await recalculateRisk(device.id);
    }

    console.log('Risk engine run complete');
  } catch (error) {
    console.error('Risk engine error:', error);
  }
}
