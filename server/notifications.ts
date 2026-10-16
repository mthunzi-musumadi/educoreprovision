import dotenv from 'dotenv';
import type { PoolClient } from 'pg';
import { pool } from './db.ts';

dotenv.config();

export type NotificationType =
  | 'APPLICATION_SUBMITTED'
  | 'STEP_ADVANCED'
  | 'REVISION_REQUESTED'
  | 'APPLICATION_APPROVED'
  | 'APPLICATION_REJECTED'
  | 'APPLICATION_WITHDRAWN';

export interface NotificationPayload {
  type: NotificationType;
  applicationId: string;
  referenceNumber: string;
  formTitle: string;
  department: string;
  siteName: string;
  applicantName: string;
  applicantEmail: string;
  recipientEmail: string;
  recipientName: string;
  recipientRole?: string;
  comments?: string;
  stepLabel?: string;
}

const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const FROM_EMAIL = process.env.SMTP_FROM || 'provision-notifications@educore.org.zm';

function buildEmailHtml(payload: NotificationPayload): { subject: string; html: string; text: string } {
  let subject = `[Educore Provision] ${payload.referenceNumber} - ${payload.formTitle}`;
  let title = '';
  let badgeColor = '#0284c7'; // sky-600
  let badgeText = 'Workflow Update';
  let message = '';

  switch (payload.type) {
    case 'APPLICATION_SUBMITTED':
      subject = `[Action Required] Sign-off Request: ${payload.referenceNumber} (${payload.formTitle})`;
      title = 'Sign-off Action Required';
      badgeColor = '#0284c7';
      badgeText = 'Awaiting Your Review';
      message = `A new request has been submitted by <strong>${payload.applicantName}</strong> (${payload.siteName}) and is now awaiting your sign-off as <strong>${payload.recipientRole || 'Reviewer'}</strong>.`;
      break;

    case 'STEP_ADVANCED':
      subject = `[Action Required] Approval Advanced: ${payload.referenceNumber} (${payload.formTitle})`;
      title = 'Approval Advanced to Your Desk';
      badgeColor = '#0284c7';
      badgeText = 'Pending Approval';
      message = `Request <strong>${payload.referenceNumber}</strong> has cleared previous verification and is now queued for your review as <strong>${payload.recipientRole || 'Approver'}</strong>.`;
      break;

    case 'REVISION_REQUESTED':
      subject = `[Action Required] Revision Requested: ${payload.referenceNumber}`;
      title = 'Revision Required on Your Submission';
      badgeColor = '#ea580c'; // orange-600
      badgeText = 'Revision Required';
      message = `Your request <strong>${payload.referenceNumber}</strong> (${payload.formTitle}) requires revision before it can proceed. Please review the reviewer's comments below, make the necessary modifications, and resubmit.`;
      break;

    case 'APPLICATION_APPROVED':
      subject = `[Approved] Request Fully Approved: ${payload.referenceNumber}`;
      title = 'Application Approved';
      badgeColor = '#16a34a'; // green-600
      badgeText = 'Approved & Finalized';
      message = `Congratulations! Your request <strong>${payload.referenceNumber}</strong> (${payload.formTitle}) has completed all approval stages and is now officially approved.`;
      break;

    case 'APPLICATION_REJECTED':
      subject = `[Notice] Request Rejected: ${payload.referenceNumber}`;
      title = 'Application Not Approved';
      badgeColor = '#dc2626'; // red-600
      badgeText = 'Rejected';
      message = `Your request <strong>${payload.referenceNumber}</strong> (${payload.formTitle}) was reviewed and not approved by <strong>${payload.recipientRole || 'Management'}</strong>.`;
      break;

    case 'APPLICATION_WITHDRAWN':
      subject = `[Notice] Request Withdrawn: ${payload.referenceNumber}`;
      title = 'Application Withdrawn by Applicant';
      badgeColor = '#64748b'; // slate-500
      badgeText = 'Withdrawn';
      message = `Request <strong>${payload.referenceNumber}</strong> was withdrawn by the applicant (<strong>${payload.applicantName}</strong>). No further action is required.`;
      break;
  }

  const actionUrl = `${APP_URL.replace(/\/$/, '')}/?applicationId=${payload.applicationId}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { background: #0f172a; padding: 24px 32px; color: #ffffff; }
    .header h1 { margin: 0; font-size: 18px; font-weight: 700; letter-spacing: -0.025em; }
    .header p { margin: 4px 0 0; font-size: 12px; color: #94a3b8; }
    .body { padding: 32px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #ffffff; background: ${badgeColor}; margin-bottom: 16px; }
    .title { margin: 0 0 16px; font-size: 20px; font-weight: 700; color: #0f172a; }
    .message { font-size: 14px; line-height: 1.6; color: #334155; margin-bottom: 24px; }
    .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; }
    .meta-table td { padding: 10px 14px; font-size: 12px; border-bottom: 1px solid #e2e8f0; }
    .meta-table tr:last-child td { border-bottom: none; }
    .meta-label { color: #64748b; font-weight: 600; width: 35%; }
    .meta-val { color: #0f172a; font-weight: 700; }
    .comments-box { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 14px 16px; border-radius: 4px; margin-bottom: 24px; }
    .comments-title { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #92400e; margin-bottom: 4px; }
    .comments-text { font-size: 13px; color: #78350f; line-height: 1.5; margin: 0; }
    .btn-container { text-align: center; margin: 32px 0 16px; }
    .btn { display: inline-block; background: #0284c7; color: #ffffff !important; font-size: 13px; font-weight: 700; text-decoration: none; padding: 12px 28px; border-radius: 8px; }
    .footer { background: #f1f5f9; padding: 20px 32px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Educore Services Zambia</h1>
      <p>Enterprise Workflow & Provisioning Engine</p>
    </div>
    <div class="body">
      <div class="badge">${badgeText}</div>
      <h2 class="title">${title}</h2>
      <div class="message">${message}</div>

      <table class="meta-table">
        <tr>
          <td class="meta-label">Reference Number</td>
          <td class="meta-val font-mono">${payload.referenceNumber}</td>
        </tr>
        <tr>
          <td class="meta-label">Document Title</td>
          <td class="meta-val">${payload.formTitle}</td>
        </tr>
        <tr>
          <td class="meta-label">Department</td>
          <td class="meta-val">${payload.department}</td>
        </tr>
        <tr>
          <td class="meta-label">Educore Site</td>
          <td class="meta-val">${payload.siteName}</td>
        </tr>
        <tr>
          <td class="meta-label">Applicant</td>
          <td class="meta-val">${payload.applicantName}</td>
        </tr>
        ${payload.stepLabel ? `<tr><td class="meta-label">Workflow Stage</td><td class="meta-val">${payload.stepLabel}</td></tr>` : ''}
      </table>

      ${
        payload.comments
          ? `
      <div class="comments-box">
        <div class="comments-title">Reviewer Remarks</div>
        <p class="comments-text">${payload.comments}</p>
      </div>`
          : ''
      }

      <div class="btn-container">
        <a href="${actionUrl}" class="btn" target="_blank">View Request in Portal</a>
      </div>
    </div>
    <div class="footer">
      This is an automated notification from Educore Provision. Please do not reply directly to this email.<br>
      Educore Services · All 9 Campuses · Central Administration
    </div>
  </div>
</body>
</html>
`;

  const text = `[Educore Provision] ${payload.referenceNumber} - ${payload.formTitle}
------------------------------------------------------------
${title} (${badgeText})
${message}

Reference: ${payload.referenceNumber}
Form: ${payload.formTitle}
Department: ${payload.department}
Site: ${payload.siteName}
Applicant: ${payload.applicantName}
${payload.comments ? `\nReviewer Comments: ${payload.comments}\n` : ''}

Access application: ${actionUrl}
`;

  return { subject, html, text };
}

/**
 * Dispatches an event-driven notification.
 * In development or when SMTP is not configured, formats and logs the email cleanly to stdout.
 */
export async function sendWorkflowNotification(payload: NotificationPayload): Promise<void> {
  const { subject, html, text } = buildEmailHtml(payload);

  // If SMTP or Microsoft Graph API credentials are configured in .env:
  const smtpHost = process.env.SMTP_HOST;
  if (smtpHost && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      // Dynamic import of nodemailer if configured
      const nodemailer = await import('nodemailer');
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from: `"${process.env.SMTP_FROM_NAME || 'Educore Provision'}" <${FROM_EMAIL}>`,
        to: payload.recipientEmail,
        subject,
        text,
        html,
      });

      console.log(`[Notification] Sent email '${subject}' to ${payload.recipientEmail}`);
      return;
    } catch (err: any) {
      console.error(`[Notification] Failed to send email via SMTP to ${payload.recipientEmail}:`, err.message);
    }
  }

  // Development Fallback: Structured Console Delivery
  console.log(`
┌────────────────────────────────────────────────────────────────────────┐
│ [NOTIFICATION DISPATCHED] ${payload.type.padEnd(44)} │
├────────────────────────────────────────────────────────────────────────┤
│ To:      ${payload.recipientName} <${payload.recipientEmail}>
│ Subject: ${subject}
│ App Ref: ${payload.referenceNumber} (${payload.formTitle})
│ Site:    ${payload.siteName}
│ Stage:   ${payload.stepLabel || 'N/A'}
│ Link:    ${APP_URL}/?applicationId=${payload.applicationId}
${payload.comments ? `│ Comments: "${payload.comments}"\n` : ''}└────────────────────────────────────────────────────────────────────────┘
`);
}

/**
 * Resolves the recipient staff details for a given workflow application stage
 * and dispatches the appropriate notification.
 */
export async function triggerStageNotification(
  client: PoolClient,
  type: NotificationType,
  applicationId: string,
  options: {
    reviewerComments?: string;
  } = {}
): Promise<void> {
  try {
    const appRes = await client.query(
      `SELECT a.*, fd.title AS form_title, fd.department,
              u.full_name AS applicant_name, u.email AS applicant_email,
              s.name AS site_name, s.code AS site_code
       FROM public.applications a
       JOIN public.form_definitions fd ON a.form_definition_id = fd.id
       JOIN public.users u ON a.applicant_id = u.id
       JOIN public.sites s ON a.site_id = s.id
       WHERE a.id = $1`,
      [applicationId]
    );

    if (appRes.rowCount === 0) return;
    const app = appRes.rows[0];

    // Case 1: Notification directly to the Applicant (Approved, Rejected, Revision Required, Withdrawn)
    if (type === 'REVISION_REQUESTED' || type === 'APPLICATION_APPROVED' || type === 'APPLICATION_REJECTED' || type === 'APPLICATION_WITHDRAWN') {
      await sendWorkflowNotification({
        type,
        applicationId: app.id,
        referenceNumber: app.reference_number,
        formTitle: app.form_title,
        department: app.department,
        siteName: app.site_name,
        applicantName: app.applicant_name,
        applicantEmail: app.applicant_email,
        recipientEmail: app.applicant_email,
        recipientName: app.applicant_name,
        comments: options.reviewerComments,
      });
      return;
    }

    // Case 2: Notification to the next Approver in line (Submitted or Step Advanced)
    if ((type === 'APPLICATION_SUBMITTED' || type === 'STEP_ADVANCED') && app.current_approver_role) {
      // Find eligible approver(s) based on site scope
      const approverQuery = `
        SELECT u.id, u.full_name, u.email, u.role
        FROM public.users u
        JOIN public.sites s ON u.site_id = s.id
        WHERE u.role = $1
          AND u.is_active = true
          AND (
            -- Central roles operate organization-wide across all 9 sites
            s.code = 'CENTRAL'
            -- Site-scoped roles (Head Teacher, Line Manager) match application's origin site
            OR u.site_id = $2
          )
        ORDER BY (u.site_id = $2) DESC
        LIMIT 1
      `;

      const approverRes = await client.query(approverQuery, [app.current_approver_role, app.site_id]);

      if (approverRes.rowCount && approverRes.rowCount > 0) {
        const approver = approverRes.rows[0];
        await sendWorkflowNotification({
          type,
          applicationId: app.id,
          referenceNumber: app.reference_number,
          formTitle: app.form_title,
          department: app.department,
          siteName: app.site_name,
          applicantName: app.applicant_name,
          applicantEmail: app.applicant_email,
          recipientEmail: approver.email,
          recipientName: approver.full_name,
          recipientRole: approver.role,
          comments: options.reviewerComments,
        });
      }
    }
  } catch (err: any) {
    console.error('[Notification Trigger Error]', err.message);
  }
}
