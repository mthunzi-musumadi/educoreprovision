import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import dotenv from 'dotenv';
import multer from 'multer';
import {
  getMicrosoftOidcConfig,
  generatePkce,
  parseJwtPayload,
  mapEntraRoleToUserRole,
  createSessionToken,
  verifySessionToken,
} from './server/auth.ts';
import {
  pool,
  withRlsContext,
  getFormDefinitions,
  getApplicationsQueue,
  createApplication,
  updateApplication,
  processApprovalStep,
  getLegacyPurchaseApplications,
  endorseIctApplicationByGM,
  clearIctApplicationByHR,
  signOffIctApplicationByIT,
  upsertUserFromEntraClaims,
  withdrawApplication,
  addApplicationAttachment,
  getApplicationAttachments,
  deleteApplicationAttachment,
  FormCode,
  LifecycleStatus,
} from './server/db.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure upload directory exists for supporting documents
const uploadDir = path.resolve(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const uploadStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const sanitizedOriginal = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${uniqueSuffix}_${sanitizedOriginal}`);
  },
});

const upload = multer({
  storage: uploadStorage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
});

// Helper to parse cookies from header
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

// Extend Express Request to carry the authenticated Entra OID
declare global {
  namespace Express {
    interface Request {
      entraOid?: string;
    }
  }
}

export async function createApp() {
  const app = express();
  app.set('trust proxy', true);
  app.use(express.json({ limit: '2mb' }));

  // ==========================================================================
  // 1. AUTHENTICATION MIDDLEWARE (Links Express -> Postgres RLS)
  // ==========================================================================
  app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let resolvedOid: string | undefined = undefined;

    // 1. Check explicit header
    const headerOid = req.headers['x-entra-oid'] as string | undefined;
    if (headerOid && uuidRegex.test(headerOid)) {
      resolvedOid = headerOid;
    }

    // 2. Check Bearer token in Authorization header
    if (!resolvedOid && req.headers.authorization?.startsWith('Bearer ')) {
      const token = req.headers.authorization.substring(7);
      const session = verifySessionToken(token);
      if (session?.entraOid && uuidRegex.test(session.entraOid)) {
        resolvedOid = session.entraOid;
      }
    }

    // 3. Check educore_session HttpOnly cookie
    if (!resolvedOid && req.headers.cookie) {
      const cookies = parseCookies(req.headers.cookie);
      if (cookies.educore_session) {
        const session = verifySessionToken(cookies.educore_session);
        if (session?.entraOid && uuidRegex.test(session.entraOid)) {
          resolvedOid = session.entraOid;
        }
      }
    }

    if (resolvedOid) {
      req.entraOid = resolvedOid;
    }

    next();
  });

  const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    if (!req.entraOid) {
      return res.status(401).json({
        error: 'Unauthorized: Missing or invalid x-entra-oid / Bearer token claim.',
      });
    }
    next();
  };

  // ==========================================================================
  // 1.1 MICROSOFT ENTRA ID OIDC / OAUTH 2.0 PKCE ROUTES
  // ==========================================================================

  app.get('/api/auth/config', (req: Request, res: Response) => {
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

  app.get('/api/auth/login', (req: Request, res: Response) => {
    const origin = `${req.protocol}://${req.get('host')}`;
    const config = getMicrosoftOidcConfig(origin);
    const state = crypto.randomBytes(16).toString('hex');
    const { codeVerifier, codeChallenge } = generatePkce();

    res.setHeader('Set-Cookie', `pkce_verifier=${codeVerifier}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`);

    if (config.isConfigured) {
      const authUrl =
        `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/authorize?` +
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
      if (req.query.json === 'true') {
        return res.json({
          configured: false,
          message: 'Microsoft Entra ID credentials not configured in .env.',
        });
      }
      return res.redirect(
        `/?auth_error=${encodeURIComponent(
          'Microsoft Entra ID credentials (MICROSOFT_CLIENT_ID, MICROSOFT_TENANT_ID) are not configured in .env.'
        )}`
      );
    }
  });

  app.get('/api/auth/callback', async (req: Request, res: Response) => {
    try {
      const { code, error, error_description } = req.query;
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

      let appOrigin = origin;
      try {
        const parsed = new URL(config.redirectUri);
        appOrigin = parsed.origin;
      } catch {}

      const tokenHeaders: Record<string, string> = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Origin': appOrigin,
      };

      const tokenParams = new URLSearchParams({
        client_id: config.clientId,
        code,
        redirect_uri: config.redirectUri,
        grant_type: 'authorization_code',
      });
      if (codeVerifier) {
        tokenParams.append('code_verifier', codeVerifier);
      }
      if (!config.isPublicClient && config.clientSecret) {
        tokenParams.append('client_secret', config.clientSecret);
      }

      let tokenRes = await fetch(`https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`, {
        method: 'POST',
        headers: tokenHeaders,
        body: tokenParams.toString(),
      });

      if (!tokenRes.ok) {
        const errText = await tokenRes.text();
        console.error('Failed to exchange code with Microsoft token endpoint:', errText);

        if (errText.includes('AADSTS700025') && tokenParams.has('client_secret')) {
          console.log('[Microsoft Entra ID] Retrying without client_secret for public client...');
          tokenParams.delete('client_secret');
          tokenRes = await fetch(`https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`, {
            method: 'POST',
            headers: tokenHeaders,
            body: tokenParams.toString(),
          });
        }

        if (!tokenRes.ok) {
          const finalErr = await tokenRes.text().catch(() => errText);
          return res.redirect(`/?auth_error=${encodeURIComponent('Token exchange failed: ' + finalErr.slice(0, 160))}`);
        }
      }

      const tokenData = (await tokenRes.json()) as any;
      const idToken = tokenData.id_token;
      const idTokenPayload = parseJwtPayload(idToken) || {};

      const entraOid = idTokenPayload.oid || idTokenPayload.sub;
      const email = idTokenPayload.preferred_username || idTokenPayload.email || idTokenPayload.upn;
      const fullName = idTokenPayload.name || email?.split('@')[0] || 'Educore Staff';
      const appRole = mapEntraRoleToUserRole(idTokenPayload.roles);
      const employeeNumber =
        idTokenPayload.extension_EmployeeNumber ||
        idTokenPayload.employeeId ||
        idTokenPayload.employee_id;
      const siteCode =
        idTokenPayload.extension_SiteCode ||
        idTokenPayload.officeLocation ||
        idTokenPayload.department;

      const user = await upsertUserFromEntraClaims({
        entraOid,
        email,
        fullName,
        role: appRole,
        siteCode,
        employeeNumber,
      });

      const sessionToken = createSessionToken({
        userId: user.id,
        entraOid: user.entra_oid,
        role: user.role,
        email: user.email,
      });

      res.setHeader('Set-Cookie', `educore_session=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`);
      res.redirect(`/?sso_success=true&user_id=${user.id}&entra_oid=${user.entra_oid}&token=${sessionToken}`);
    } catch (err: any) {
      console.error('OAuth callback processing error:', err);
      res.redirect(`/?auth_error=${encodeURIComponent(err.message)}`);
    }
  });

  app.get('/api/auth/me', requireAuth, async (req: Request, res: Response) => {
    try {
      const userRes = await pool.query(
        `SELECT u.*, i.name AS site_name, i.code AS site_code
         FROM public.users u
         JOIN public.sites i ON u.site_id = i.id
         WHERE u.entra_oid::text = $1 AND u.is_active = true`,
        [req.entraOid]
      );
      if (userRes.rows.length === 0) {
        return res.status(404).json({ error: 'User not found in Educore directory.' });
      }
      res.json({ authenticated: true, user: userRes.rows[0], entraOid: req.entraOid });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/auth/logout', (_req: Request, res: Response) => {
    res.setHeader('Set-Cookie', 'educore_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
    res.json({ success: true, message: 'Logged out successfully.' });
  });

  // Sandbox quick-switch / SSO login endpoint
  app.post('/api/auth/sso-login', async (req: Request, res: Response) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }
      const userRes = await pool.query(
        `SELECT u.*, i.name AS site_name, i.code AS site_code
         FROM public.users u
         JOIN public.sites i ON u.site_id = i.id
         WHERE u.id::text = $1 OR u.entra_oid::text = $1`,
        [userId]
      );
      if (userRes.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      const user = userRes.rows[0];
      const sessionToken = createSessionToken({
        userId: user.id,
        entraOid: user.entra_oid,
        role: user.role,
        email: user.email,
      });
      res.setHeader('Set-Cookie', `educore_session=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`);
      res.json({ success: true, user, token: sessionToken, entraOid: user.entra_oid });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Return active users list for directory and sandbox profile selector
  app.get('/api/users', async (_req: Request, res: Response) => {
    try {
      const userRes = await pool.query(
        `SELECT u.id, u.entra_oid, u.full_name, u.email, u.role, u.employee_number,
                u.department, u.job_title, u.site_id,
                i.name AS site_name, i.code AS site_code
         FROM public.users u
         JOIN public.sites i ON u.site_id = i.id
         WHERE u.is_active = true
         ORDER BY u.full_name ASC`
      );
      res.json(userRes.rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================================================
  // 2. BOOTSTRAP & CATALOG ENDPOINTS (Reference Data)
  // ==========================================================================

  // Healthcheck
  app.get('/api/health', async (_req: Request, res: Response) => {
    try {
      await pool.query('SELECT 1');
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err.message });
    }
  });

  // Fetch current user profile + reference catalogs (Sites, Tiers, Active Forms)
  app.get('/api/bootstrap', requireAuth, async (req: Request, res: Response) => {
    try {
      const data = await withRlsContext(req.entraOid!, async (client) => {
        const [userRes, sitesRes, tiersRes, formsRes, policiesRes] = await Promise.all([
          client.query(
            `SELECT u.*, i.name AS site_name, i.code AS site_code
             FROM public.users u
             JOIN public.sites i ON u.site_id = i.id
             WHERE u.entra_oid::text = $1 AND u.is_active = true`,
            [req.entraOid]
          ),
          client.query(`SELECT * FROM public.sites WHERE is_active = true ORDER BY name`),
          client.query(`SELECT * FROM public.equipment_tiers WHERE is_active = true ORDER BY price_zmw ASC`),
          client.query(`SELECT * FROM public.form_definitions WHERE is_active = true ORDER BY department, title`),
          client.query(`SELECT * FROM public.policy_versions WHERE is_active = true ORDER BY effective_date DESC`),
        ]);

        return {
          currentUser: userRes.rows[0] || null,
          sites: sitesRes.rows,
          equipmentTiers: tiersRes.rows,
          formDefinitions: formsRes.rows,
          policies: policiesRes.rows,
        };
      });

      if (!data.currentUser) {
        return res.status(403).json({ error: 'User profile not provisioned in Educore database.' });
      }

      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // List all 18 form definitions and their dynamic approval pipelines
  app.get('/api/forms', requireAuth, async (req: Request, res: Response) => {
    try {
      const forms = await getFormDefinitions(req.entraOid!);
      res.json(forms);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================================================
  // 3. UNIFIED WORKFLOW ENGINE ROUTES (Handles all 18 Forms)
  // ==========================================================================

  // Query applications queue (strictly filtered by Postgres RLS based on role, involvement & site)
  app.get('/api/applications', requireAuth, async (req: Request, res: Response) => {
    try {
      const { formCode, department, status, awaitingMyRoleOnly, scope } = req.query;
      const applications = await getApplicationsQueue(req.entraOid!, {
        formCode: formCode as FormCode | undefined,
        department: department as string | undefined,
        status: status as LifecycleStatus | undefined,
        awaitingMyRoleOnly: awaitingMyRoleOnly === 'true',
        scope: scope === 'MY_APPLICATIONS' ? 'MY_APPLICATIONS' : 'INVOLVED',
      });
      res.json(applications);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Get single application with full approval chain and audit timeline
  app.get('/api/applications/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      const result = await withRlsContext(req.entraOid!, async (client) => {
        const appRes = await client.query(
          `SELECT a.*, fd.code AS form_code, fd.title AS form_title, fd.department,
                  u.full_name AS applicant_name, u.employee_number, u.email AS applicant_email,
                  i.name AS site_name, i.code AS site_code
           FROM public.applications a
           JOIN public.form_definitions fd ON a.form_definition_id = fd.id
           JOIN public.users u ON a.applicant_id = u.id
           JOIN public.sites i ON a.site_id = i.id
           WHERE a.id = $1`,
          [req.params.id]
        );

        if (appRes.rowCount === 0) return null;

        const [approvalsRes, timelineRes, attachmentsRes] = await Promise.all([
          client.query(
            `SELECT * FROM public.application_approvals WHERE application_id = $1 ORDER BY step_order ASC`,
            [req.params.id]
          ),
          client.query(
            `SELECT * FROM public.application_timeline_events WHERE application_id = $1 ORDER BY created_at ASC`,
            [req.params.id]
          ),
          client.query(
            `SELECT att.*, u.full_name AS uploader_name
             FROM public.application_attachments att
             JOIN public.users u ON att.uploader_id = u.id
             WHERE att.application_id = $1
             ORDER BY att.created_at ASC`,
            [req.params.id]
          ),
        ]);

        return {
          ...appRes.rows[0],
          approvals: approvalsRes.rows,
          timeline: timelineRes.rows,
          attachments: attachmentsRes.rows,
        };
      });

      if (!result) {
        return res.status(404).json({ error: 'Application not found or access denied by RLS.' });
      }
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Submit or save a draft for ANY of the 18 forms
  app.post('/api/applications', requireAuth, async (req: Request, res: Response) => {
    try {
      const {
        formCode,
        submitImmediately = true,
        policyVersionId,
        termsAccepted,
        digitalSignature,
        payload,
      } = req.body;

      if (!formCode || !payload || typeof payload !== 'object') {
        return res.status(400).json({ error: 'formCode and payload object are required.' });
      }

      const created = await createApplication({
        entraOid: req.entraOid!,
        formCode: formCode as FormCode,
        submitImmediately: Boolean(submitImmediately),
        policyVersionId,
        termsAccepted: Boolean(termsAccepted),
        ipAddress: req.ip || null,
        userAgent: req.headers['user-agent'] || null,
        digitalSignature,
        payload,
      });

      res.status(201).json(created);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Update a draft or revision-requested application (and optionally submit)
  app.put('/api/applications/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      const {
        payload,
        submitImmediately = false,
        termsAccepted,
        digitalSignature,
      } = req.body;

      if (!payload || typeof payload !== 'object') {
        return res.status(400).json({ error: 'payload object is required.' });
      }

      const updated = await updateApplication({
        entraOid: req.entraOid!,
        applicationId: req.params.id,
        payload,
        submitImmediately: Boolean(submitImmediately),
        termsAccepted,
        digitalSignature,
      });

      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Upload attachment / supporting document for an application
  app.post('/api/applications/:id/attachments', requireAuth, upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
      }

      const attachment = await addApplicationAttachment(req.entraOid!, req.params.id, {
        fileName: req.file.originalname,
        fileSizeBytes: req.file.size,
        mimeType: req.file.mimetype,
        storagePath: req.file.path,
      });

      res.status(201).json(attachment);
    } catch (err: any) {
      if (req.file?.path && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch {}
      }
      res.status(400).json({ error: err.message });
    }
  });

  // Get attachments for an application
  app.get('/api/applications/:id/attachments', requireAuth, async (req: Request, res: Response) => {
    try {
      const attachments = await getApplicationAttachments(req.entraOid!, req.params.id);
      res.json(attachments);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Securely download / stream an attachment
  app.get('/api/attachments/:id/download', requireAuth, async (req: Request, res: Response) => {
    try {
      const attRes = await withRlsContext(req.entraOid!, async (client) => {
        const query = `
          SELECT att.* 
          FROM public.application_attachments att
          JOIN public.applications a ON att.application_id = a.id
          WHERE att.id = $1
        `;
        const r = await client.query(query, [req.params.id]);
        return r.rows[0];
      });

      if (!attRes) {
        return res.status(404).json({ error: 'Attachment not found or access denied.' });
      }

      if (!fs.existsSync(attRes.storage_path)) {
        return res.status(404).json({ error: 'Physical file not found on server.' });
      }

      res.setHeader('Content-Type', attRes.mime_type || 'application/octet-stream');
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(attRes.file_name)}"`);
      fs.createReadStream(attRes.storage_path).pipe(res);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Delete an attachment
  app.delete('/api/attachments/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      const result = await deleteApplicationAttachment(req.entraOid!, req.params.id);
      if (result.storagePath && fs.existsSync(result.storagePath)) {
        try {
          fs.unlinkSync(result.storagePath);
        } catch {}
      }
      res.json({ success: true, message: 'Attachment deleted.' });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Single unified sign-off endpoint for ALL roles (GM, HR, IT, Finance, Logistics, Line Manager)
  app.post('/api/applications/:id/decision', requireAuth, async (req: Request, res: Response) => {
    try {
      const { decision, comments, digitalSignature, checklistData, stepMetadata } = req.body;

      if (!['APPROVED', 'REJECTED', 'REVISION_REQUESTED'].includes(decision)) {
        return res.status(400).json({
          error: 'decision must be APPROVED, REJECTED, or REVISION_REQUESTED.',
        });
      }

      const updated = await processApprovalStep({
        entraOid: req.entraOid!,
        applicationId: req.params.id,
        decision,
        comments,
        digitalSignature,
        checklistData,
        stepMetadata,
      });

      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Applicant withdrawal route
  app.post('/api/applications/:id/withdraw', requireAuth, async (req: Request, res: Response) => {
    try {
      const { reason } = req.body || {};
      const updated = await withdrawApplication(req.entraOid!, req.params.id, reason);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ==========================================================================
  // 4. LEGACY ICT PURCHASE ROUTES (Keeps existing Frontend Modals alive)
  // ==========================================================================

  app.get('/api/legacy/ict-applications', requireAuth, async (req: Request, res: Response) => {
    try {
      const rows = await getLegacyPurchaseApplications(req.entraOid!);
      res.json(rows);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/legacy/ict-applications/:id/gm-endorse', requireAuth, async (req: Request, res: Response) => {
    try {
      const { decision, comments } = req.body;
      const updated = await endorseIctApplicationByGM(req.entraOid!, req.params.id, decision, comments);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/legacy/ict-applications/:id/hr-clearance', requireAuth, async (req: Request, res: Response) => {
    try {
      const { decision, comments, vettingChecklist } = req.body;
      const updated = await clearIctApplicationByHR(
        req.entraOid!,
        req.params.id,
        decision,
        comments,
        vettingChecklist
      );
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/legacy/ict-applications/:id/it-signoff', requireAuth, async (req: Request, res: Response) => {
    try {
      const { decision, assetSerialNumber, deductedMonthlyAmountZmw, deductionStartDate, deductionEndDate, comments } =
        req.body;
      const updated = await signOffIctApplicationByIT(req.entraOid!, req.params.id, decision, {
        assetSerialNumber,
        deductedMonthlyAmountZmw,
        deductionStartDate,
        deductionEndDate,
        comments,
      });
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ==========================================================================
  // 5. VITE DEV SERVER / STATIC PRODUCTION BUNDLE
  // ==========================================================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  return app;
}

// Only bind to port when executed directly (allows Vitest/Supertest to import createApp)
if (process.env.NODE_ENV !== 'test') {
  const PORT = Number(process.env.PORT) || 3000;
  createApp().then((app) => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[Educore Provision] Workflow Engine running on http://localhost:${PORT}`);
    });
  });
}