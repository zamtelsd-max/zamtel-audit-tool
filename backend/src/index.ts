import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import authRoutes from './routes/auth';
import deviceRoutes from './routes/devices';
import dashboardRoutes from './routes/dashboard';
import caseRoutes from './routes/cases';
import userRoutes from './routes/users';
import reportRoutes from './routes/reports';
import { runRiskEngineForAll } from './utils/riskEngine';

dotenv.config();

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

// Start server
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

export default app;
