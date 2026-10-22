import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { connectDB } from './db/connect.js';

// Import routes
import authRoutes from './routes/auth.js';
import onboardingRoutes from './routes/onboarding.js';
import recommendationRoutes from './routes/recommendations.js';
import analyticsRoutes from './routes/analytics.js';
import dailyTaskRoutes from './routes/dailyTasks.js';
import resumeRoutes from './routes/resume.js';
import jobRoutes from './routes/jobs.js';
import interactionRoutes from './routes/interactions.js';
import courseRoutes from './routes/courses.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(compression());
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  process.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5173',
].filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later' },
});
app.use('/api/', limiter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/daily-tasks', dailyTaskRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/interactions', interactionRoutes);
app.use('/api/courses', courseRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
async function start() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();