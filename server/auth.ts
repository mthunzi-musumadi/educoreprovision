import crypto from 'crypto';
import dotenv from 'dotenv';
import { UserRole } from '../src/types/index.ts';

dotenv.config();

export interface MicrosoftOidcConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  isConfigured: boolean;
  isPublicClient: boolean;
}

export function getMicrosoftOidcConfig(reqOrigin?: string): MicrosoftOidcConfig {
  const tenantId =
    process.env.MICROSOFT_TENANT_ID ||
    process.env.AZURE_TENANT_ID ||
    'common';
  const clientId =
    process.env.MICROSOFT_CLIENT_ID ||
    process.env.AZURE_CLIENT_ID ||
    '';
  const clientSecret =
    process.env.MICROSOFT_CLIENT_SECRET ||
    process.env.AZURE_CLIENT_SECRET ||
    '';
  
  const appUrl = process.env.APP_URL || reqOrigin || 'http://localhost:3000';
  const redirectUri =
    process.env.MICROSOFT_REDIRECT_URI ||
    process.env.AZURE_REDIRECT_URI ||
    `${appUrl.replace(/\/$/, '')}/api/auth/callback`;

  const isPublicClient =
    process.env.MICROSOFT_PUBLIC_CLIENT === 'true' ||
    process.env.MICROSOFT_CLIENT_TYPE === 'public' ||
    !clientSecret;

  return {
    tenantId,
    clientId,
    clientSecret,
    redirectUri,
    isConfigured: Boolean(clientId && tenantId),
    isPublicClient,
  };
}

export function mapEntraRoleToUserRole(roles?: string[] | string): UserRole {
  if (!roles) return 'APPLICANT';
  const roleArray = Array.isArray(roles) ? roles : [roles];
  const combined = roleArray.join(' ').toLowerCase();

  if (combined.includes('superadmin') || combined.includes('super_admin')) {
    return 'SUPER_ADMIN';
  }
  if (combined.includes('itmanager') || combined.includes('it_manager')) {
    return 'IT_MANAGER';
  }
  if (combined.includes('hrmanager') || combined.includes('hr_manager')) {
    return 'HR_MANAGER';
  }
  if (combined.includes('headteacher') || combined.includes('head_teacher')) {
    return 'HEAD_TEACHER';
  }
  return 'APPLICANT';
}

export function parseJwtPayload(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = Buffer.from(base64, 'base64').toString('utf8');
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

// Session signing using server HMAC secret
const SESSION_SECRET = process.env.SESSION_SECRET || 'educore-secret-jwt-key-2026-prd-production';

export function createSessionToken(payload: { userId: string; entraOid: string; role: string; email: string }): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const data = Buffer.from(
    JSON.stringify({
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
    })
  ).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(`${header}.${data}`)
    .digest('base64url');
  return `${header}.${data}.${signature}`;
}

export function verifySessionToken(token: string): { userId: string; entraOid: string; role: string; email: string } | null {
  try {
    const [header, data, signature] = token.split('.');
    if (!header || !data || !signature) return null;

    const expectedSig = crypto
      .createHmac('sha256', SESSION_SECRET)
      .update(`${header}.${data}`)
      .digest('base64url');

    if (signature !== expectedSig) return null;

    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function generatePkce(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  return { codeVerifier, codeChallenge };
}
