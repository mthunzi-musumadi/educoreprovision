import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { dbService } from './server/db.ts';
import { User } from './src/types/index.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  await dbService.initialize();

  const app = express();
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json());

  // Middleware to resolve actor user from x-user-id header
  const resolveActorUser = (req: Request, res: Response, next: NextFunction) => {
    const userId = req.headers['x-user-id'] as string;
    if (userId) {
      const user = dbService.getUserById(userId);
      (req as any).actorUser = user;
    }
    next();
  };

  app.use(resolveActorUser);

  // --- API Routes ---

  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      service: 'Educore Provision Backend',
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/institutions', (req, res) => {
    try {
      const institutions = dbService.getInstitutions();
      res.json(institutions);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/users', (req, res) => {
    try {
      const users = dbService.getUsers();
      res.json(users);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/applications (RLS-enforced based on x-user-id)
  app.get('/api/applications', (req, res) => {
    try {
      const actorUser = (req as any).actorUser as User | undefined;
      const applications = dbService.getApplications(actorUser);
      res.json(applications);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/applications/:id
  app.get('/api/applications/:id', (req, res) => {
    try {
      const actorUser = (req as any).actorUser as User | undefined;
      const appRecord = dbService.getApplicationById(req.params.id, actorUser);
      if (!appRecord) {
        return res.status(404).json({ error: 'Application not found or RLS access denied.' });
      }
      res.json(appRecord);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/applications/:id/timeline
  app.get('/api/applications/:id/timeline', (req, res) => {
    try {
      const actorUser = (req as any).actorUser as User | undefined;
      const timeline = dbService.getTimelineForApplication(req.params.id, actorUser);
      res.json(timeline);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/applications (Part 1 submission)
  app.post('/api/applications', async (req, res) => {
    try {
      const actorUser = (req as any).actorUser as User | undefined;
      if (!actorUser) {
        return res.status(401).json({ error: 'Unauthorized: missing x-user-id header.' });
      }

      const clientIp = req.headers['x-forwarded-for']?.toString() || req.socket.remoteAddress;
      const result = await dbService.submitPart1(actorUser, {
        tier: req.body.tier,
        repaymentPeriod: req.body.repaymentPeriod,
        estimatedMonthlyAmount: req.body.estimatedMonthlyAmount,
        termsAccepted: req.body.termsAccepted,
        ipAddress: clientIp,
        userAgent: req.headers['user-agent'],
      });

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.status(201).json(result.application);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/applications/:id/endorse (Part 2 Head Teacher review)
  app.post('/api/applications/:id/endorse', async (req, res) => {
    try {
      const actorUser = (req as any).actorUser as User | undefined;
      if (!actorUser) {
        return res.status(401).json({ error: 'Unauthorized: missing x-user-id header.' });
      }

      const { comments, actionType } = req.body;
      const result = await dbService.endorsePart2(
        actorUser,
        req.params.id,
        comments,
        actionType || 'ENDORSE'
      );

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json(result.application);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/applications/:id/clearance (Part 3 HR Review)
  app.post('/api/applications/:id/clearance', async (req, res) => {
    try {
      const actorUser = (req as any).actorUser as User | undefined;
      if (!actorUser) {
        return res.status(401).json({ error: 'Unauthorized: missing x-user-id header.' });
      }

      const { checklist, comments, isRejecting } = req.body;
      const result = await dbService.clearPart3(actorUser, req.params.id, {
        checklist,
        comments,
        isRejecting: Boolean(isRejecting),
      });

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json(result.application);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/applications/:id/signoff (Part 4 IT Finalization)
  app.post('/api/applications/:id/signoff', async (req, res) => {
    try {
      const actorUser = (req as any).actorUser as User | undefined;
      if (!actorUser) {
        return res.status(401).json({ error: 'Unauthorized: missing x-user-id header.' });
      }

      const { serialNumber, monthlyAmount, startDate, endDate, comments, isRejecting } = req.body;
      const result = await dbService.signoffPart4(actorUser, req.params.id, {
        serialNumber,
        monthlyAmount,
        startDate,
        endDate,
        comments,
        isRejecting: Boolean(isRejecting),
      });

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json(result.application);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/applications/:id/withdraw
  app.post('/api/applications/:id/withdraw', async (req, res) => {
    try {
      const actorUser = (req as any).actorUser as User | undefined;
      if (!actorUser) {
        return res.status(401).json({ error: 'Unauthorized: missing x-user-id header.' });
      }

      const result = await dbService.withdrawApplication(actorUser, req.params.id);
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/database/reset
  app.post('/api/database/reset', async (req, res) => {
    try {
      const resetData = await dbService.resetDatabase();
      res.json({ success: true, message: 'Database reset to initial seed benchmark state.', resetData });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Mount Vite or static files
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Educore Provision server active on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Educore Provision server:', err);
  process.exitCode = 1;
});
