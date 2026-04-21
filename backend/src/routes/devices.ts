import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET /devices
router.get('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, province, zone, riskMin, search, page = '1', limit = '20' } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: Record<string, unknown> = {};

    if (status) where.status = status;
    if (province) where.province = province;
    if (zone) where.zone = zone;
    if (riskMin) where.riskScore = { gte: parseInt(riskMin as string) };

    if (search) {
      where.OR = [
        { imei: { contains: search as string, mode: 'insensitive' } },
        { assetTag: { contains: search as string, mode: 'insensitive' } },
        { msisdn: { contains: search as string, mode: 'insensitive' } },
        { custodian: { name: { contains: search as string, mode: 'insensitive' } } },
      ];
    }

    const [devices, total] = await Promise.all([
      prisma.device.findMany({
        where,
        include: {
          custodian: { select: { id: true, name: true, staffId: true, role: true } },
        },
        skip,
        take: limitNum,
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.device.count({ where }),
    ]);

    res.json({
      devices,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Get devices error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /devices
router.post('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const device = await prisma.device.create({ data: req.body });
    res.status(201).json(device);
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'Device with this IMEI or Asset Tag already exists' });
      return;
    }
    console.error('Create device error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /devices/bulk
router.post('/bulk', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const devices = req.body as Record<string, unknown>[];
    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const device of devices) {
      try {
        await prisma.device.create({ data: device as Parameters<typeof prisma.device.create>[0]['data'] });
        created++;
      } catch (err: unknown) {
        const e = err as { code?: string };
        if (e.code === 'P2002') {
          skipped++;
        } else {
          errors.push(`Device ${device.imei || device.assetTag}: ${String(err)}`);
        }
      }
    }

    res.json({ created, skipped, errors });
  } catch (error) {
    console.error('Bulk import error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /devices/kyc?q=IMEI_OR_DEALER_CODE — must be BEFORE /:id
router.get('/kyc', authenticateToken, async (req: AuthRequest, res2: Response): Promise<void> => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string') { res2.status(400).json({ error: 'Query parameter q is required' }); return; }
    const search = q.trim();
    const device = await prisma.device.findFirst({
      where: { OR: [{ imei: search }, { assetTag: search }, { msisdn: search }] },
      select: { id: true, imei: true, assetTag: true, model: true, status: true, msisdn: true, province: true, zone: true, route: true, batchId: true, riskScore: true, lastActivityAt: true, riskFlags: true },
    });
    if (!device) { res2.status(404).json({ error: 'Device not found' }); return; }
    res2.json(device);
  } catch (error) { console.error('KYC lookup error:', error); res2.status(500).json({ error: 'Internal server error' }); }
});

// GET /devices/:id
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const device = await prisma.device.findUnique({
      where: { id },
      include: {
        custodian: true,
        transfers: {
          include: {
            fromUser: { select: { id: true, name: true, staffId: true, role: true } },
            toUser: { select: { id: true, name: true, staffId: true, role: true } },
          },
          orderBy: { timestamp: 'desc' },
          take: 20,
        },
        activities: {
          where: { date: { gte: thirtyDaysAgo } },
          orderBy: { date: 'asc' },
        },
        auditCases: {
          where: { status: { in: ['OPEN', 'IN_PROGRESS'] } },
          include: {
            auditor: { select: { id: true, name: true, staffId: true } },
          },
        },
      },
    });

    if (!device) {
      res.status(404).json({ error: 'Device not found' });
      return;
    }

    res.json(device);
  } catch (error) {
    console.error('Get device error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /devices/:id
router.patch('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const device = await prisma.device.update({
      where: { id },
      data: req.body,
    });
    res.json(device);
  } catch (error) {
    console.error('Update device error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /devices/:id/transfer
router.post('/:id/transfer', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { toUserId, notes } = req.body;

    const device = await prisma.device.findUnique({ where: { id } });
    if (!device) {
      res.status(404).json({ error: 'Device not found' });
      return;
    }

    const transfer = await prisma.transferLog.create({
      data: {
        deviceId: id,
        fromUserId: device.currentCustodianId,
        toUserId,
        notes,
        status: 'PENDING',
      },
    });

    await prisma.device.update({
      where: { id },
      data: { status: 'IN_TRANSIT' },
    });

    res.status(201).json(transfer);
  } catch (error) {
    console.error('Transfer device error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /devices/:id/acknowledge
router.post('/:id/acknowledge', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const pendingTransfer = await prisma.transferLog.findFirst({
      where: { deviceId: id, status: 'PENDING' },
      orderBy: { timestamp: 'desc' },
    });

    if (!pendingTransfer) {
      res.status(404).json({ error: 'No pending transfer found' });
      return;
    }

    await prisma.transferLog.update({
      where: { id: pendingTransfer.id },
      data: {
        status: 'ACKNOWLEDGED',
        acknowledgedAt: new Date(),
      },
    });

    await prisma.device.update({
      where: { id },
      data: {
        currentCustodianId: pendingTransfer.toUserId,
        status: 'ASSIGNED',
      },
    });

    res.json({ message: 'Transfer acknowledged' });
  } catch (error) {
    console.error('Acknowledge error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /devices/:id/report-lost
router.post('/:id/report-lost', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.device.update({
      where: { id },
      data: { status: 'LOST' },
    });

    // Find auditor
    const auditor = await prisma.user.findFirst({
      where: { role: 'TRADE_AUDITOR', active: true },
    });

    const auditCase = auditor ? await prisma.auditCase.create({
      data: {
        deviceId: id,
        auditorId: auditor.id,
        status: 'OPEN',
        priority: 'CRITICAL',
        reason: `Device reported LOST by user ${req.user?.name}`,
      },
    }) : null;

    res.json({ message: 'Device reported as lost', auditCase });
  } catch (error) {
    console.error('Report lost error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /devices/:id/history
router.get('/:id/history', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const [transfers, activities] = await Promise.all([
      prisma.transferLog.findMany({
        where: { deviceId: id },
        include: {
          fromUser: { select: { id: true, name: true, staffId: true } },
          toUser: { select: { id: true, name: true, staffId: true } },
        },
        orderBy: { timestamp: 'desc' },
      }),
      prisma.activityLog.findMany({
        where: { deviceId: id },
        orderBy: { date: 'desc' },
      }),
    ]);

    res.json({ transfers, activities });
  } catch (error) {
    console.error('Device history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
