import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET /cases
router.get('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, priority, auditorId, deviceId, page = '1', limit = '20' } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (auditorId) where.auditorId = auditorId;
    if (deviceId) where.deviceId = deviceId;

    const [cases, total] = await Promise.all([
      prisma.auditCase.findMany({
        where,
        include: {
          device: { select: { id: true, imei: true, assetTag: true, model: true } },
          auditor: { select: { id: true, name: true, staffId: true } },
        },
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditCase.count({ where }),
    ]);

    res.json({
      cases,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Get cases error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /cases
router.post('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const auditCase = await prisma.auditCase.create({
      data: {
        ...req.body,
        auditorId: req.body.auditorId || req.user?.id,
      },
      include: {
        device: { select: { id: true, imei: true, assetTag: true } },
        auditor: { select: { id: true, name: true, staffId: true } },
      },
    });
    res.status(201).json(auditCase);
  } catch (error) {
    console.error('Create case error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /cases/:id
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const auditCase = await prisma.auditCase.findUnique({
      where: { id: req.params.id },
      include: {
        device: {
          include: {
            custodian: { select: { id: true, name: true, staffId: true, role: true } },
          },
        },
        auditor: { select: { id: true, name: true, staffId: true, role: true } },
      },
    });

    if (!auditCase) {
      res.status(404).json({ error: 'Case not found' });
      return;
    }

    res.json(auditCase);
  } catch (error) {
    console.error('Get case error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /cases/:id
router.patch('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { fieldNotes, resolution, status } = req.body;
    
    const updateData: Record<string, unknown> = {};
    if (fieldNotes !== undefined) updateData.fieldNotes = fieldNotes;
    if (resolution !== undefined) updateData.resolution = resolution;
    if (status !== undefined) {
      updateData.status = status;
      if (status === 'RESOLVED' || status === 'CLOSED') {
        updateData.resolvedAt = new Date();
      }
    }

    const auditCase = await prisma.auditCase.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        device: { select: { id: true, imei: true, assetTag: true } },
        auditor: { select: { id: true, name: true, staffId: true } },
      },
    });

    res.json(auditCase);
  } catch (error) {
    console.error('Update case error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
