import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

const router = Router();
const prisma = new PrismaClient();

// GET /users
router.get('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { role, province, active } = req.query;

    const where: Record<string, unknown> = {};
    if (role) where.role = role;
    if (province) where.province = province;
    if (active !== undefined) where.active = active === 'true';

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        staffId: true,
        name: true,
        role: true,
        phone: true,
        email: true,
        province: true,
        zone: true,
        active: true,
        createdAt: true,
        _count: { select: { devices: true } },
      },
      orderBy: { name: 'asc' },
    });

    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /users (ADMIN only)
router.post('/', authenticateToken, requireRole('ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { staffId, name, role, phone, email, province, zone, password } = req.body;

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        staffId,
        name,
        role,
        phone,
        email,
        province,
        zone,
        passwordHash,
      },
      select: {
        id: true,
        staffId: true,
        name: true,
        role: true,
        phone: true,
        email: true,
        province: true,
        zone: true,
        active: true,
        createdAt: true,
      },
    });

    res.status(201).json(user);
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'User with this staffId already exists' });
      return;
    }
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /users/:id
router.patch('/:id', authenticateToken, requireRole('ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { role, zone, active, province, name, phone, email } = req.body;
    
    const updateData: Record<string, unknown> = {};
    if (role !== undefined) updateData.role = role;
    if (zone !== undefined) updateData.zone = zone;
    if (active !== undefined) updateData.active = active;
    if (province !== undefined) updateData.province = province;
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: updateData,
      select: {
        id: true,
        staffId: true,
        name: true,
        role: true,
        phone: true,
        email: true,
        province: true,
        zone: true,
        active: true,
      },
    });

    res.json(user);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /users/:id/password
router.patch('/:id/password', authenticateToken, requireRole('ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { password } = req.body;

    if (!password || password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: req.params.id },
      data: { passwordHash },
    });

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
