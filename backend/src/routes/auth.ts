import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const router = Router();
const prisma = new PrismaClient();

// POST /auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { staffId, password } = req.body;

    if (!staffId || !password) {
      res.status(400).json({ error: 'staffId and password are required' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { staffId },
    });

    if (!user || !user.active) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const secret = process.env.JWT_SECRET || 'zamtel-audit-secret-key';
    const token = jwt.sign(
      { id: user.id, staffId: user.staffId, role: user.role, name: user.name },
      secret,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        staffId: user.staffId,
        name: user.name,
        role: user.role,
        province: user.province,
        zone: user.zone,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
