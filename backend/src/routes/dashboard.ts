import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET /dashboard/executive
router.get('/executive', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [
      totalDevices,
      active,
      inactive,
      lost,
      stolen,
      highRisk,
      openCases,
      pendingAcknowledgements,
      statusCounts,
      provinceData,
    ] = await Promise.all([
      prisma.device.count(),
      prisma.device.count({ where: { status: 'ACTIVE' } }),
      prisma.device.count({ where: { status: 'INACTIVE' } }),
      prisma.device.count({ where: { status: 'LOST' } }),
      prisma.device.count({ where: { status: 'STOLEN' } }),
      prisma.device.count({ where: { riskScore: { gte: 70 } } }),
      prisma.auditCase.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
      prisma.transferLog.count({ where: { status: 'PENDING' } }),
      prisma.device.groupBy({ by: ['status'], _count: { id: true } }),
      prisma.device.groupBy({ by: ['province'], _count: { id: true }, where: { province: { not: null } } }),
    ]);

    // Calculate avg productivity (avg daily registrations over last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const activityData = await prisma.activityLog.aggregate({
      _avg: { totalRegistrations: true },
      where: { date: { gte: sevenDaysAgo } },
    });

    const byStatus: Record<string, number> = {};
    statusCounts.forEach((s) => {
      byStatus[s.status] = s._count.id;
    });

    const byProvince = provinceData.map((p) => ({
      province: p.province,
      count: p._count.id,
    }));

    res.json({
      totalDevices,
      active,
      inactive,
      lost,
      stolen,
      highRisk,
      avgProductivity: Math.round(activityData._avg.totalRegistrations || 0),
      openCases,
      pendingAcknowledgements,
      byStatus,
      byProvince,
    });
  } catch (error) {
    console.error('Executive dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /dashboard/auditor
router.get('/auditor', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const auditorId = req.user?.id;

    const fourDaysAgo = new Date();
    fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);

    const [
      openCases,
      criticalAlerts,
      devicesOverdue,
      pendingAcks,
      recentCases,
    ] = await Promise.all([
      prisma.auditCase.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
      prisma.auditCase.count({ where: { status: 'OPEN', priority: 'CRITICAL' } }),
      prisma.device.count({
        where: {
          status: { in: ['ACTIVE', 'ASSIGNED'] },
          lastActivityAt: { lt: fourDaysAgo },
        },
      }),
      prisma.transferLog.count({ where: { status: 'PENDING' } }),
      prisma.auditCase.findMany({
        where: { auditorId },
        include: {
          device: { select: { id: true, imei: true, assetTag: true, model: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    // Top alerts = high risk devices
    const topAlerts = await prisma.device.findMany({
      where: { riskScore: { gte: 60 } },
      include: {
        custodian: { select: { id: true, name: true, staffId: true } },
      },
      orderBy: { riskScore: 'desc' },
      take: 10,
    });

    res.json({
      openCases,
      criticalAlerts,
      devicesOverdue,
      pendingAcks,
      recentCases,
      topAlerts,
    });
  } catch (error) {
    console.error('Auditor dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
