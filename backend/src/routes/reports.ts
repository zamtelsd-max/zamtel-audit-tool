import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET /reports/productivity
router.get('/productivity', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const devices = await prisma.device.findMany({
      include: {
        custodian: { select: { id: true, name: true, staffId: true, role: true } },
        activities: {
          where: { date: { gte: thirtyDaysAgo } },
          orderBy: { date: 'desc' },
        },
      },
    });

    const productivity = devices.map((device) => {
      const totalRegs = device.activities.reduce((sum, a) => sum + a.totalRegistrations, 0);
      const avgDaily = device.activities.length > 0 ? Math.round(totalRegs / 30) : 0;
      return {
        deviceId: device.id,
        imei: device.imei,
        assetTag: device.assetTag,
        model: device.model,
        status: device.status,
        custodian: device.custodian,
        province: device.province,
        zone: device.zone,
        avgDailyRegistrations: avgDaily,
        totalRegistrations: totalRegs,
        activeDays: device.activities.length,
      };
    });

    productivity.sort((a, b) => b.avgDailyRegistrations - a.avgDailyRegistrations);

    res.json(productivity);
  } catch (error) {
    console.error('Productivity report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /reports/lost-stolen
router.get('/lost-stolen', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const devices = await prisma.device.findMany({
      where: { status: { in: ['LOST', 'STOLEN'] } },
      include: {
        custodian: { select: { id: true, name: true, staffId: true, role: true } },
        auditCases: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            auditor: { select: { id: true, name: true, staffId: true } },
          },
        },
        transfers: {
          orderBy: { timestamp: 'desc' },
          take: 1,
          include: {
            fromUser: { select: { id: true, name: true, staffId: true } },
            toUser: { select: { id: true, name: true, staffId: true } },
          },
        },
      },
    });

    res.json(devices);
  } catch (error) {
    console.error('Lost/stolen report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /reports/batch/:batchId
router.get('/batch/:batchId', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { batchId } = req.params;

    const [batch, devices] = await Promise.all([
      prisma.batch.findUnique({ where: { id: batchId } }),
      prisma.device.findMany({
        where: { batchId },
        include: {
          custodian: { select: { id: true, name: true, staffId: true } },
        },
      }),
    ]);

    if (!batch) {
      res.status(404).json({ error: 'Batch not found' });
      return;
    }

    const statusBreakdown: Record<string, number> = {};
    devices.forEach((d) => {
      statusBreakdown[d.status] = (statusBreakdown[d.status] || 0) + 1;
    });

    res.json({
      batch,
      totalDevices: devices.length,
      statusBreakdown,
      devices,
    });
  } catch (error) {
    console.error('Batch report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /reports/risk-watchlist
router.get('/risk-watchlist', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const devices = await prisma.device.findMany({
      where: { riskScore: { gt: 0 } },
      include: {
        custodian: { select: { id: true, name: true, staffId: true, role: true, province: true } },
        auditCases: {
          where: { status: { in: ['OPEN', 'IN_PROGRESS'] } },
          select: { id: true, priority: true, reason: true, createdAt: true },
        },
      },
      orderBy: { riskScore: 'desc' },
      take: 50,
    });

    res.json(devices);
  } catch (error) {
    console.error('Risk watchlist error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
