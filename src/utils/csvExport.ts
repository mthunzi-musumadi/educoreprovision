import { WorkflowApplication } from '../types';

/**
 * RFC-4180 compliant CSV cell escaping.
 * Handles null/undefined, quotes, commas, newlines, and formula injection guard.
 */
export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '""';
  }

  let str: string;
  if (typeof value === 'object') {
    try {
      str = JSON.stringify(value);
    } catch {
      str = String(value);
    }
  } else {
    str = String(value);
  }

  // Guard against CSV formula injection in spreadsheet applications (=, +, -, @)
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // Escape existing quotes with double quotes
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Summarizes the form payload into a clean, human-readable summary string for CSV and tabular audit views.
 */
export function formatPayloadSummaryForCsv(app: WorkflowApplication): string {
  const p = (app.payload || {}) as Record<string, any>;

  switch (app.form_code) {
    case 'ICT_PURCHASE':
      return `Tier ID: ${p.equipment_tier_id || 'Standard'} | Est. Monthly: ZMW ${Number(
        p.estimated_monthly_amount_zmw || 0
      ).toFixed(2)} | Repayment: ${p.repayment_period || 'N/A'}`;

    case 'TRAVEL_REQUEST': {
      const paxCount = Array.isArray(p.passengers) ? p.passengers.length : 1;
      return `Destination: ${p.destination || p.location || 'N/A'} | Dates: ${
        p.departure_date || 'N/A'
      } to ${p.return_date || 'N/A'} | Mode: ${p.travel_mode || 'FLIGHT'} | Passengers: ${paxCount} | Reason: ${
        p.reason_for_travel || 'Official Travel'
      }`;
    }

    case 'SALARY_ADVANCE':
      return `Requested Amount: ZMW ${Number(p.requested_amount_zmw || 0).toFixed(
        2
      )} | Tenure: ${p.repayment_months || 1} Month(s) | Reason: ${
        p.reason_for_advance || p.reason || 'N/A'
      }`;

    case 'GRATUITY_ADVANCE':
      return `Requested Amount: ZMW ${Number(p.requested_amount_zmw || 0).toFixed(
        2
      )} | Accrued Service: ${p.accrued_months || 0} Month(s) | Reason: ${
        p.reason || 'N/A'
      }`;

    case 'CHILD_ADMISSION': {
      const children = Array.isArray(p.children) ? p.children : [];
      return `Academic Year: ${p.academic_year || '2026'} | Total Children: ${
        children.length
      } | Children: ${children
        .map((c: any) => `${c.child_full_name || 'Child'} (Grade ${c.grade_applying_for || 'N/A'})`)
        .join(', ')}`;
    }

    case 'PURCHASE_REQ': {
      const items = Array.isArray(p.items) ? p.items : [];
      return `Supplier: ${p.supplier_name || 'N/A'} | Currency: ${
        p.currency || 'ZMW'
      } | Total: ${p.currency || 'ZMW'} ${Number(
        p.total_amount_zmw || p.total_estimated_cost || 0
      ).toFixed(2)} | Line Items (${items.length}): ${items
        .map((i: any) => `${i.description || 'Item'} x${i.quantity || 1}`)
        .join('; ')}`;
    }

    case 'EXPENSE_RETIREMENT': {
      const expenses = Array.isArray(p.expenses) ? p.expenses : [];
      return `Imprest Ref: ${p.imprest_ref_number || 'N/A'} | Advance Issued: ZMW ${Number(
        p.total_advance_zmw || 0
      ).toFixed(2)} | Total Spent: ZMW ${Number(p.total_spent_zmw || 0).toFixed(
        2
      )} | Net Balance: ZMW ${Number(p.balance_zmw || 0).toFixed(2)} | Receipts: ${
        expenses.length
      }`;
    }

    case 'STORES_REQ':
    case 'STOCK_RETURN': {
      const items = Array.isArray(p.items) ? p.items : [];
      return `Department: ${p.department || app.department} | Purpose: ${
        p.purpose || 'N/A'
      } | Line Items (${items.length}): ${items
        .map((i: any) => `${i.item_description || 'Item'} x${i.quantity_requested || i.quantity || 1}`)
        .join('; ')}`;
    }

    case 'EDU_HEALTH_CLAIM': {
      const claims = Array.isArray(p.claim_items) ? p.claim_items : [];
      return `Patient: ${p.patient_name || 'N/A'} | Scheme #: ${
        p.scheme_number || 'N/A'
      } | Total Claimed: ZMW ${Number(p.total_claimed_zmw || 0).toFixed(
        2
      )} | Claim Items (${claims.length}): ${claims
        .map((c: any) => `${c.description || 'Service'} (ZMW ${Number(c.amount_zmw || 0).toFixed(2)})`)
        .join('; ')}`;
    }

    case 'BANK_CHANGE':
      return `Bank: ${p.bank_name || 'N/A'} | Branch: ${
        p.branch_name || 'N/A'
      } | Account #: ${p.account_number || 'N/A'} | Currency: ${
        p.account_currency || 'ZMW'
      } | Transfer Type: ${p.transfer_type || 'SALARY'}`;

    case 'PROF_DEV':
      return `Course: ${p.course_title || 'N/A'} | Provider: ${
        p.provider || p.training_provider_location || 'N/A'
      } | Total Cost: ZMW ${Number(p.cost_zmw || p.total_costs_zmw || 0).toFixed(
        2
      )} | Dates: ${p.start_date || 'N/A'} to ${p.end_date || 'N/A'}`;

    case 'CONTRACT_RENEWAL':
      return `Proposed Tenure: ${p.proposed_tenure_months || 24} Months | Current Expiry: ${
        p.current_contract_end_date || 'N/A'
      } | Department Head Recommendation: ${p.department_head_recommendation || 'N/A'}`;

    case 'EXCULPATORY':
      return `Charge Ref: ${p.charge_reference || 'N/A'} | Incident Date: ${
        p.incident_date || 'N/A'
      } | Statement Summary: ${(p.statement_of_defense || p.statement || '').slice(0, 100)}`;

    case 'JOB_DESCRIPTION':
      return `Title: ${p.job_title || 'N/A'} | Reports To: ${
        p.reports_to || 'N/A'
      } | Location/Site: ${p.location || 'N/A'} | Department: ${p.department || 'N/A'}`;

    case 'MANPOWER_REQ':
      return `Position: ${p.position_title || 'N/A'} | Headcount: ${
        p.headcount || 1
      } | Type: ${p.employment_type || 'FULL_TIME'} | Justification: ${
        p.justification || 'N/A'
      }`;

    case 'EVENT_COMPLETION':
      return `Event: ${p.event_name || 'N/A'} | Date: ${
        p.event_date || 'N/A'
      } | Venue: ${p.venue || 'N/A'} | Revenue: ZMW ${Number(p.total_revenue_zmw || 0).toFixed(2)} | Cost: ZMW ${Number(p.total_cost_zmw || 0).toFixed(2)}`;

    case 'DISCIPLINARY_CHARGE':
      return `Employee Charged: ${p.employee_name || 'N/A'} | Charge Category: ${
        p.charge_category || 'N/A'
      } | Hearing Date: ${p.hearing_date || 'N/A'}`;

    default: {
      const keys = Object.keys(p);
      if (keys.length === 0) return 'No payload data';
      return keys
        .slice(0, 5)
        .map((k) => `${k}: ${typeof p[k] === 'object' ? JSON.stringify(p[k]) : p[k]}`)
        .join(' | ');
    }
  }
}

/**
 * Generates an RFC-4180 compliant CSV document string with UTF-8 support.
 */
export function generateApplicationsCsv(applications: WorkflowApplication[]): string {
  const headers = [
    'Reference Number',
    'Department',
    'Form Code',
    'Form Title',
    'Applicant Name',
    'Applicant Employee Number',
    'Site Name',
    'Lifecycle Status',
    'Current Approver Role',
    'Current Step Order',
    'Created At',
    'Applicant Signed At',
    'Digital Signature',
    'Approved Steps Completed',
    'Form Details Summary',
    'Payload JSON',
  ];

  const rows = applications.map((app) => {
    const approvedStepsCount = Array.isArray(app.approvals)
      ? app.approvals.filter((a) => a.status === 'APPROVED').length
      : 0;

    let createdAtFormatted = '';
    try {
      if (app.created_at) {
        createdAtFormatted = new Date(app.created_at).toISOString().split('T')[0];
      }
    } catch {
      createdAtFormatted = String(app.created_at || '');
    }

    let applicantSignedAtFormatted = '';
    try {
      if (app.applicant_signed_at) {
        applicantSignedAtFormatted = new Date(app.applicant_signed_at).toISOString().split('T')[0];
      }
    } catch {
      applicantSignedAtFormatted = String(app.applicant_signed_at || '');
    }

    return [
      escapeCsvCell(app.reference_number),
      escapeCsvCell(app.department),
      escapeCsvCell(app.form_code),
      escapeCsvCell(app.form_title),
      escapeCsvCell(app.applicant_name),
      escapeCsvCell(app.applicant_employee_number),
      escapeCsvCell(app.site_name),
      escapeCsvCell(app.status),
      escapeCsvCell(app.current_approver_role || 'NONE'),
      escapeCsvCell(app.current_step_order || 0),
      escapeCsvCell(createdAtFormatted),
      escapeCsvCell(applicantSignedAtFormatted),
      escapeCsvCell(app.applicant_digital_signature || 'N/A'),
      escapeCsvCell(approvedStepsCount),
      escapeCsvCell(formatPayloadSummaryForCsv(app)),
      escapeCsvCell(JSON.stringify(app.payload || {})),
    ].join(',');
  });

  return [headers.map(escapeCsvCell).join(','), ...rows].join('\r\n');
}

/**
 * Triggers a browser file download of the generated CSV using a memory-safe Blob
 * and an object URL, prepending the UTF-8 Byte Order Mark (BOM) so Excel opens UTF-8 properly.
 */
export function exportApplicationsToCsv(
  applications: WorkflowApplication[],
  customFilename?: string
): { success: boolean; count: number; error?: string } {
  if (!applications || applications.length === 0) {
    return { success: false, count: 0, error: 'No applications available to export.' };
  }

  try {
    const csvData = generateApplicationsCsv(applications);
    // Prepend UTF-8 BOM (\uFEFF) for Microsoft Excel compatibility
    const bom = '\uFEFF';
    const blob = new Blob([bom + csvData], {
      type: 'text/csv;charset=utf-8;',
    });

    const dateStr = new Date().toISOString().slice(0, 10);
    const filename =
      customFilename || `educore_workflow_export_${dateStr}.csv`;

    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.display = 'none';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up object URL in next event loop tick
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 1000);
    }

    return { success: true, count: applications.length };
  } catch (err: any) {
    console.error('Failed to export applications to CSV:', err);
    return {
      success: false,
      count: 0,
      error: err?.message || 'Unexpected failure generating CSV download.',
    };
  }
}
