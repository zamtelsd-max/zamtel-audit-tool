import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

import authRoutes from './routes/auth';
import deviceRoutes from './routes/devices';
import dashboardRoutes from './routes/dashboard';
import caseRoutes from './routes/cases';
import userRoutes from './routes/users';
import reportRoutes from './routes/reports';
import { runRiskEngineForAll } from './utils/riskEngine';

dotenv.config();

// Auto-seed on startup (migrate handled at build time via prisma generate)
async function initDatabase() {
  const prisma = new PrismaClient();
  try {
    const count = await prisma.user.count();
    if (count === 0) {
      console.log('Seeding database...');
      const adminHash = await bcrypt.hash('admin123', 10);
      const auditHash = await bcrypt.hash('audit123', 10);
      const tdrHash = await bcrypt.hash('tdr123', 10);
      const tlHash = await bcrypt.hash('tl123', 10);

      await prisma.user.createMany({
        data: [
          { staffId: 'ADMIN001', name: 'System Admin', role: 'ADMIN', passwordHash: adminHash, active: true },
          { staffId: 'AUD001', name: 'Trade Auditor 1', role: 'TRADE_AUDITOR', passwordHash: auditHash, active: true },
          { staffId: 'MKT001', name: 'Market Manager', role: 'MARKET_MANAGEMENT', passwordHash: adminHash, active: true },
          { staffId: 'TDR001', name: 'TDR Agent 1', role: 'TDR', passwordHash: tdrHash, active: true },
          { staffId: 'TDR002', name: 'TDR Agent 2', role: 'TDR', passwordHash: tdrHash, active: true },
          { staffId: 'TL001', name: 'Team Lead 1', role: 'TEAM_LEAD', passwordHash: tlHash, active: true },
          { staffId: 'AGT001', name: 'Agent 1', role: 'AGENT', passwordHash: auditHash, active: true },
        ],
        skipDuplicates: true,
      });
      console.log('Seed complete — 7 users created.');
    } else {
      console.log(`Database already has ${count} users, skipping seed.`);
    }
  } catch (seedErr) {
    console.error('Seed error:', (seedErr as Error).message?.slice(0, 300));
  } finally {
    await prisma.$disconnect();
  }
}

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  message: { error: 'Too many requests, please try again later' },
});
app.use('/api/', limiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'zamtel-audit-tool', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/devices', deviceRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/cases', caseRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/reports', reportRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Init DB then start server
initDatabase().then(() => {
app.listen(PORT, () => {
  console.log(`🚀 Zamtel Audit Tool backend running on port ${PORT}`);
  
  // Run risk engine every hour
  setInterval(() => {
    runRiskEngineForAll().catch(console.error);
  }, 60 * 60 * 1000);

  // Run once on startup (after 30s delay to allow DB connections)
  setTimeout(() => {
    runRiskEngineForAll().catch(console.error);
  }, 30000);
});
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

export default app;
