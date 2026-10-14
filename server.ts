import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { dbService } from './server/db.ts';
import { User } from './src/types/index.ts';
import {
  getMicrosoftOidcConfig,
  mapEntraRoleToUserRole,
  parseJwtPayload,
  createSessionToken,
  verifySessionToken,
  generatePkce,
} from './server/auth.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseCookies(cookieHeader?: string): Record<string, string> {
  const list: Record<string, string> = {};
  if (!cookieHeader) return list;
  cookieHeader.split(';').forEach((cookie) => {
    const [name, ...rest] = cookie.split('=');
    if (!name) return;
    const key = name.trim();
    const value = rest.join('=').trim();
    list[key] = decodeURIComponent(value);
  });
  return list;
}

async function startServer() {
  await dbService.initialize();

  const app = express();
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json());

  // Middleware to resolve actor user from x-user-id header, Authorization Bearer, or cookie
  const resolveActorUser = async (req: Request, res: Response, next: NextFunction) => {
    let userIdentifier: string | undefined = req.headers['x-user-id'] as string;

    if (!userIdentifier && req.headers.authorization?.startsWith('Bearer ')) {
      const token = req.headers.authorization.substring(7);
      const session = verifySessionToken(token);
      if (session) {
        userIdentifier = session.userId;
      } else {
        userIdentifier = token;
      }
    }

    if (!userIdentifier && req.headers.cookie) {
      const cookies = parseCookies(req.headers.cookie);
      if (cookies.educore_session) {
        const session = verifySessionToken(cookies.educore_session);
        if (session) {
          userIdentifier = session.userId;
        }
      }
    }

    if (userIdentifier) {
      try {
        const user = await dbService.getUserById(userIdentifier);
        (req as any).actorUser = user;
      } catch (e) {
        console.error('Failed to resolve actor user:', e);
      }
    }
    next();
  };

  app.use(resolveActorUser);

  // --- Authentication Routes (Microsoft Entra ID OIDC / OAuth2 & Sessions) ---

  app.get('/api/auth/config', (req, res) => {
    const origin = `${req.protocol}://${req.get('host')}`;
    const config = getMicrosoftOidcConfig(origin);
    res.json({
      configured: config.isConfigured,
      tenantId: config.tenantId,
      clientId: config.clientId,
      redirectUri: config.redirectUri,
      provider: 'Microsoft Entra ID (OIDC / OAuth 2.0 with PKCE & App Roles)',
    });
  });

  app.get('/api/auth/login', (req, res) => {
    const origin = `${req.protocol}://${req.get('host')}`;
    const config = getMicrosoftOidcConfig(origin);
    const state = crypto.randomBytes(16).toString('hex');
    const { codeVerifier, codeChallenge } = generatePkce();

    res.setHeader('Set-Cookie', `pkce_verifier=${codeVerifier}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`);

    if (config.isConfigured) {
      const authUrl = `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/authorize?` +
        new URLSearchParams({
          client_id: config.clientId,
          response_type: 'code',
          redirect_uri: config.redirectUri,
          response_mode: 'query',
          scope: 'openid profile email User.Read offline_access',
          state,
          code_challenge: codeChallenge,
          code_challenge_method: 'S256',
        }).toString();

      if (req.query.json === 'true') {
        return res.json({ authUrl, state });
      }
      return res.redirect(authUrl);
    } else {
      // In development or simulation without Azure credentials in .env
      res.json({
        configured: false,
        message: 'Microsoft Entra ID credentials not configured in .env. Interactive directory SSO active.',
      });
    }
  });

  app.get('/api/auth/callback', async (req, res) => {
    try {
      const { code, state, error, error_description } = req.query;
      if (error) {
        return res.redirect(`/?auth_error=${encodeURIComponent(String(error_description || error))}`);
      }
      if (!code || typeof code !== 'string') {
        return res.redirect('/?auth_error=missing_authorization_code');
      }

      const origin = `${req.protocol}://${req.get('host')}`;
      const config = getMicrosoftOidcConfig(origin);
      const cookies = parseCookies(req.headers.cookie);
      const codeVerifier = cookies.pkce_verifier;

      const tokenParams = new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        redirect_uri: config.redirectUri,
        grant_type: 'authorization_code',
      });
      if (codeVerifier) {
        tokenParams.append('code_verifier', codeVerifier);
      }

      const tokenRes = await fetch(`https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tokenParams.toString(),
      });

      if (!tokenRes.ok) {
        const errText = await tokenRes.text();
        console.error('Failed to exchange code with Microsoft token endpoint:', errText);
        return res.redirect(`/?auth_error=${encodeURIComponent('Token exchange failed')}`);
      }

      const tokenData = (await tokenRes.json()) as any;
      const idTokenPayload = parseJwtPayload(tokenData.id_token) || {};

      const entraOid = idTokenPayload.oid || idTokenPayload.sub;
      const email = idTokenPayload.preferred_username || idTokenPayload.email || idTokenPayload.upn;
      const fullName = idTokenPayload.name || email?.split('@')[0] || 'Educore Staff';
      const appRole = mapEntraRoleToUserRole(idTokenPayload.roles);
      const employeeNumber = idTokenPayload.extension_EmployeeNumber;
      const institutionCode = idTokenPayload.extension_InstitutionCode;

      const user = await dbService.upsertUserFromEntraClaims({
        entraOid,
        email,
        fullName,
        role: appRole,
        employeeNumber,
        institutionCode,
      });

      const sessionToken = createSessionToken({
        userId: user.id,
        entraOid: user.entraOid,
        role: user.role,
        email: user.email,
      });

      res.setHeader('Set-Cookie', `educore_session=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`);
      res.redirect(`/?sso_success=true&user_id=${user.id}`);
    } catch (err: any) {
      console.error('OAuth callback processing error:', err);
      res.redirect(`/?auth_error=${encodeURIComponent(err.message)}`);
    }
  });

  app.post('/api/auth/sso-login', async (req, res) => {
    try {
      const { userId, email, entraOid } = req.body;
      let user: User | undefined;
      if (userId) {
        user = await dbService.getUserById(userId);
      } else if (entraOid) {
        user = await dbService.getUserById(entraOid);
      } else if (email) {
        user = await dbService.getUserById(email);
      }

      if (!user) {
        return res.status(404).json({ error: 'User not found in directory registry.' });
      }

      const sessionToken = createSessionToken({
        userId: user.id,
        entraOid: user.entraOid,
        role: user.role,
        email: user.email,
      });

      res.setHeader('Set-Cookie', `educore_session=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`);
      res.json({
        success: true,
        user,
        token: sessionToken,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/auth/me', (req, res) => {
    const actorUser = (req as any).actorUser as User | undefined;
    if (!actorUser) {
      return res.status(401).json({ authenticated: false, message: 'No active session or x-user-id' });
    }
    res.json({
      authenticated: true,
      user: actorUser,
      entraOid: actorUser.entraOid,
      role: actorUser.role,
    });
  });

  app.post('/api/auth/logout', (req, res) => {
    res.setHeader('Set-Cookie', 'educore_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
    res.json({ success: true, message: 'Logged out successfully.' });
  });

  // --- Core API Routes ---

  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      service: 'Educore Provision Backend',
      database: 'PostgreSQL 18 (educoreprovision)',
      auth: 'Microsoft Entra ID (OIDC / OAuth2 with PKCE & App Roles)',
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/institutions', async (req, res) => {
    try {
      const institutions = await dbService.getInstitutions();
      res.json(institutions);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/users', async (req, res) => {
    try {
      const users = await dbService.getUsers();
      res.json(users);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/timeline', async (req, res) => {
    try {
      const actorUser = (req as any).actorUser as User | undefined;
      const timeline = await dbService.getAllTimelineEvents(actorUser);
      res.json(timeline);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/applications (RLS-enforced based on x-user-id)
  app.get('/api/applications', async (req, res) => {
    try {
      const actorUser = (req as any).actorUser as User | undefined;
      const applications = await dbService.getApplications(actorUser);
      res.json(applications);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/applications/:id
  app.get('/api/applications/:id', async (req, res) => {
    try {
      const actorUser = (req as any).actorUser as User | undefined;
      const appRecord = await dbService.getApplicationById(req.params.id, actorUser);
      if (!appRecord) {
        return res.status(404).json({ error: 'Application not found or RLS access denied.' });
      }
      res.json(appRecord);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/applications/:id/timeline
  app.get('/api/applications/:id/timeline', async (req, res) => {
    try {
      const actorUser = (req as any).actorUser as User | undefined;
      const timeline = await dbService.getTimelineForApplication(req.params.id, actorUser);
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
